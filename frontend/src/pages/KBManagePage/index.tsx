import { useState, useEffect, useCallback } from 'react';
import { Tabs, Typography, message, Empty, Spin, Select, Space, Input, Button } from 'antd';
import { getKB, updateKB, deleteKB, listKBs, createKB, type KBListItem } from '../../api/kb';
import BasicInfoTab from './BasicInfoTab';
import StrategyConfigTab from './StrategyConfigTab';
import DocManageTab from './DocManageTab';
import ChunkEditorTab from './ChunkEditorTab';

const { Text } = Typography;

function kbToForm(kb: { id: number; name: string; [key: string]: unknown }) {
  return {
    id: kb.id,
    name: kb.name,
    description: (kb.description as string) || '',
    docCount: 0, chunkCount: 0,
    created_at: (kb.created_at as string) || '',
    chunk_method: (kb.chunk_method as string) || 'heading',
    chunk_heading_levels: (kb.chunk_heading_levels as string) || '2',
    chunk_max_chars: (kb.chunk_max_chars as number) || 1000,
    chunk_overlap: (kb.chunk_overlap as number) || 0,
    retrieval_top_k: (kb.retrieval_top_k as number) || 20,
    bm25_top_k: (kb.bm25_top_k as number) || 20,
    rrf_k: (kb.rrf_k as number) || 60,
    rerank_top_n: (kb.rerank_top_n as number) || 5,
    conversation_max_rounds: (kb.conversation_max_rounds as number) || 10,
    context_compression: kb.context_compression !== false,
    system_prompt: (kb.system_prompt as string) || '',
    llm_model: (kb.llm_model as string) || 'deepseek-v4-pro',
    llm_temperature: (kb.llm_temperature as number) || 0.7,
    embedding_model: (kb.embedding_model as string) || '',
    rerank_model: (kb.rerank_model as string) || '',
  };
}

export default function KBManagePage() {
  const [kbs, setKBs] = useState<KBListItem[]>([]);
  const [currentKB, setCurrentKB] = useState<ReturnType<typeof kbToForm> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  const fetchKBs = useCallback(async () => {
    try {
      const data = await listKBs();
      setKBs(data);
      return data;
    } catch { return []; }
  }, []);

  useEffect(() => {
    fetchKBs().then((data) => {
      setLoading(false);
      if (data.length > 0) {
        selectKB(data[0]);
      }
    });
  }, []);

  const selectKB = async (kbItem: KBListItem) => {
    setLoading(true);
    try {
      const detail = await getKB(kbItem.id);
      setCurrentKB(kbToForm(detail as any));
    } catch {
      setCurrentKB(kbToForm(kbItem as any));
    } finally {
      setLoading(false);
    }
    setActiveTab('basic');
  };

  const handleCreate = async (name: string) => {
    try {
      const kb = await createKB({ name });
      message.success('知识库创建成功');
      await fetchKBs();
      selectKB(kb as unknown as KBListItem);
    } catch { message.error('创建失败'); }
  };

  const handleSave = async (name: string, desc: string) => {
    if (!currentKB) return;
    try {
      await updateKB(currentKB.id, { name, description: desc });
      message.success('保存成功');
      setCurrentKB({ ...currentKB, name, description: desc });
    } catch { message.error('保存失败'); }
  };

  const handleDelete = async () => {
    if (!currentKB) return;
    try {
      await deleteKB(currentKB.id);
      message.success('已删除');
      const data = await fetchKBs();
      if (data.length > 0) selectKB(data[0]);
      else setCurrentKB(null);
    } catch { message.error('删除失败'); }
  };

  const handleSaveStrategy = async () => {
    if (!currentKB) return;
    try {
      await updateKB(currentKB.id, {
        chunk_method: currentKB.chunk_method,
        chunk_heading_levels: currentKB.chunk_heading_levels,
        chunk_max_chars: currentKB.chunk_max_chars,
        chunk_overlap: currentKB.chunk_overlap,
        retrieval_top_k: currentKB.retrieval_top_k,
        bm25_top_k: currentKB.bm25_top_k,
        rrf_k: currentKB.rrf_k,
        rerank_top_n: currentKB.rerank_top_n,
        conversation_max_rounds: currentKB.conversation_max_rounds,
        context_compression: currentKB.context_compression,
        system_prompt: currentKB.system_prompt,
        llm_model: currentKB.llm_model,
        llm_temperature: currentKB.llm_temperature,
        embedding_model: currentKB.embedding_model,
        rerank_model: currentKB.rerank_model,
      } as any);
      message.success('策略配置已保存');
    } catch { message.error('保存失败'); }
  };

  const updateKBField = (fields: Partial<ReturnType<typeof kbToForm>>) => {
    if (!currentKB) return;
    setCurrentKB({ ...currentKB, ...fields });
  };

  // KB selector + create
  const [newKbName, setNewKbName] = useState('');
  const [creating] = useState(false);

  if (!currentKB && !loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Empty description="暂无知识库" />
        <Space style={{ marginTop: 16 }}>
          <Input
            placeholder="输入名称新建知识库"
            value={newKbName}
            onChange={(e) => setNewKbName(e.target.value)}
            onPressEnter={() => { handleCreate(newKbName); setNewKbName(''); }}
            style={{ width: 200 }}
          />
          <Button loading={creating} onClick={() => { handleCreate(newKbName); setNewKbName(''); }}>
            创建
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Select
          value={currentKB?.id}
          onChange={(id) => { const kb = kbs.find((k) => k.id === id); if (kb) selectKB(kb); }}
          options={kbs.map((kb) => ({ label: kb.name, value: kb.id }))}
          style={{ minWidth: 200 }}
          placeholder="选择知识库"
        />
        {currentKB && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            文档: {currentKB.docCount} · 切片: {currentKB.chunkCount} · 创建: {currentKB.created_at}
          </Text>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      ) : currentKB ? (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'basic', label: '基础信息', children: <BasicInfoTab kb={currentKB} onSave={handleSave} onDelete={handleDelete} /> },
            { key: 'strategy', label: '策略配置', children: <StrategyConfigTab kb={currentKB} onUpdate={(f) => updateKBField(f)} onSave={handleSaveStrategy} /> },
            { key: 'docs', label: '文档管理', children: <DocManageTab kbId={currentKB.id} onSwitchToChunks={() => setActiveTab('chunks')} /> },
            { key: 'chunks', label: '切片编辑器', children: <ChunkEditorTab kbId={currentKB.id} /> },
          ]}
        />
      ) : null}
    </div>
  );
}
