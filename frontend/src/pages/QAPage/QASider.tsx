import { useState, useMemo } from 'react';
import { Input, Typography, Button } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { KnowledgeBase, Conversation } from '../../types';

const { Text } = Typography;

interface Props {
  knowledgeBases: KnowledgeBase[];
  conversations: Conversation[];
  currentKB: KnowledgeBase | null;
  currentConv: Conversation | null;
  onSelectKB: (kb: KnowledgeBase) => void;
  onSelectConv: (conv: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConv: (id: number) => void;
}

export default function QASider({
  knowledgeBases,
  conversations,
  currentKB,
  currentConv,
  onSelectKB,
  onSelectConv,
  onNewConversation,
  onDeleteConv,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredKBs = useMemo(() => {
    if (!searchQuery.trim()) return knowledgeBases;
    return knowledgeBases.filter((kb) => kb.name.includes(searchQuery));
  }, [knowledgeBases, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="搜索知识库..."
          prefix={<SearchOutlined />}
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div style={{ padding: '8px 0' }}>
        <Text
          type="secondary"
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '8px 16px 4px',
            display: 'block',
          }}
        >
          知识库
        </Text>
        {filteredKBs.map((kb) => (
          <div
            key={kb.id}
            onClick={() => onSelectKB(kb)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderLeft: currentKB?.id === kb.id ? '3px solid #2f6feb' : '3px solid transparent',
              background: currentKB?.id === kb.id ? '#e8f0fe' : undefined,
              fontWeight: currentKB?.id === kb.id ? 500 : 400,
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => {
              if (currentKB?.id !== kb.id) (e.target as HTMLElement).style.background = '#f5f8ff';
            }}
            onMouseLeave={(e) => {
              if (currentKB?.id !== kb.id) (e.target as HTMLElement).style.background = '';
            }}
          >
            <span>📚</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {kb.name}
            </span>
            <span
              style={{
                fontSize: 11,
                background: '#f0f0f0',
                color: '#6b6b6b',
                padding: '1px 7px',
                borderRadius: 10,
                fontWeight: 500,
              }}
            >
              {kb.docCount}文档
            </span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}>
          <Text style={{ fontSize: 11, fontWeight: 600, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            对话历史
          </Text>
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={onNewConversation}>
            新建对话
          </Button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {conversations.length === 0 ? (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 16, fontSize: 13 }}>
              暂无对话
            </Text>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConv(conv)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: currentConv?.id === conv.id ? '#111' : '#6b6b6b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderLeft: currentConv?.id === conv.id ? '3px solid #2f6feb' : '3px solid transparent',
                  background: currentConv?.id === conv.id ? '#e8f0fe' : undefined,
                  fontWeight: currentConv?.id === conv.id ? 500 : 400,
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => {
                  if (currentConv?.id !== conv.id) (e.target as HTMLElement).style.color = '#111';
                }}
                onMouseLeave={(e) => {
                  if (currentConv?.id !== conv.id) (e.target as HTMLElement).style.color = '#6b6b6b';
                }}
              >
                <span>💬</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.title}
                </span>
                <Button
                  type="text"
                  size="small"
                  danger
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConv(conv.id);
                  }}
                  style={{ visibility: 'hidden', padding: 0, minWidth: 20 }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.visibility = 'visible';
                  }}
                  className="conv-delete-btn"
                >
                  🗑
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
