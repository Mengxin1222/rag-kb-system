import { useState } from 'react';
import { Card, Button, Typography, Select, Space, Modal, Popconfirm, message, Empty } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { Chunk } from '../../types';

const { Text } = Typography;

const mockChunks: Chunk[] = [
  { id: 1, number: 1, summary: '概述部分 - 产品API文档的概述，介绍产品API的基本使用...', pageStart: 1, pageEnd: 1, tags: ['link'] },
  { id: 2, number: 2, summary: 'API认证说明 - Bearer Token 认证方式、API Key 认证方式...', pageStart: 2, pageEnd: 3, tags: ['code'] },
  { id: 3, number: 3, summary: '接口列表 - 所有REST API接口的详细列表和请求参数...', pageStart: 4, pageEnd: 6, tags: ['code', 'link'] },
  { id: 4, number: 4, summary: '错误码定义 - HTTP状态码与业务错误码的对应关系...', pageStart: 7, pageEnd: 7, tags: ['code'] },
  { id: 5, number: 5, summary: 'SDK使用指南 - Python/Java/Go SDK的安装与使用...', pageStart: 8, pageEnd: 9, tags: ['code'] },
  { id: 6, number: 6, summary: '版本更新日志 - v1.0至v3.2的版本迭代记录...', pageStart: 10, pageEnd: 10, tags: ['link'] },
];

const mockMDParts = [
  '# 概述\n\n这是产品API文档的概述部分，介绍产品API的基本使用方法和接口规范。所有API均基于RESTful设计原则，使用JSON格式进行数据交换。\n\n',
  '## API 认证\n\nAPI 认证方式支持 Bearer Token 和 API Key 两种方式。Bearer Token 通过登录接口获取，有效期24小时，过期后需重新获取。\n\n',
  '## 接口列表\n\n### 用户接口\n\n- `GET /api/users` — 获取用户列表\n- `POST /api/users` — 创建用户\n\n### 知识库接口\n\n- `GET /api/kb` — 获取知识库列表\n- `POST /api/kb` — 创建知识库\n',
  '## 错误码定义\n\n| 状态码 | 错误码 | 说明 |\n|---|---|---|\n| 400 | INVALID_PARAM | 参数不合法 |\n| 401 | UNAUTHORIZED | 未认证 |\n| 500 | INTERNAL_ERROR | 服务器内部错误 |\n\n',
  '## SDK 使用指南\n\n我们提供 Python、Java、Go 三种语言的 SDK，方便您快速集成。\n\n### Python SDK\n\n```python\nfrom rag_sdk import RAGClient\nclient = RAGClient(api_key="your_api_key")\n```\n\n',
  '## 版本更新日志\n\n### v3.2 (2025-06)\n- 新增 chunk search 多知识库联合搜索\n- 支持 content tags 内容标签\n\n### v3.1 (2025-04)\n- 切片编辑器支持拖拽分界线\n',
];

const chunkTagLabels: Record<string, string> = { code: '<>/', link: '🔗', image: '🖼' };

export default function ChunkEditorTab() {
  const [activeChunk, setActiveChunk] = useState<Chunk | null>(null);
  const [previewChunk, setPreviewChunk] = useState<Chunk | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>(mockChunks);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space size={12}>
          <Text strong style={{ fontSize: 14 }}>
            文档:
          </Text>
          <Select defaultValue="产品API文档.md" style={{ width: 200 }}>
            <Select.Option value="产品API文档.md">产品API文档.md</Select.Option>
            <Select.Option value="用户手册.docx">用户手册.docx</Select.Option>
          </Select>
          <Text type="secondary" style={{ fontSize: 13 }}>
            切片数: {chunks.length}
          </Text>
        </Space>
        <Space>
          <Button type="primary" onClick={() => message.success('切片边界已保存')}>
            保存切片
          </Button>
          <Popconfirm title="确认入库后将触发 Embedding + ChromaDB + BM25 索引" onConfirm={() => message.success('已提交确认入库')}>
            <Button type="primary" style={{ background: '#17a34a', borderColor: '#17a34a' }}>
              确认并入库
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <Card style={{ borderRadius: 12, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}>
          <div style={{ lineHeight: 1.8, fontSize: 14 }}>
            {mockMDParts.map((part, i) => (
              <div key={i}>
                <div
                  onClick={() => setActiveChunk(chunks[i])}
                  style={{
                    background: activeChunk?.id === chunks[i]?.id ? '#e8f0fe' : undefined,
                    borderRadius: 4,
                    padding: 2,
                    cursor: 'pointer',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {part}
                </div>
                {i < mockMDParts.length - 1 && (
                  <div
                    style={{
                      height: 2,
                      background: '#2f6feb',
                      margin: '16px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: 'ns-resize',
                    }}
                    onDoubleClick={() => {
                      if (window.confirm(`合并切分线 #${i + 1}？`)) {
                        const newChunks = [...chunks];
                        newChunks[i] = {
                          ...newChunks[i],
                          pageEnd: newChunks[i + 1]?.pageEnd || newChunks[i].pageEnd,
                          summary: newChunks[i].summary + newChunks[i + 1]?.summary || '',
                        };
                        newChunks.splice(i + 1, 1);
                        setChunks(newChunks);
                        message.success('已合并');
                      }
                    }}
                  >
                    <div style={{ width: 48, height: 6, background: '#2f6feb', borderRadius: 3, opacity: 0.5 }} />
                    <Text style={{ position: 'absolute', right: -48, fontSize: 11, fontFamily: 'monospace', color: '#2f6feb', fontWeight: 600 }}>
                      切分线 #{i + 1}
                    </Text>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="切片列表"
          style={{ borderRadius: 12, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}
          styles={{ body: { padding: 0 } }}
        >
          {chunks.length === 0 ? (
            <Empty description="暂无切片" />
          ) : (
            chunks.map((chunk) => (
              <div
                key={chunk.id}
                onClick={() => setActiveChunk(chunk)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  background: activeChunk?.id === chunk.id ? '#e8f0fe' : undefined,
                  borderLeft: activeChunk?.id === chunk.id ? '3px solid #2f6feb' : '3px solid transparent',
                  transition: 'background 150ms',
                }}
              >
                <Text strong style={{ fontSize: 12, color: '#2f6feb', fontFamily: 'monospace' }}>
                  #{chunk.number} {chunk.summary.split(' - ')[0]}
                </Text>
                <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: '#111' }}>{chunk.summary}</div>
                <div style={{ marginTop: 4, fontSize: 11, color: '#6b6b6b', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span>p.{chunk.pageStart}{chunk.pageStart !== chunk.pageEnd ? `-${chunk.pageEnd}` : ''}</span>
                  {chunk.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 3,
                        fontFamily: 'monospace',
                        background: t === 'code' ? '#f0f0f0' : t === 'link' ? '#e8f0fe' : '#e8f5e9',
                        color: t === 'code' ? '#6b6b6b' : t === 'link' ? '#2f6feb' : '#17a34a',
                      }}
                    >
                      {chunkTagLabels[t] || t}
                    </span>
                  ))}
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    style={{ marginLeft: 'auto', fontSize: 11, padding: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewChunk(chunk);
                    }}
                  >
                    预览
                  </Button>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      <Modal
        title={`切片 #${previewChunk?.number} 预览`}
        open={!!previewChunk}
        onCancel={() => setPreviewChunk(null)}
        footer={null}
        width={600}
      >
        {previewChunk && (
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              切片 #{previewChunk.number} · p.{previewChunk.pageStart}{previewChunk.pageStart !== previewChunk.pageEnd ? `-${previewChunk.pageEnd}` : ''}
            </Text>
            <div style={{ marginTop: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {mockMDParts[previewChunk.number - 1]}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
