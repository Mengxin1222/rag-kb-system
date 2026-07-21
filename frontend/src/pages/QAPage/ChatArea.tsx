import { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Typography, Empty, Space } from 'antd';
import { SendOutlined, StopOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { KnowledgeBase, Message } from '../../types';
import MessageBubble from './MessageBubble';

const { Text } = Typography;

interface Props {
  currentKB: KnowledgeBase | null;
  messages: Message[];
  isStreaming: boolean;
  onSend: (query: string) => void;
  onStop: () => void;
}

export default function ChatArea({ currentKB, messages, isStreaming, onSend, onStop }: Props) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesWrapRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
  }, []);

  useEffect(() => {
    if (!showScrollBtn) {
      scrollToBottom();
    }
  }, [messages, showScrollBtn, scrollToBottom]);

  useEffect(() => {
    const container = messagesWrapRef.current;
    if (!container) return;
    const handleScroll = () => {
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
      setShowScrollBtn(!atBottom);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSend = () => {
    const q = inputValue.trim();
    if (!q || isStreaming) return;
    setInputValue('');
    onSend(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentKB) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="请选择一个知识库开始提问" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
      <div
        style={{
          padding: '12px 24px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Text strong style={{ fontSize: 15 }}>
          {currentKB.name}
        </Text>
        <Space size={16}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            📄 文档 <strong>{currentKB.docCount}</strong>
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            🔬 切片 <strong>{currentKB.chunkCount}</strong>
          </Text>
        </Space>
      </div>

      <div ref={messagesWrapRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            minHeight: '100%',
          }}
        >
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="输入问题开始对话" />
            </div>
          ) : (
            messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        {showScrollBtn && (
          <Button
            shape="circle"
            icon={<ArrowDownOutlined />}
            size="small"
            onClick={scrollToBottom}
            style={{
              position: 'absolute',
              bottom: 12,
              right: 24,
              zIndex: 5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          />
        )}
      </div>

      <div
        style={{
          padding: '16px 24px',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <Input.TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题... (Enter 发送, Shift+Enter 换行)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={isStreaming}
            style={{ flex: 1, fontSize: 14 }}
          />
          {isStreaming ? (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={onStop}
              style={{ width: 44, height: 44 }}
            />
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!inputValue.trim()}
              style={{ width: 44, height: 44 }}
            />
          )}
        </div>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 6 }}>
          按 Enter 发送提问，Shift+Enter 换行。回答基于知识库内容生成。
        </Text>
      </div>
    </div>
  );
}
