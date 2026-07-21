import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Button, Table, Tag, Typography, message, Popconfirm, Space, Upload } from 'antd';
import { UploadOutlined, EyeOutlined, EditOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { listDocuments, deleteDocument, type DocListItem } from '../../api/documents';

const { Text } = Typography;

const statusConfig: Record<string, { color: string; label: string }> = {
  ready: { color: 'success', label: '已就绪' },
  processing: { color: 'processing', label: '处理中' },
  pending: { color: 'warning', label: '待处理' },
  failed: { color: 'error', label: '失败' },
};

const acceptFormats = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md';

interface Props {
  kbId: number;
  onSwitchToChunks: (docId: number) => void;
}

export default function DocManageTab({ kbId, onSwitchToChunks }: Props) {
  const [docs, setDocs] = useState<DocListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingKbRef = useRef(kbId);

  const fetchDocs = useCallback(async () => {
    try {
      const data = await listDocuments(kbId);
      setDocs(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [kbId]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const data = await listDocuments(pollingKbRef.current);
        setDocs(data);
      } catch { /* ignore */ }
    }, 3000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  useEffect(() => {
    pollingKbRef.current = kbId;
    setLoading(true);
    fetchDocs().then(() => {
      // Only poll if there are non-terminal documents
      setDocs((d) => {
        const hasActive = d.some((doc) => doc.status === 'pending' || doc.status === 'processing');
        if (hasActive) startPolling();
        return d;
      });
    });
    return () => stopPolling();
  }, [kbId, fetchDocs, startPolling, stopPolling]);

  useEffect(() => {
    if (docs.length > 0) {
      const hasActive = docs.some((d) => d.status === 'pending' || d.status === 'processing');
      if (hasActive && !pollingRef.current) startPolling();
      else if (!hasActive && pollingRef.current) stopPolling();
    }
  }, [docs, startPolling, stopPolling]);

  const handleDelete = async (docId: number) => {
    try {
      await deleteDocument(docId);
      message.success('已删除');
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      message.error('删除失败');
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('kb_id', String(kbId));
      formData.append('file', file);
      const resp = await fetch(`${baseURL}/api/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) throw new Error();
      message.success(`${file.name} 上传成功`);
      fetchDocs();
    } catch {
      message.error('上传失败');
    }
    return false;
  };

  const columns = [
    {
      title: '文档名称', dataIndex: 'filename',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '格式', dataIndex: 'original_format', width: 80,
      render: (fmt: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f5f5f5', padding: '2px 6px', borderRadius: 3 }}>
          {fmt?.toUpperCase?.() || '-'}
        </span>
      ),
    },
    {
      title: '大小', dataIndex: 'file_size', width: 90,
      render: (s: number | null) => s ? `${(s / 1024).toFixed(0)}KB` : '-',
    },
    { title: '切片数', dataIndex: 'chunk_count', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 110,
      render: (status: string, record: DocListItem) => (
        <Tag color={statusConfig[status]?.color || 'default'}>
          {statusConfig[status]?.label || status}
          {record.error_message && <span title={record.error_message} style={{ cursor: 'help', marginLeft: 4 }}>ⓘ</span>}
        </Tag>
      ),
    },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_: unknown, record: DocListItem) => (
        <Space size={4}>
          {record.status === 'ready' && (
            <>
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => message.info('预览开发中')}>预览</Button>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onSwitchToChunks(record.id)}>编辑切片</Button>
            </>
          )}
          {record.status === 'failed' && (
            <Button type="link" size="small" icon={<ReloadOutlined />}>重传</Button>
          )}
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="文档管理"
      extra={
        <Upload beforeUpload={handleUpload} showUploadList={false} accept={acceptFormats}>
          <Button type="primary" icon={<UploadOutlined />}>上传文档</Button>
        </Upload>
      }
      style={{ borderRadius: 12 }}
    >
      <Table columns={columns} dataSource={docs} rowKey="id" pagination={false} size="middle" loading={loading} />
    </Card>
  );
}
