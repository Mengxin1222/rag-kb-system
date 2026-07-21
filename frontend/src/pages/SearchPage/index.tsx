import { useState, useEffect, useMemo } from 'react';
import { Card, Input, Button, Select, Radio, Tag, Modal, Typography, Space, Empty, Spin, Pagination } from 'antd';
import { SearchOutlined, FileTextOutlined, CodeOutlined, LinkOutlined, PictureOutlined } from '@ant-design/icons';
import { listKBs, searchChunks, type SearchResult } from '../../api/kb';

const { Text } = Typography;

const PAGE_SIZE = 10;
const methodLabels: Record<string, string> = { bm25: '关键词匹配度', vector: '语义相似度', hybrid: '综合得分' };

const tagIcons: Record<string, React.ReactNode> = {
  code: <Tag icon={<CodeOutlined />} color="default">代码</Tag>,
  link: <Tag icon={<LinkOutlined />} color="blue">链接</Tag>,
  image: <Tag icon={<PictureOutlined />} color="green">图片</Tag>,
};

function highlightKeywords(text: string, query: string) {
  if (!query.trim()) return text;
  const words = query.trim().split(/\s+/);
  let result = text;
  for (const w of words) {
    result = result.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark style="background:#fff3b0;padding:1px 3px;border-radius:2px">$1</mark>');
  }
  return result;
}

function truncateText(text: string, maxLen: number) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

export default function SearchPage() {
  const [allKBs, setAllKBs] = useState<{ id: number; name: string }[]>([]);
  const [selectedKBs, setSelectedKBs] = useState<number[]>([]);
  const [method, setMethod] = useState<string>('hybrid');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [previewDoc, setPreviewDoc] = useState<{ docId: number; content: string } | null>(null);

  useEffect(() => {
    listKBs().then((data) => {
      setAllKBs(data);
      if (data.length > 0) setSelectedKBs(data.map((k) => k.id));
    }).catch(() => {});
  }, []);

  const doSearch = async (newPage = 1) => {
    if (!query.trim()) return;
    if (selectedKBs.length === 0) return;
    setLoading(true);
    try {
      const data = await searchChunks({ kb_ids: selectedKBs.join(','), q: query.trim(), method, top_n: 100 });
      setResults(data.results);
      setPage(newPage);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const paginatedResults = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, page]);

  const openPreview = async (doc: SearchResult) => {
    setPreviewDoc({ docId: doc.document_id || 0, content: doc.content });
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
              onPressEnter={() => doSearch(1)}
            />
            <Button type="primary" size="large" icon={<SearchOutlined />} onClick={() => doSearch(1)} loading={loading}>
              搜索
            </Button>
          </div>
        </Space>
      </Card>

      {!searched ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6b6b6b', fontSize: 15 }}>输入关键词，选择知识库后开始搜索</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : results.length === 0 ? (
        <Empty description="未找到匹配的切片" />
      ) : (
        <>
          <Text type="secondary" style={{ fontSize: 14, marginBottom: 16, display: 'block' }}>
            共找到 <strong>{results.length}</strong> 条结果
          </Text>
          {paginatedResults.map((r, i) => (
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
              {r.content_tags && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {JSON.parse(r.content_tags || '[]').map((t: string) => tagIcons[t] || <Tag key={t}>{t}</Tag>)}
                </div>
              )}
              <div
                style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: truncateText(highlightKeywords(r.content, query), 300) }}
              />
              <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }} onClick={() => openPreview(r)}>
                查看文档 &gt;
              </Button>
            </Card>
          ))}
          {results.length > PAGE_SIZE && (
            <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 24 }}>
              <Pagination
                current={page}
                total={results.length}
                pageSize={PAGE_SIZE}
                onChange={(p) => { setPage(p); }}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}

      <Modal
        title="文档预览"
        open={!!previewDoc}
        onCancel={() => setPreviewDoc(null)}
        width={800}
        footer={null}
      >
        <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{previewDoc?.content}</div>
      </Modal>
    </div>
  );
}
