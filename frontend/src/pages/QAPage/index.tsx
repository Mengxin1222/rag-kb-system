import { useState, useEffect, useCallback, useRef } from 'react';
import { Select, Button, Typography, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import type { Conversation, Message } from '../../types';
import type { ConvListItem, MessageItem } from '../../api/chat';
import { listKBs, type KBListItem } from '../../api/kb';
import { listConversations, createConversation, getMessages, deleteConversation } from '../../api/chat';
import { useKBSelect } from '../../contexts/KBSelectContext';
import ChatArea from './ChatArea';

const { Text } = Typography;

function formatKBItem(kb: KBListItem) {
  return { id: kb.id, name: kb.name, docCount: 0, chunkCount: 0 };
}

function formatConvItem(c: ConvListItem): Conversation {
  return { id: c.id, title: c.title, msgs: [] };
}

function formatMessage(m: MessageItem): Message {
  return {
    role: m.role, content: m.content,
    time: new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    sources: m.sources?.map((s) => ({ doc: s.document, page: s.page || 0, snippet: s.chunk_text })) || undefined,
  };
}

export default function QAPage() {
  const [searchParams] = useSearchParams();
  const { selectedKBId, setSelectedKBId } = useKBSelect();
  const [kbs, setKbs] = useState<ReturnType<typeof formatKBItem>[]>([]);
  const [currentKB, setCurrentKB] = useState<ReturnType<typeof formatKBItem> | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [currentConv, setCurrentConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingKBs, setLoadingKBs] = useState(true);
  const streamAbortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    listKBs().then((data) => {
      const mapped = data.map(formatKBItem);
      setKbs(mapped);
      const kbId = searchParams.get('kb_id') || selectedKBId;
      if (kbId && mapped.find((k) => k.id === Number(kbId))) {
        selectKB(mapped.find((k) => k.id === Number(kbId))!);
      } else if (mapped.length > 0) {
        selectKB(mapped[0]);
      }
    }).catch(() => message.error('获取知识库列表失败')).finally(() => setLoadingKBs(false));
  }, []);

  const fetchConvs = useCallback(async (kbId: number) => {
    try { setConvs((await listConversations(kbId)).map(formatConvItem)); } catch { /* */ }
  }, []);

  const selectKB = useCallback((kb: ReturnType<typeof formatKBItem>) => {
    if (streamAbortRef.current) { streamAbortRef.current(); setIsStreaming(false); }
    setCurrentKB(kb); setSelectedKBId(kb.id); setCurrentConv(null); setMessages([]);
    fetchConvs(kb.id);
  }, [fetchConvs, setSelectedKBId]);

  const selectConv = useCallback(async (convId: number) => {
    if (streamAbortRef.current) { streamAbortRef.current(); setIsStreaming(false); }
    const conv = convs.find((c) => c.id === convId);
    if (!conv) return;
    setCurrentConv(conv);
    try { setMessages((await getMessages(convId)).map(formatMessage)); } catch { message.error('获取消息失败'); }
  }, [convs]);

  const newConversation = useCallback(async () => {
    if (!currentKB) return;
    try {
      const conv = await createConversation(currentKB.id);
      const nc = formatConvItem(conv);
      setConvs((prev) => [nc, ...prev]);
      setCurrentConv(nc); setMessages([]);
    } catch { message.error('创建对话失败'); }
  }, [currentKB]);

  const deleteConv = useCallback(async (id: number) => {
    try {
      await deleteConversation(id);
      message.success('对话已删除');
      setConvs((prev) => prev.filter((c) => c.id !== id));
      if (currentConv?.id === id) { setCurrentConv(null); setMessages([]); }
    } catch { message.error('删除失败'); }
  }, [currentConv]);

  const sendMessage = useCallback(async (query: string) => {
    if (!currentKB) return;
    let conv = currentConv;
    if (!conv) {
      try {
        const c = await createConversation(currentKB.id);
        conv = formatConvItem(c);
        setConvs((prev) => [conv!, ...prev]); setCurrentConv(conv);
      } catch { message.error('创建对话失败'); return; }
    }
    const userMsg: Message = {
      role: 'user', content: query,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (conv.title === '新对话') { conv = { ...conv, title: query.substring(0, 50) }; setCurrentConv(conv); }

    setIsStreaming(true);
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
    const controller = new AbortController();
    streamAbortRef.current = () => controller.abort();

    try {
      const resp = await fetch(`${baseURL}/api/chat/send?conversation_id=${conv!.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query }), signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const assistantMsg: Message = {
        role: 'assistant', content: '',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '', streamingContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'token') {
                streamingContent += parsed.token;
                setMessages((prev) => { const c = [...prev]; c[c.length - 1] = { ...c[c.length - 1], content: streamingContent }; return c; });
              } else if (parsed.type === 'done') {
                setMessages((prev) => {
                  const c = [...prev];
                  c[c.length - 1] = { ...c[c.length - 1], content: streamingContent, sources: parsed.sources?.map((s: { document: string; page: number | null; chunk_text: string }) => ({ doc: s.document, page: s.page || 0, snippet: s.chunk_text })) };
                  return c;
                });
              }
            } catch { /* */ }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages((prev) => { const c = [...prev]; const l = c[c.length - 1]; if (l?.role === 'assistant') c[c.length - 1] = { ...l, content: (l.content || '') + '\n\n[回答已中断]' }; return c; });
      } else { message.error('连接中断，请重试'); }
    } finally { setIsStreaming(false); streamAbortRef.current = null; }
  }, [currentKB, currentConv]);

  const stopStreaming = useCallback(() => {
    if (streamAbortRef.current) { streamAbortRef.current(); streamAbortRef.current = null; }
    setIsStreaming(false);
  }, []);

  useEffect(() => () => { if (streamAbortRef.current) streamAbortRef.current(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '8px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <Select
          value={currentKB?.id}
          onChange={(id) => { const kb = kbs.find((k) => k.id === id); if (kb) selectKB(kb); }}
          options={kbs.map((kb) => ({ label: kb.name, value: kb.id }))}
          style={{ minWidth: 180 }}
          placeholder="选择知识库"
        />
        <Select
          value={currentConv?.id}
          onChange={(id) => selectConv(id)}
          options={convs.map((c) => ({ label: c.title, value: c.id }))}
          style={{ flex: 1, maxWidth: 360 }}
          placeholder="选择对话"
          notFoundContent={<Text type="secondary" style={{ padding: 8, display: 'block' }}>暂无对话</Text>}
        />
        <Button size="small" icon={<PlusOutlined />} onClick={newConversation}>新建</Button>
        {currentConv && (
          <Popconfirm title="确定删除此对话？" onConfirm={() => deleteConv(currentConv.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ChatArea
          currentKB={currentKB}
          messages={messages}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onStop={stopStreaming}
          loadingKBs={loadingKBs}
        />
      </div>
    </div>
  );
}
