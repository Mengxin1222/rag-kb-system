import { useState } from 'react';
import { Card, Input, Button, Select, Radio, Tag, Modal, Typography, Space, Empty, Spin } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import type { SearchResult } from '../../types';

const { Text, Title } = Typography;

const mockKBs = [
  { id: 1, name: '产品手册知识库' },
  { id: 2, name: '技术文档知识库' },
  { id: 3, name: '规章制度知识库' },
];

const mockResults: SearchResult[] = [
  { id: 1, doc: '产品API文档.md', kb_name: '产品手册知识库', kb_id: 1, page: 3, score: 0.85, content_tags: ['code', 'link'], snippet: 'API 认证方式支持 <mark>Bearer Token</mark> 和 API Key 两种方式。Bearer Token 通过登录接口获取，有效期 24 小时...' },
  { id: 2, doc: '用户手册.docx', kb_name: '产品手册知识库', kb_id: 1, page: 8, score: 0.72, content_tags: ['link'], snippet: '在知识库管理页面选择目标知识库，切换到<mark>策略配置</mark>标签页，即可调整检索参数...' },
  { id: 3, doc: '技术架构文档.md', kb_name: '技术文档知识库', kb_id: 2, page: 5, score: 0.91, content_tags: ['code'], snippet: '系统采用 React + Ant Design 构建前端，<mark>FastAPI</mark> 构建后端 RESTful API，SQLite 作为应用数据库...' },
  { id: 4, doc: '安全规范.pdf', kb_name: '产品手册知识库', kb_id: 1, page: 12, score: 0.68, content_tags: [], snippet: '所有 API 请求必须经过<mark>认证</mark>。未认证请求返回 401 Unauthorized。API Key 需定期轮换...' },
  { id: 5, doc: '开发指南.md', kb_name: '技术文档知识库', kb_id: 2, page: 15, score: 0.78, content_tags: ['code'], snippet: '文档处理采用 <mark>FastAPI</mark> BackgroundTasks 异步执行，不阻塞上传请求。状态变更通过轮询接口获取...' },
  { id: 6, doc: '数据处理手册.docx', kb_name: '技术文档知识库', kb_id: 2, page: 7, score: 0.63, content_tags: ['link', 'image'], snippet: '文档上传后进入异步处理管道：格式判断 → MinerU 转换 → <mark>智能切片</mark> → 向量化入库...' },
  { id: 7, doc: '公司考勤制度.md', kb_name: '规章制度知识库', kb_id: 3, page: 2, score: 0.55, content_tags: [], snippet: '员工每日需在规定时间内完成<mark>考勤打卡</mark>，迟到超过 30 分钟按事假处理...' },
];

const tagLabels: Record<string, string> = { code: '</> 代码', link: '🔗 链接', image: '🖼 图片' };
const methodLabels: Record<string, string> = { bm25: '关键词匹配度', vector: '语义相似度', hybrid: '综合得分' };

export default function SearchPage() {
  const [selectedKBs, setSelectedKBs] = useState<number[]>([1, 2]);
  const [method, setMethod] = useState<string>('hybrid');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ doc: string; page: number } | null>(null);

  const doSearch = () => {
    if (!query.trim()) return;
    if (selectedKBs.length === 0) return;
    setLoading(true);
    setTimeout(() => {
      const filtered = mockResults.filter((r) => selectedKBs.includes(r.kb_id));
      setResults(filtered);
      setLoading(false);
      setSearched(true);
    }, 500);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text strong style={{ whiteSpace: 'nowrap', minWidth: 56 }}>
              知识库
            </Text>
            <Select
              mode="multiple"
              value={selectedKBs}
              onChange={setSelectedKBs}
              placeholder="选择知识库（可多选）"
              options={mockKBs.map((kb) => ({ label: kb.name, value: kb.id }))}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Text strong style={{ whiteSpace: 'nowrap' }}>
              方法
            </Text>
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
        <div style={{ textAlign: 'center', padding: 48, color: '#6b6b6b' }}>
          输入关键词，选择知识库后开始搜索
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : results.length === 0 ? (
        <Empty description="未找到匹配的切片" />
      ) : (
        <>
          <Text type="secondary" style={{ fontSize: 14, marginBottom: 16, display: 'block' }}>
            共找到 <strong>{results.length}</strong> 条结果
          </Text>
          {results.map((r) => (
            <Card
              key={r.id}
              style={{ marginBottom: 12, borderRadius: 12 }}
              hoverable
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <Space size={10}>
                  <Text strong style={{ fontSize: 15 }}>
                    <FileTextOutlined /> {r.doc}
                  </Text>
                  <Tag color="blue">{r.kb_name}</Tag>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    p.{r.page}
                  </Text>
                </Space>
                <Text style={{ fontFamily: 'monospace', fontSize: 13, color: '#2f6feb', fontWeight: 500 }}>
                  {methodLabels[method]}: {r.score.toFixed(2)}
                </Text>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {r.content_tags.map((t) => (
                  <Tag key={t} style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {tagLabels[t] || t}
                  </Tag>
                ))}
              </div>
              <div
                style={{ fontSize: 14, lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: r.snippet }}
              />
              <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }} onClick={() => setPreviewDoc({ doc: r.doc, page: r.page })}>
                查看文档 &gt;
              </Button>
            </Card>
          ))}
        </>
      )}

      <Modal
        title={previewDoc ? `${previewDoc.doc} · 第${previewDoc.page}页` : '文档预览'}
        open={!!previewDoc}
        onCancel={() => setPreviewDoc(null)}
        width={800}
        footer={null}
      >
        {previewDoc && (
          <div style={{ lineHeight: 1.8 }}>
            <Text type="secondary">页码：<strong>{previewDoc.page}</strong></Text>
            <Title level={4} style={{ marginTop: 12 }}>
              {previewDoc.page === 3 ? 'API 认证' : previewDoc.page === 5 ? '系统架构' : '文档内容'}
            </Title>
            <p>这是 {previewDoc.doc} 第 {previewDoc.page} 页的预览内容。</p>
            <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto' }}>
              <code>{`# 示例代码块\n\ndef authenticate(token):\n    headers = {"Authorization": f"Bearer {token}"}\n    return requests.get(api_url, headers=headers)`}</code>
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}
