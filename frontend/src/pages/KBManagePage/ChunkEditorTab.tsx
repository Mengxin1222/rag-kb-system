import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Select, Space, Modal, Popconfirm, message, Empty, Spin } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { listDocuments, getDocChunks, confirmChunks, finalizeDoc, type DocListItem } from '../../api/documents';

const { Text } = Typography;

interface Props {
  kbId: number;
}

export default function ChunkEditorTab({ kbId }: Props) {
  const [docs, setDocs] = useState<DocListItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [chunkData, setChunkData] = useState<{
    document_id: number;
    md_text: string;
    chunks: Array<{ id: number; content: string; char_start: number; char_end: number; page_start: number | null; page_end: number | null; content_tags: string | null }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewChunk, setPreviewChunk] = useState<{ content: string; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const readyDocs = docs.filter((d) => d.status === 'ready');

  const fetchDocs = useCallback(async () => {
    try {
      setDocs(await listDocuments(kbId));
    } catch { /* ignore */ }
  }, [kbId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const loadChunks = useCallback(async (docId: number) => {
    setSelectedDocId(docId);
    setLoading(true);
    try {
      const data = await getDocChunks(docId);
      setChunkData(data);
    } catch {
      message.error('获取切片失败');
      setChunkData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (readyDocs.length > 0 && !selectedDocId) {
      loadChunks(readyDocs[0].id);
    }
  }, [readyDocs, selectedDocId, loadChunks]);

  const handleDocChange = (docId: number) => {
    if (docId !== selectedDocId) loadChunks(docId);
  };

  const handleConfirm = async () => {
    if (!selectedDocId) return;
    setSaving(true);
    try {
      await confirmChunks(selectedDocId);
      message.success('切片已确认');
    } catch {
      message.error('确认失败');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedDocId) return;
    setFinalizing(true);
    try {
      await finalizeDoc(selectedDocId);
      message.success('已提交入库，后台正在处理...');
    } catch {
      message.error('提交失败');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space size={12}>
          <Text strong style={{ fontSize: 14 }}>文档:</Text>
          <Select
            value={selectedDocId || undefined}
            onChange={handleDocChange}
            style={{ width: 220 }}
            placeholder="选择文档"
            options={readyDocs.map((d) => ({ label: d.filename, value: d.id }))}
          />
          <Text type="secondary" style={{ fontSize: 13 }}>
            切片数: {chunkData?.chunks?.length || 0}
          </Text>
        </Space>
        <Space>
          <Button type="primary" onClick={handleConfirm} loading={saving} disabled={!selectedDocId}>
            确认全部切片
          </Button>
          <Popconfirm title="确认入库后将触发 Embedding + ChromaDB + BM25 索引" onConfirm={handleFinalize}>
            <Button type="primary" style={{ background: '#17a34a', borderColor: '#17a34a' }} loading={finalizing} disabled={!selectedDocId}>
              确认并入库
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : !chunkData ? (
        <Empty description="暂无切片数据" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          <Card style={{ borderRadius: 12, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}>
            <div style={{ lineHeight: 1.8, fontSize: 14, whiteSpace: 'pre-wrap' }}>
              {chunkData.chunks.map((chunk, i) => (
                <div key={chunk.id} style={{ marginBottom: i < chunkData.chunks.length - 1 ? 16 : 0 }}>
                  <div style={{ padding: 8, borderRadius: 4, background: '#fafafa', border: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace', display: 'block', marginBottom: 4 }}>
                      #{i + 1} — p.{chunk.page_start || '-'}{chunk.page_end && chunk.page_end !== chunk.page_start ? `-${chunk.page_end}` : ''} — {chunk.char_start}-{chunk.char_end}
                    </Text>
                    {chunk.content}
                  </div>
                  {i < chunkData.chunks.length - 1 && (
                    <div style={{ height: 2, background: '#2f6feb', margin: '8px 0', position: 'relative' }}>
                      <Text style={{ position: 'absolute', right: -48, top: -8, fontSize: 11, fontFamily: 'monospace', color: '#2f6feb', fontWeight: 600 }}>
                        切分线 #{i + 1}
                      </Text>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title="切片列表" style={{ borderRadius: 12, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }} styles={{ body: { padding: 0 } }}>
            {chunkData.chunks.length === 0 ? (
              <Empty description="暂无切片" />
            ) : (
              chunkData.chunks.map((chunk, i) => (
                <div
                  key={chunk.id}
                  style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background 150ms' }}
                >
                  <Text strong style={{ fontSize: 12, color: '#2f6feb', fontFamily: 'monospace' }}>
                    #{i + 1} — p.{chunk.page_start || '-'}{chunk.page_end && chunk.page_end !== chunk.page_start ? `-${chunk.page_end}` : ''}
                  </Text>
                  <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: '#111' }}>
                    {chunk.content.slice(0, 100)}{chunk.content.length > 100 ? '...' : ''}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: '#6b6b6b', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span>{chunk.char_end - chunk.char_start} 字符</span>
                    {chunk.content_tags && JSON.parse(chunk.content_tags).map((t: string) => (
                      <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#f0f0f0', color: '#6b6b6b', fontFamily: 'monospace' }}>
                        {t}
                      </span>
                    ))}
                    <Button type="link" size="small" icon={<EyeOutlined />} style={{ marginLeft: 'auto', fontSize: 11, padding: 0 }}
                      onClick={() => setPreviewChunk({ content: chunk.content, index: i + 1 })}>
                      预览
                    </Button>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      <Modal title={`切片 #${previewChunk?.index} 预览`} open={!!previewChunk} onCancel={() => setPreviewChunk(null)} footer={null} width={600}>
        <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{previewChunk?.content}</div>
      </Modal>
    </div>
  );
}
