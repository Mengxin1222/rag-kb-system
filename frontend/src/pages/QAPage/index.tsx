import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, message } from 'antd';
import type { Conversation, Message } from '../../types';
import type { ConvListItem, MessageItem } from '../../api/chat';
import { listKBs, type KBListItem } from '../../api/kb';
import { listConversations, createConversation, getMessages, deleteConversation } from '../../api/chat';
import QASider from './QASider';
import ChatArea from './ChatArea';

function formatKBItem(kb: KBListItem) {
  return {
    id: kb.id,
    name: kb.name,
    description: kb.description || '',
    docCount: 0,
    chunkCount: 0,
    created_at: kb.created_at,
    chunk_method: 'heading',
    chunk_heading_levels: '2',
    chunk_max_chars: 1000,
    chunk_overlap: 0,
    retrieval_top_k: 20,
    bm25_top_k: 20,
    rrf_k: 60,
    rerank_top_n: 5,
    conversation_max_rounds: 10,
    context_compression: true,
    system_prompt: '',
    llm_model: 'deepseek-v4-pro',
    llm_temperature: 0.7,
    embedding_model: '',
    rerank_model: '',
  };
}

function formatConvItem(c: ConvListItem): Conversation {
  return { id: c.id, title: c.title, msgs: [] };
}

function formatMessage(m: MessageItem): Message {
  return {
    role: m.role,
    content: m.content,
    time: new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    sources: m.sources?.map((s) => ({ doc: s.document, page: s.page || 0, snippet: s.chunk_text })) || undefined,
  };
}

export default function QAPage() {
  const [kbs, setKbs] = useState<ReturnType<typeof formatKBItem>[]>([]);
  const [currentKB, setCurrentKB] = useState<ReturnType<typeof formatKBItem> | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [currentConv, setCurrentConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingKBs, setLoadingKBs] = useState(true);
  const streamAbortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    listKBs()
      .then((data) => {
        const mapped = data.map(formatKBItem);
        setKbs(mapped);
        if (mapped.length > 0) {
          selectKB(mapped[0]);
        }
      })
      .catch(() => message.error('获取知识库列表失败'))
      .finally(() => setLoadingKBs(false));
  }, []);

  const fetchConvs = useCallback(async (kbId: number) => {
    try {
      const data = await listConversations(kbId);
      setConvs(data.map(formatConvItem));
    } catch {
      message.error('获取对话列表失败');
    }
  }, []);

  const selectKB = useCallback((kb: ReturnType<typeof formatKBItem>) => {
    setCurrentKB(kb);
    setCurrentConv(null);
    setMessages([]);
    fetchConvs(kb.id);
  }, [fetchConvs]);

  const selectConv = useCallback(async (conv: Conversation) => {
    setCurrentConv(conv);
    try {
      const msgs = await getMessages(conv.id);
      setMessages(msgs.map(formatMessage));
    } catch {
      message.error('获取消息失败');
    }
  }, []);

  const newConversation = useCallback(async () => {
    if (!currentKB) return;
    try {
      const conv = await createConversation(currentKB.id);
      const newConv = formatConvItem(conv);
      setConvs((prev) => [newConv, ...prev]);
      setCurrentConv(newConv);
      setMessages([]);
    } catch {
      message.error('创建对话失败');
    }
  }, [currentKB]);

  const deleteConv = useCallback(async (id: number) => {
    try {
      await deleteConversation(id);
      message.success('对话已删除');
      setConvs((prev) => prev.filter((c) => c.id !== id));
      if (currentConv?.id === id) {
        setCurrentConv(null);
        setMessages([]);
      }
    } catch {
      message.error('删除失败');
    }
  }, [currentConv]);

  const sendMessage = useCallback(
    async (query: string) => {
      if (!currentKB) return;

      let conv = currentConv;
      if (!conv) {
        try {
          const c = await createConversation(currentKB.id);
          conv = formatConvItem(c);
          setConvs((prev) => [conv!, ...prev]);
          setCurrentConv(conv);
        } catch {
          message.error('创建对话失败');
          return;
        }
      }

      const userMsg: Message = {
        role: 'user',
        content: query,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
      if (conv.title === '新对话') {
        conv = { ...conv, title: query.substring(0, 50) };
        setCurrentConv(conv);
      }

      setIsStreaming(true);

      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

      const controller = new AbortController();
      streamAbortRef.current = () => controller.abort();

      try {
        const resp = await fetch(`${baseURL}/api/chat/send?conversation_id=${conv!.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const assistantMsg: Message = {
          role: 'assistant',
          content: '',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamingContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'token') {
                  streamingContent += parsed.token;
                  setMessages((prev) => {
                    const copy = [...prev];
                    copy[copy.length - 1] = { ...copy[copy.length - 1], content: streamingContent };
                    return copy;
                  });
                } else if (parsed.type === 'done') {
                  const sources = parsed.sources?.map((s: { document: string; page: number | null; chunk_text: string }) => ({
                    doc: s.document,
                    page: s.page || 0,
                    snippet: s.chunk_text,
                  }));
                  setMessages((prev) => {
                    const copy = [...prev];
                    copy[copy.length - 1] = {
                      ...copy[copy.length - 1],
                      content: streamingContent,
                      sources,
                    };
                    return copy;
                  });
                } else if (parsed.type === 'error') {
                  message.error(parsed.message || '生成失败');
                }
              } catch {
                // ignore non-JSON SSE events
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === 'assistant') {
              copy[copy.length - 1] = { ...last, content: (last.content || '') + '\n\n[回答已中断]' };
            }
            return copy;
          });
        } else {
          message.error('连接中断，请重试');
        }
      } finally {
        setIsStreaming(false);
        streamAbortRef.current = null;
      }
    },
    [currentKB, currentConv]
  );

  const stopStreaming = useCallback(() => {
    if (streamAbortRef.current) {
      streamAbortRef.current();
      streamAbortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamAbortRef.current) streamAbortRef.current();
    };
  }, []);

  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Sider width={280} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <QASider
          knowledgeBases={kbs}
          conversations={convs}
          currentKB={currentKB}
          currentConv={currentConv}
          onSelectKB={selectKB}
          onSelectConv={selectConv}
          onNewConversation={newConversation}
          onDeleteConv={deleteConv}
        />
      </Layout.Sider>
      <Layout.Content style={{ display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
        <ChatArea
          currentKB={currentKB}
          messages={messages}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onStop={stopStreaming}
          loadingKBs={loadingKBs}
        />
      </Layout.Content>
    </Layout>
  );
}
