import { Typography } from 'antd';
import type { Source } from '../../types';

const { Text } = Typography;

interface Props {
  sources: Source[];
}

export default function CitationCard({ sources }: Props) {
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sources.map((s, i) => (
        <div
          key={i}
          style={{
            background: '#fff',
            border: '1px solid #e5e5e5',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text strong style={{ fontSize: 13 }}>
              {s.doc}
            </Text>
            <span
              style={{
                fontSize: 12,
                color: '#6b6b6b',
                background: '#f5f5f5',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              第{s.page}页
            </span>
          </div>
          <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>
            {s.snippet}
          </Text>
        </div>
      ))}
    </div>
  );
}
