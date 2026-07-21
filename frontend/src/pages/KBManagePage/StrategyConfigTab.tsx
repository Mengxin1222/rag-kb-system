import { useState } from 'react';
import { Card, Input, InputNumber, Select, Switch, Slider, Button, Typography, Space, Radio, Tag } from 'antd';

const { Text } = Typography;
const { TextArea } = Input;

interface KBFormData {
  chunk_method: string;
  chunk_heading_levels: string;
  chunk_max_chars: number;
  chunk_overlap: number;
  retrieval_top_k: number;
  bm25_top_k: number;
  rerank_top_n: number;
  rrf_k: number;
  conversation_max_rounds: number;
  context_compression: boolean;
  system_prompt: string;
  llm_model: string;
  llm_temperature: number;
  embedding_model?: string;
  rerank_model?: string;
}

interface Props {
  kb: KBFormData;
  onUpdate: (fields: Partial<KBFormData>) => void;
  onSave: () => void;
}

export default function StrategyConfigTab({ kb, onUpdate, onSave }: Props) {
  const [dirty, setDirty] = useState(false);
  const update = (fields: Partial<KBFormData>) => { setDirty(true); onUpdate(fields); };

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card title="切片策略" style={{ borderRadius: 12 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>切片方法</Text>
            <Radio.Group value={kb.chunk_method} onChange={(e) => update({ chunk_method: e.target.value })}>
              <Radio.Button value="heading">标题分割</Radio.Button>
              <Radio.Button value="character">字符分割</Radio.Button>
              <Radio.Button value="semantic">语义分割</Radio.Button>
            </Radio.Group>
          </div>
          {kb.chunk_method === 'heading' && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>标题层级</Text>
              <Select value={kb.chunk_heading_levels} onChange={(v) => update({ chunk_heading_levels: v })} style={{ width: 200 }}>
                {[1, 2, 3, 4, 5, 6].map((n) => <Select.Option key={n} value={String(n)}>{n}</Select.Option>)}
              </Select>
            </div>
          )}
          {kb.chunk_method === 'character' && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>分隔符顺序（从上到下依次尝试）</Text>
              <div style={{ background: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: 8, padding: 8 }}>
                {['\n\n', '\n', '。', '.', '！', '?', '；', ';'].map((s, i) => (
                  <Tag key={i} style={{ marginBottom: 4, cursor: 'grab' }}>{s === '\n\n' ? '\\n\\n' : s === '\n' ? '\\n' : s}</Tag>
                ))}
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  拖拽调整顺序（开发中）
                </Text>
              </div>
            </div>
          )}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>最大字符数</Text>
            <InputNumber value={kb.chunk_max_chars} onChange={(v) => update({ chunk_max_chars: v || 1000 })} min={100} max={10000} style={{ width: 120 }} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>切片重叠数</Text>
            <InputNumber value={kb.chunk_overlap} onChange={(v) => update({ chunk_overlap: v || 0 })} min={0} max={500} style={{ width: 120 }} />
          </div>
        </Space>
      </Card>

      <Card title="检索参数" style={{ borderRadius: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>向量检索 Top-K</Text>
            <InputNumber value={kb.retrieval_top_k} onChange={(v) => update({ retrieval_top_k: v || 20 })} min={1} max={100} style={{ width: '100%' }} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>BM25 检索 Top-K</Text>
            <InputNumber value={kb.bm25_top_k} onChange={(v) => update({ bm25_top_k: v || 20 })} min={1} max={100} style={{ width: '100%' }} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>RRF 融合常数 K</Text>
            <InputNumber value={kb.rrf_k} onChange={(v) => update({ rrf_k: v || 60 })} min={10} max={200} style={{ width: '100%' }} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Rerank Top-N</Text>
            <InputNumber value={kb.rerank_top_n} onChange={(v) => update({ rerank_top_n: v || 5 })} min={1} max={100} style={{ width: '100%' }} />
          </div>
        </div>
      </Card>

      <Card title="对话参数" style={{ borderRadius: 12 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>最大对话轮数</Text>
              <InputNumber value={kb.conversation_max_rounds} onChange={(v) => update({ conversation_max_rounds: v || 10 })} min={1} max={50} style={{ width: '100%' }} />
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>上下文压缩</Text>
              <Switch checked={kb.context_compression} onChange={(v) => update({ context_compression: v })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>LLM 模型</Text>
              <Select value={kb.llm_model} onChange={(v) => update({ llm_model: v })} style={{ width: '100%' }}>
                <Select.Option value="deepseek-v4-pro">deepseek-v4-pro</Select.Option>
                <Select.Option value="deepseek-v4-flash">deepseek-v4-flash</Select.Option>
              </Select>
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>LLM Temperature</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Slider value={kb.llm_temperature} onChange={(v) => update({ llm_temperature: v })} min={0} max={2} step={0.1} style={{ flex: 1, maxWidth: 200 }} />
                <Text type="secondary" style={{ fontFamily: 'monospace' }}>{kb.llm_temperature}</Text>
              </div>
            </div>
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>System Prompt</Text>
            <TextArea value={kb.system_prompt} onChange={(e) => update({ system_prompt: e.target.value })} rows={5} />
          </div>
        </Space>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button type="primary" onClick={() => { onSave(); setDirty(false); }} disabled={!dirty} style={{ opacity: dirty ? 1 : 0.5 }}>
          保存配置
        </Button>
        <Space>
          <Text type="secondary" style={{ fontSize: 13 }}>Embedding: {kb.embedding_model || '默认'}</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>Rerank: {kb.rerank_model || '默认'}</Text>
        </Space>
      </div>
    </Space>
  );
}
