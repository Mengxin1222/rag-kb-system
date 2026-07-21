import { Avatar, Typography } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import type { Message } from '../../types';
import CitationCard from './CitationCard';

const { Text } = Typography;

interface Props {
  message: Message;
}

function formatContent(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/`([^`]+)`/g, '<code style="background:#f5f5f5;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:13px">$1</code>');
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        maxWidth: '85%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      <Avatar
        size={32}
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
        style={{
          background: isUser ? '#2f6feb' : '#e8f0fe',
          color: isUser ? '#fff' : '#2f6feb',
          flexShrink: 0,
        }}
      />
      <div>
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 14,
            lineHeight: 1.6,
            wordBreak: 'break-word',
            background: isUser ? '#2f6feb' : '#fff',
            color: isUser ? '#fff' : '#111',
            border: isUser ? 'none' : '1px solid #e5e5e5',
            borderBottomRightRadius: isUser ? 4 : undefined,
            borderBottomLeftRadius: isUser ? undefined : 4,
          }}
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
        {message.sources && message.sources.length > 0 && (
          <CitationCard sources={message.sources} />
        )}
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4, padding: '0 4px', textAlign: isUser ? 'right' : 'left' }}>
          {message.time}
        </Text>
      </div>
    </div>
  );
}
