import { Card, Input, InputNumber, Select, Switch, Slider, Button, Typography, message, Space } from 'antd';
import type { KnowledgeBase } from '../../types';

const { Text } = Typography;
const { TextArea } = Input;

interface Props {
  kb: KnowledgeBase;
  onSave: () => void;
}

export default function StrategyConfigTab({ kb, onSave }: Props) {
  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card title="切片策略" style={{ borderRadius: 12 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              切片方法
            </Text>
            <Select defaultValue={kb.chunk_method} style={{ width: 200 }}>
              <Select.Option value="heading">标题分割</Select.Option>
              <Select.Option value="character">字符分割</Select.Option>
              <Select.Option value="semantic">语义分割</Select.Option>
            </Select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                标题层级
              </Text>
              <Select defaultValue={kb.chunk_heading_levels} style={{ width: '100%' }}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Select.Option key={n} value={String(n)}>
                    {n}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                最大字符数
              </Text>
              <InputNumber defaultValue={kb.chunk_max_chars} min={100} max={10000} style={{ width: '100%' }} />
            </div>
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              切片重叠数
            </Text>
            <InputNumber defaultValue={kb.chunk_overlap} min={0} max={500} style={{ width: 120 }} />
          </div>
        </Space>
      </Card>

      <Card title="检索参数" style={{ borderRadius: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              向量检索 Top-K
            </Text>
            <InputNumber defaultValue={kb.retrieval_top_k} min={1} max={100} style={{ width: '100%' }} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              BM25 检索 Top-K
            </Text>
            <InputNumber defaultValue={kb.bm25_top_k} min={1} max={100} style={{ width: '100%' }} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              RRF 融合常数 K
            </Text>
            <InputNumber defaultValue={kb.rrf_k} min={10} max={200} style={{ width: '100%' }} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              Rerank Top-N
            </Text>
            <InputNumber defaultValue={kb.rerank_top_n} min={1} max={100} style={{ width: '100%' }} />
          </div>
        </div>
      </Card>

      <Card title="对话参数" style={{ borderRadius: 12 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                最大对话轮数
              </Text>
              <InputNumber defaultValue={kb.conversation_max_rounds} min={1} max={50} style={{ width: '100%' }} />
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                上下文压缩
              </Text>
              <Switch defaultChecked={kb.context_compression} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                LLM 模型
              </Text>
              <Select defaultValue={kb.llm_model} style={{ width: '100%' }}>
                <Select.Option value="deepseek-chat">deepseek-chat</Select.Option>
                <Select.Option value="gpt-4o">gpt-4o</Select.Option>
                <Select.Option value="qwen-max">qwen-max</Select.Option>
              </Select>
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                LLM Temperature
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Slider defaultValue={kb.llm_temperature} min={0} max={2} step={0.1} style={{ flex: 1, maxWidth: 200 }} />
                <Text type="secondary" style={{ fontFamily: 'monospace' }}>{kb.llm_temperature}</Text>
              </div>
            </div>
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              System Prompt
            </Text>
            <TextArea defaultValue={kb.system_prompt} rows={5} />
          </div>
        </Space>
      </Card>

      <Button type="primary" onClick={() => { onSave(); message.success('策略配置已保存'); }}>
        保存配置
      </Button>
    </Space>
  );
}
