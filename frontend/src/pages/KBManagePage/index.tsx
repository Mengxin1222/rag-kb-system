import { useState, useEffect, useCallback } from 'react';
import { Layout, Tabs, Modal, Input, Typography, message, Empty } from 'antd';
import { listKBs, createKB, deleteKB, updateKB, getKB } from '../../api/kb';
import KBManageSider from './KBManageSider';
import BasicInfoTab from './BasicInfoTab';
import StrategyConfigTab from './StrategyConfigTab';
import DocManageTab from './DocManageTab';
import ChunkEditorTab from './ChunkEditorTab';

const { TextArea } = Input;
const { Text } = Typography;

function kbToForm(kb: { id: number; name: string; [key: string]: unknown }) {
  return {
    id: kb.id,
    name: kb.name,
    description: (kb.description as string) || '',
    docCount: 0,
    chunkCount: 0,
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
    llm_model: (kb.llm_model as string) || 'deepseek-v4-flash',
    llm_temperature: (kb.llm_temperature as number) || 0.7,
    embedding_model: (kb.embedding_model as string) || '',
    rerank_model: (kb.rerank_model as string) || '',
  };
}

export default function KBManagePage() {
  const [kbs, setKBs] = useState<ReturnType<typeof kbToForm>[]>([]);
  const [currentKB, setCurrentKB] = useState<ReturnType<typeof kbToForm> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [showNewKBModal, setShowNewKBModal] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const [newKBDesc, setNewKBDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [kbSiderCollapsed, setKbSiderCollapsed] = useState(false);

  const fetchKBs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listKBs();
      const mapped = (data as any[]).map(kbToForm);
      setKBs(mapped);
      if (mapped.length > 0 && (!currentKB || !mapped.find((k) => k.id === currentKB.id))) {
        setCurrentKB(mapped[0]);
      }
    } catch {
      message.error('获取知识库列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKBs(); }, []);

  const selectKB = async (kbSimple: { id: number }) => {
    try {
      const detail = await getKB(kbSimple.id);
      setCurrentKB(kbToForm(detail as any));
    } catch {
      const existing = kbs.find((k) => k.id === kbSimple.id);
      if (existing) setCurrentKB(existing);
    }
    setActiveTab('basic');
  };

  const handleCreate = async () => {
    if (!newKBName.trim()) { message.error('请输入知识库名称'); return; }
    setCreating(true);
    try {
      const kb = await createKB({ name: newKBName.trim(), description: newKBDesc.trim() });
      message.success('知识库创建成功');
      setShowNewKBModal(false);
      setNewKBName('');
      setNewKBDesc('');
      await fetchKBs();
      const detail = await getKB(kb.id);
      setCurrentKB(kbToForm(detail as any));
    } catch {
      message.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (name: string, desc: string) => {
    if (!currentKB) return;
    try {
      await updateKB(currentKB.id, { name, description: desc });
      message.success('保存成功');
      setCurrentKB({ ...currentKB, name, description: desc });
      setKBs((prev) => prev.map((k) => (k.id === currentKB.id ? { ...k, name, description: desc } : k)));
    } catch {
      message.error('保存失败');
    }
  };

  const handleDelete = async () => {
    if (!currentKB) return;
    try {
      await deleteKB(currentKB.id);
      message.success('已删除');
      setKBs((prev) => prev.filter((k) => k.id !== currentKB.id));
      setCurrentKB(null);
    } catch {
      message.error('删除失败');
    }
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
    } catch {
      message.error('保存失败');
    }
  };

  const updateKBField = (fields: Partial<ReturnType<typeof kbToForm>>) => {
    if (!currentKB) return;
    setCurrentKB({ ...currentKB, ...fields });
  };

  const tabItems = [
    {
      key: 'basic',
      label: '基础信息',
      children: currentKB ? (
        <BasicInfoTab kb={currentKB} onSave={handleSave} onDelete={handleDelete} />
      ) : null,
    },
    {
      key: 'strategy',
      label: '策略配置',
      children: currentKB ? (
        <StrategyConfigTab kb={currentKB} onUpdate={(fields) => updateKBField(fields)} onSave={handleSaveStrategy} />
      ) : null,
    },
    {
      key: 'docs',
      label: '文档管理',
      children: currentKB ? (
        <DocManageTab kbId={currentKB.id} onSwitchToChunks={() => setActiveTab('chunks')} />
      ) : null,
    },
    {
      key: 'chunks',
      label: '切片编辑器',
      children: <ChunkEditorTab kbId={currentKB?.id || 0} />,
    },
  ];

  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Sider width={240} collapsedWidth={50} collapsed={kbSiderCollapsed} trigger={null} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <KBManageSider
          knowledgeBases={kbs}
          currentKB={currentKB}
          onSelectKB={selectKB}
          onNewKB={() => setShowNewKBModal(true)}
          loading={loading}
          collapsed={kbSiderCollapsed}
          onToggleCollapse={() => setKbSiderCollapsed(!kbSiderCollapsed)}
        />
      </Layout.Sider>
      <Layout.Content style={{ background: '#f5f5f5', overflow: 'auto', padding: 24 }}>
        {!currentKB && !loading ? (
          <Empty description="请选择或创建一个知识库" style={{ marginTop: 100 }} />
        ) : (
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        )}
      </Layout.Content>

      <Modal
        title="新建知识库"
        open={showNewKBModal}
        onCancel={() => setShowNewKBModal(false)}
        onOk={handleCreate}
        okText="创建"
        cancelText="取消"
        confirmLoading={creating}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>名称 *</Text>
            <Input placeholder="请输入知识库名称" value={newKBName} onChange={(e) => setNewKBName(e.target.value)} />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>描述</Text>
            <TextArea placeholder="请输入知识库描述（选填）" value={newKBDesc} onChange={(e) => setNewKBDesc(e.target.value)} rows={3} />
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
