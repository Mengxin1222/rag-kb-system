import { Typography, Button, Spin } from 'antd';
import { PlusOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Props {
  knowledgeBases: Array<{ id: number; name: string; docCount: number }>;
  currentKB: { id: number; name: string; docCount: number } | null;
  onSelectKB: (kb: { id: number; name: string; docCount: number }) => void | Promise<void>;
  onNewKB: () => void;
  loading?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function KBManageSider({ knowledgeBases, currentKB, onSelectKB, onNewKB, loading, collapsed, onToggleCollapse }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!collapsed && (
        <>
          <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
            <Button type="dashed" block icon={<PlusOutlined />} onClick={onNewKB}>
              新建知识库
            </Button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : knowledgeBases.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 24 }}>暂无知识库</Text>
            ) : (
              knowledgeBases.map((kb) => (
                <div
                  key={kb.id}
                  onClick={() => onSelectKB(kb)}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderLeft: currentKB?.id === kb.id ? '3px solid #2f6feb' : '3px solid transparent',
                    background: currentKB?.id === kb.id ? '#e8f0fe' : undefined,
                    fontWeight: currentKB?.id === kb.id ? 500 : 400,
                  }}
                >
                  <span>📚</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kb.name}</span>
                  <span style={{ fontSize: 11, color: '#6b6b6b', background: '#f5f5f5', padding: '1px 7px', borderRadius: 10 }}>{kb.docCount}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
      <div
        onClick={onToggleCollapse}
        style={{
          height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', borderTop: '1px solid #f0f0f0',
          color: '#6b6b6b', fontSize: 16, flexShrink: 0,
          transition: 'color 150ms',
        }}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </div>
    </div>
  );
}
