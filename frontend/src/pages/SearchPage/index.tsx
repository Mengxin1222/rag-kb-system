import { useState, useEffect } from 'react';
import { Card, Input, Button, Select, Radio, Tag, Modal, Typography, Space, Empty, Spin } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { listKBs, searchChunks, type KBListItem, type SearchResult } from '../../api/kb';

const { Text } = Typography;

const methodLabels: Record<string, string> = { bm25: '关键词匹配度', vector: '语义相似度', hybrid: '综合得分' };

export default function SearchPage() {
  const [allKBs, setAllKBs] = useState<KBListItem[]>([]);
  const [selectedKBs, setSelectedKBs] = useState<number[]>([]);
  const [method, setMethod] = useState<string>('hybrid');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ docId: number; page?: number } | null>(null);
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => {
    listKBs().then((data) => {
      setAllKBs(data);
      if (data.length > 0) setSelectedKBs(data.map((k) => k.id));
    }).catch(() => {});
  }, []);

  const doSearch = async () => {
    if (!query.trim()) return;
    if (selectedKBs.length === 0) return;
    setLoading(true);
    try {
      const data = await searchChunks({
        kb_ids: selectedKBs.join(','),
        q: query.trim(),
        method,
        top_n: 20,
      });
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const openPreview = async (doc: SearchResult) => {
    setPreviewDoc({ docId: doc.document_id || 0, page: doc.page_start || undefined });
    // For now just show the content snippet
    setPreviewContent(doc.content);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text strong style={{ whiteSpace: 'nowrap', minWidth: 56 }}>知识库</Text>
            <Select
              mode="multiple"
              value={selectedKBs}
              onChange={setSelectedKBs}
              placeholder="选择知识库（可多选）"
              options={allKBs.map((kb) => ({ label: kb.name, value: kb.id }))}
              style={{ flex: 1, minWidth: 200 }}
              maxTagCount={3}
            />
            <Text strong style={{ whiteSpace: 'nowrap' }}>方法</Text>
            <Radio.Group value={method} onChange={(e) => setMethod(e.target.value)} optionType="button" buttonStyle="solid">
              <Radio.Button value="bm25">BM25</Radio.Button>
              <Radio.Button value="hybrid">混合</Radio.Button>
              <Radio.Button value="vector">语义</Radio.Button>
            </Radio.Group>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              size="large"
              placeholder="输入关键词搜索知识库切片..."
              prefix={<SearchOutlined />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={doSearch}
            />
            <Button type="primary" size="large" icon={<SearchOutlined />} onClick={doSearch} loading={loading}>
              搜索
            </Button>
          </div>
        </Space>
      </Card>

      {!searched ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6b6b6b', fontSize: 15 }}>
          输入关键词，选择知识库后开始搜索
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : results.length === 0 ? (
        <Empty description="未找到匹配的切片" />
      ) : (
        <>
          <Text type="secondary" style={{ fontSize: 14, marginBottom: 16, display: 'block' }}>
            共找到 <strong>{results.length}</strong> 条结果
          </Text>
          {results.map((r, i) => (
            <Card key={i} style={{ marginBottom: 12, borderRadius: 12 }} hoverable>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <Space size={10}>
                  <Text strong style={{ fontSize: 15 }}>
                    <FileTextOutlined /> {r.document || '文档'}
                  </Text>
                  <Tag color="blue">{r.kb_name}</Tag>
                  {r.page_start != null && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      p.{r.page_start}{r.page_end != null && r.page_end !== r.page_start ? `-${r.page_end}` : ''}
                    </Text>
                  )}
                </Space>
                <Text style={{ fontFamily: 'monospace', fontSize: 13, color: '#2f6feb', fontWeight: 500 }}>
                  {methodLabels[method] || '得分'}: {r.score.toFixed(2)}
                </Text>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {r.content}
              </div>
              <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }} onClick={() => openPreview(r)}>
                查看文档 &gt;
              </Button>
            </Card>
          ))}
        </>
      )}

      <Modal
        title={previewDoc ? `文档预览` : '文档预览'}
        open={!!previewDoc}
        onCancel={() => setPreviewDoc(null)}
        width={800}
        footer={null}
      >
        <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{previewContent}</div>
      </Modal>
    </div>
  );
}
