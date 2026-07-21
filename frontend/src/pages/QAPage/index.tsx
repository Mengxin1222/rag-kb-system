import { useState, useEffect, useCallback, useRef } from 'react';
import { Select, Button, Typography, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
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
    role: m.role,
    content: m.content,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    listKBs()
      .then((data) => {
        const mapped = data.map(formatKBItem);
        setKbs(mapped);
        const kbId = searchParams.get('kb_id') || selectedKBId;
        if (kbId && mapped.find((k) => k.id === Number(kbId))) {
          selectKB(mapped.find((k) => k.id === Number(kbId))!);
        } else if (mapped.length > 0) {
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
    } catch { /* ignore */ }
  }, []);

  const selectKB = useCallback((kb: ReturnType<typeof formatKBItem>) => {
    if (streamAbortRef.current) { streamAbortRef.current(); setIsStreaming(false); }
    setCurrentKB(kb);
    setSelectedKBId(kb.id);
    setCurrentConv(null);
    setMessages([]);
    fetchConvs(kb.id);
  }, [fetchConvs, setSelectedKBId]);

  const selectConv = useCallback(async (conv: Conversation) => {
    if (streamAbortRef.current) { streamAbortRef.current(); setIsStreaming(false); }
    setCurrentConv(conv);
    try {
      const msgs = await getMessages(conv.id);
      setMessages(msgs.map(formatMessage));
    } catch { message.error('获取消息失败'); }
  }, []);

  const newConversation = useCallback(async () => {
    if (!currentKB) return;
    try {
      const conv = await createConversation(currentKB.id);
      const nc = formatConvItem(conv);
      setConvs((prev) => [nc, ...prev]);
      setCurrentConv(nc);
      setMessages([]);
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
        setConvs((prev) => [conv!, ...prev]);
        setCurrentConv(conv);
      } catch { message.error('创建对话失败'); return; }
    }

    const userMsg: Message = {
      role: 'user', content: query,
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const assistantMsg: Message = {
        role: 'assistant', content: '',
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
                  doc: s.document, page: s.page || 0, snippet: s.chunk_text,
                }));
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { ...copy[copy.length - 1], content: streamingContent, sources };
                  return copy;
                });
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, content: (last.content || '') + '\n\n[回答已中断]' };
          return copy;
        });
      } else {
        message.error('连接中断，请重试');
      }
    } finally {
      setIsStreaming(false);
      streamAbortRef.current = null;
    }
  }, [currentKB, currentConv]);

  const stopStreaming = useCallback(() => {
    if (streamAbortRef.current) { streamAbortRef.current(); streamAbortRef.current = null; }
    setIsStreaming(false);
  }, []);

  useEffect(() => () => { if (streamAbortRef.current) streamAbortRef.current(); }, []);

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {!sidebarCollapsed && (
        <div style={{
          width: 260, flexShrink: 0, background: '#fff', borderRight: '1px solid #f0f0f0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
            <Select
              value={currentKB?.id}
              onChange={(id) => { const kb = kbs.find((k) => k.id === id); if (kb) selectKB(kb); }}
              options={kbs.map((kb) => ({ label: `${kb.name}`, value: kb.id }))}
              style={{ width: '100%' }}
              placeholder="选择知识库"
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
              <Text style={{ fontSize: 11, fontWeight: 600, color: '#6b6b6b', textTransform: 'uppercase' }}>对话历史</Text>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={newConversation}>新建</Button>
            </div>
            {convs.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 16, fontSize: 13 }}>暂无对话</Text>
            ) : (
              convs.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConv(conv)}
                  style={{
                    padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                    borderLeft: currentConv?.id === conv.id ? '3px solid #2f6feb' : '3px solid transparent',
                    background: currentConv?.id === conv.id ? '#e8f0fe' : undefined,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>💬 {conv.title}</span>
                  {(currentConv?.id === conv.id || convs.indexOf(conv) < 3) && (
                    <Popconfirm title="确定删除？" onConfirm={() => deleteConv(conv.id)}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ flexShrink: 0 }} />
                    </Popconfirm>
                  )}
                </div>
              ))
            )}
          </div>
          <div
            onClick={() => setSidebarCollapsed(true)}
            style={{
              height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', borderTop: '1px solid #f0f0f0',
              color: '#6b6b6b', fontSize: 14, flexShrink: 0,
            }}
          >
            ◀ 收起
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {sidebarCollapsed && (
          <div style={{
            padding: '4px 12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Button type="text" size="small" onClick={() => setSidebarCollapsed(false)} style={{ fontSize: 14 }}>▶ 展开</Button>
            <Select
              size="small"
              value={currentKB?.id}
              onChange={(id) => { const kb = kbs.find((k) => k.id === id); if (kb) selectKB(kb); }}
              options={kbs.map((kb) => ({ label: kb.name, value: kb.id }))}
              style={{ minWidth: 160 }}
            />
            <Select
              size="small"
              value={currentConv?.id}
              onChange={(id) => { const c = convs.find((x) => x.id === id); if (c) selectConv(c); }}
              options={convs.map((c) => ({ label: c.title, value: c.id }))}
              style={{ flex: 1, maxWidth: 300 }}
              placeholder="选择对话"
            />
          </div>
        )}
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
