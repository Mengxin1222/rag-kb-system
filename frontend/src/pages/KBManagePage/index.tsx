import { useState } from 'react';
import { Layout, Tabs, Modal, Input, Typography, message } from 'antd';
import type { KnowledgeBase } from '../../types';
import KBManageSider from './KBManageSider';
import BasicInfoTab from './BasicInfoTab';
import StrategyConfigTab from './StrategyConfigTab';
import DocManageTab from './DocManageTab';
import ChunkEditorTab from './ChunkEditorTab';

const { TextArea } = Input;
const { Text } = Typography;

const mockKBs: KnowledgeBase[] = [
  { id: 1, name: '产品手册知识库', description: '产品相关文档集合', docCount: 8, chunkCount: 142, created_at: '2025-03-15', chunk_method: 'heading', chunk_heading_levels: '2', chunk_max_chars: 1000, chunk_overlap: 0, retrieval_top_k: 20, bm25_top_k: 20, rrf_k: 60, rerank_top_n: 5, conversation_max_rounds: 10, context_compression: true, system_prompt: '你是一个专业的产品知识助手...', llm_model: 'deepseek-chat', llm_temperature: 0.7, embedding_model: 'text-embedding-v3', rerank_model: 'gte-rerank' },
  { id: 2, name: '技术文档知识库', description: '技术架构和开发文档', docCount: 15, chunkCount: 230, created_at: '2025-04-20', chunk_method: 'heading', chunk_heading_levels: '2', chunk_max_chars: 1200, chunk_overlap: 100, retrieval_top_k: 25, bm25_top_k: 25, rrf_k: 60, rerank_top_n: 5, conversation_max_rounds: 15, context_compression: true, system_prompt: '你是一个技术架构助手...', llm_model: 'deepseek-chat', llm_temperature: 0.5, embedding_model: 'text-embedding-v3', rerank_model: 'gte-rerank' },
  { id: 3, name: '规章制度知识库', description: '公司规章制度和流程文档', docCount: 6, chunkCount: 89, created_at: '2025-05-10', chunk_method: 'heading', chunk_heading_levels: '3', chunk_max_chars: 800, chunk_overlap: 0, retrieval_top_k: 20, bm25_top_k: 20, rrf_k: 60, rerank_top_n: 5, conversation_max_rounds: 10, context_compression: true, system_prompt: '你是公司制度助手...', llm_model: 'deepseek-chat', llm_temperature: 0.7, embedding_model: 'text-embedding-v3', rerank_model: 'gte-rerank' },
];

export default function KBManagePage() {
  const [kbs, setKBs] = useState<KnowledgeBase[]>(mockKBs);
  const [currentKB, setCurrentKB] = useState<KnowledgeBase>(mockKBs[0]);
  const [activeTab, setActiveTab] = useState('basic');
  const [showNewKBModal, setShowNewKBModal] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const [newKBDesc, setNewKBDesc] = useState('');

  const selectKB = (kb: KnowledgeBase) => {
    setCurrentKB(kb);
    setActiveTab('basic');
  };

  const createKB = () => {
    if (!newKBName.trim()) {
      message.error('请输入知识库名称');
      return;
    }
    const newKB: KnowledgeBase = {
      ...mockKBs[0],
      id: Date.now(),
      name: newKBName.trim(),
      description: newKBDesc.trim(),
      docCount: 0,
      chunkCount: 0,
      created_at: new Date().toISOString().split('T')[0],
    };
    setKBs((prev) => [...prev, newKB]);
    setCurrentKB(newKB);
    setShowNewKBModal(false);
    setNewKBName('');
    setNewKBDesc('');
    message.success('知识库创建成功');
  };

  const updateKB = (updates: Partial<KnowledgeBase>) => {
    const updated = { ...currentKB, ...updates };
    setCurrentKB(updated);
    setKBs((prev) => prev.map((kb) => (kb.id === updated.id ? updated : kb)));
  };

  const deleteKB = () => {
    const filtered = kbs.filter((kb) => kb.id !== currentKB.id);
    setKBs(filtered);
    if (filtered.length > 0) {
      setCurrentKB(filtered[0]);
    }
  };

  const tabItems = [
    { key: 'basic', label: '基础信息', children: <BasicInfoTab kb={currentKB} onSave={(name, desc) => updateKB({ name, description: desc })} onDelete={deleteKB} /> },
    { key: 'strategy', label: '策略配置', children: <StrategyConfigTab kb={currentKB} onSave={() => {}} /> },
    { key: 'docs', label: '文档管理', children: <DocManageTab onSwitchToChunks={() => setActiveTab('chunks')} /> },
    { key: 'chunks', label: '切片编辑器', children: <ChunkEditorTab /> },
  ];

  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Sider width={240} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <KBManageSider
          knowledgeBases={kbs}
          currentKB={currentKB}
          onSelectKB={selectKB}
          onNewKB={() => setShowNewKBModal(true)}
        />
      </Layout.Sider>
      <Layout.Content style={{ background: '#f5f5f5', overflow: 'auto', padding: 24 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Layout.Content>

      <Modal
        title="新建知识库"
        open={showNewKBModal}
        onCancel={() => setShowNewKBModal(false)}
        onOk={createKB}
        okText="创建"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              名称 *
            </Text>
            <Input
              placeholder="请输入知识库名称"
              value={newKBName}
              onChange={(e) => setNewKBName(e.target.value)}
            />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
              描述
            </Text>
            <TextArea
              placeholder="请输入知识库描述（选填）"
              value={newKBDesc}
              onChange={(e) => setNewKBDesc(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
