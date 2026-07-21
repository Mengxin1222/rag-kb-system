import { Card, Button, Table, Tag, Typography, message, Popconfirm, Space } from 'antd';
import { UploadOutlined, EyeOutlined, EditOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Document } from '../../types';

const { Text } = Typography;

const statusConfig: Record<string, { color: string; label: string }> = {
  ready: { color: 'success', label: '已就绪' },
  processing: { color: 'processing', label: '处理中' },
  pending: { color: 'warning', label: '待处理' },
  failed: { color: 'error', label: '失败' },
};

const mockDocuments: Document[] = [
  { id: 1, filename: '产品API文档.md', format: 'md', status: 'ready', size: '256KB', chunks: 12, error: null },
  { id: 2, filename: '用户手册.docx', format: 'docx', status: 'ready', size: '1.2MB', chunks: 20, error: null },
  { id: 3, filename: '安全规范.pdf', format: 'pdf', status: 'processing', size: '890KB', chunks: 0, error: null },
  { id: 4, filename: '架构设计.pptx', format: 'pptx', status: 'pending', size: '3.1MB', chunks: 0, error: null },
  { id: 5, filename: '旧版FAQ.pdf', format: 'pdf', status: 'failed', size: '450KB', chunks: 0, error: 'MinerU 转换失败：文件编码异常' },
];

interface Props {
  onSwitchToChunks: (docId: number) => void;
}

export default function DocManageTab({ onSwitchToChunks }: Props) {
  const columns = [
    {
      title: '文档名称',
      dataIndex: 'filename',
      key: 'filename',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (fmt: string) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            background: '#f5f5f5',
            padding: '2px 6px',
            borderRadius: 3,
          }}
        >
          {fmt.toUpperCase()}
        </span>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 90,
    },
    {
      title: '切片数',
      dataIndex: 'chunks',
      key: 'chunks',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string, record: Document) => (
        <Tag color={statusConfig[status]?.color}>
          {statusConfig[status]?.label || status}
          {record.error && (
            <span title={record.error} style={{ cursor: 'help', marginLeft: 4 }}>
              ⓘ
            </span>
          )}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: Document) => (
        <Space size={4}>
          {record.status === 'ready' && (
            <>
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => message.info('预览: ' + record.filename)}>
                预览
              </Button>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onSwitchToChunks(record.id)}>
                编辑切片
              </Button>
            </>
          )}
          {record.status === 'failed' && (
            <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => message.info('重传: ' + record.filename)}>
              重传
            </Button>
          )}
          <Popconfirm title="确定删除？" onConfirm={() => message.success('已删除')}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="文档管理"
      extra={
        <Button type="primary" icon={<UploadOutlined />} onClick={() => message.info('文件上传对话框（模拟）')}>
          上传文档
        </Button>
      }
      style={{ borderRadius: 12 }}
    >
      <Table
        columns={columns}
        dataSource={mockDocuments}
        rowKey="id"
        pagination={false}
        size="middle"
      />
    </Card>
  );
}
