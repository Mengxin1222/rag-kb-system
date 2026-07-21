import { Typography, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { KnowledgeBase } from '../../types';

const { Text } = Typography;

interface Props {
  knowledgeBases: KnowledgeBase[];
  currentKB: KnowledgeBase | null;
  onSelectKB: (kb: KnowledgeBase) => void;
  onNewKB: () => void;
}

export default function KBManageSider({ knowledgeBases, currentKB, onSelectKB, onNewKB }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
        <Button type="dashed" block icon={<PlusOutlined />} onClick={onNewKB}>
          新建知识库
        </Button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {knowledgeBases.length === 0 ? (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 24 }}>
            暂无知识库
          </Text>
        ) : (
          knowledgeBases.map((kb) => (
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
            >
              <span>📚</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {kb.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#6b6b6b',
                  background: '#f5f5f5',
                  padding: '1px 7px',
                  borderRadius: 10,
                }}
              >
                {kb.docCount}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
