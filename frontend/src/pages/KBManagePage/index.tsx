import { useState, useEffect, useCallback } from 'react';
import { Tabs, Typography, message, Empty, Spin } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { getKB, updateKB, deleteKB } from '../../api/kb';
import { useKBSelect } from '../../contexts/KBSelectContext';
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
  const { kbId } = useParams<{ kbId: string }>();
  const navigate = useNavigate();
  const { setSelectedKBId } = useKBSelect();
  const [currentKB, setCurrentKB] = useState<ReturnType<typeof kbToForm> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  const fetchKB = useCallback(async () => {
    if (!kbId) return;
    setLoading(true);
    try {
      const detail = await getKB(parseInt(kbId));
      const form = kbToForm(detail as any);
      setCurrentKB(form);
      setSelectedKBId(form.id);
    } catch {
      message.error('获取知识库信息失败');
    } finally {
      setLoading(false);
    }
  }, [kbId, setSelectedKBId]);

  useEffect(() => { fetchKB(); }, [fetchKB]);

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
      navigate('/dashboard');
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

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  if (!currentKB) return <Empty description="知识库不存在" />;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Text strong style={{ fontSize: 16 }}>{currentKB.name}</Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          文档: {currentKB.docCount} · 切片: {currentKB.chunkCount} · 创建: {currentKB.created_at}
        </Text>
      </div>
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
    </div>
  );
}
