import { useState, useCallback, useRef, useEffect } from 'react';
import { Layout, message } from 'antd';
import type { KnowledgeBase, Conversation, Message } from '../../types';
import QASider from './QASider';
import ChatArea from './ChatArea';

const mockAnswerText = `根据您的问题，我为您检索了知识库中的相关内容。

从技术文档中找到了以下关键信息：

1. **系统架构**方面，该系统采用前后端分离架构，前端使用 React + Ant Design，后端使用 FastAPI 提供 RESTful API。

2. **数据处理流程**包括文档上传、MinerU 格式转换、智能切片、向量化入库四个核心步骤。

3. **检索机制**采用混合检索策略，结合 BM25 关键词匹配和向量语义搜索，通过 RRF 算法融合排序，确保召回结果的准确性和多样性。

总体而言，这是一个完整的企业级 RAG 解决方案，适合用于内部知识管理和智能客服场景。`;

const mockKBs: KnowledgeBase[] = [
  { id: 1, name: '产品手册知识库', description: '', docCount: 8, chunkCount: 142, created_at: '', chunk_method: 'heading', chunk_heading_levels: '2', chunk_max_chars: 1000, chunk_overlap: 0, retrieval_top_k: 20, bm25_top_k: 20, rrf_k: 60, rerank_top_n: 5, conversation_max_rounds: 10, context_compression: true, system_prompt: '', llm_model: 'deepseek-v4-pro', llm_temperature: 0.7, embedding_model: '', rerank_model: '' },
  { id: 2, name: '技术文档知识库', description: '', docCount: 15, chunkCount: 230, created_at: '', chunk_method: 'heading', chunk_heading_levels: '2', chunk_max_chars: 1200, chunk_overlap: 100, retrieval_top_k: 25, bm25_top_k: 25, rrf_k: 60, rerank_top_n: 5, conversation_max_rounds: 15, context_compression: true, system_prompt: '', llm_model: 'deepseek-v4-pro', llm_temperature: 0.5, embedding_model: '', rerank_model: '' },
  { id: 3, name: '规章制度知识库', description: '', docCount: 6, chunkCount: 89, created_at: '', chunk_method: 'heading', chunk_heading_levels: '3', chunk_max_chars: 800, chunk_overlap: 0, retrieval_top_k: 20, bm25_top_k: 20, rrf_k: 60, rerank_top_n: 5, conversation_max_rounds: 10, context_compression: true, system_prompt: '', llm_model: 'deepseek-v4-pro', llm_temperature: 0.7, embedding_model: '', rerank_model: '' },
];

const initialConversations: Record<number, Conversation[]> = {
  1: [
    {
      id: 101, title: '关于API接口的问题', msgs: [
        { role: 'user', content: 'API接口的认证方式有哪些？', time: '10:30' },
        { role: 'assistant', content: '根据知识库文档，API 接口支持以下认证方式：\n\n1. **Bearer Token 认证**：在请求头中携带 `Authorization: Bearer <token>`，适用于所有 API 端点。\n2. **API Key 认证**：在请求参数中携带 `api_key`，适用于第三方集成场景。\n\n两种方式均需先在管理后台生成凭证，密钥有效期为 30 天，到期前系统会发送提醒。', time: '10:30', sources: [{ doc: '产品API文档.md', page: 3, snippet: 'API 认证方式支持 Bearer Token 和 API Key 两种方式。Bearer Token 通过登录接口获取，有效期 24 小时...' }, { doc: '安全规范.pdf', page: 12, snippet: '所有 API 请求必须经过认证。未认证请求返回 401 Unauthorized。API Key 需定期轮换，建议每 30 天更新一次...' }] },
      ],
    },
    { id: 102, title: '如何配置参数', msgs: [] },
    { id: 103, title: '版本更新说明', msgs: [] },
  ],
  2: [
    {
      id: 201, title: 'MinerU 转 Markdown 流程', msgs: [
        { role: 'user', content: '文档上传后的处理流程是怎样的？', time: '14:15' },
        { role: 'assistant', content: '文档上传后进入异步处理管道，流程如下：\n\n1. **上传** → 文件保存到服务端，状态 = `待处理`\n2. **格式判断** → Markdown 文件跳过转换，其他格式（PDF/Word/PPT/Excel）调用 MinerU API 转为 Markdown\n3. **自动切片** → 应用知识库的切片策略（默认按二级标题 `##` 分割，最大 1000 字符）\n4. **草稿入库** → 切片元数据写入数据库，状态 = `已就绪`，等待管理员确认\n5. **确认入库** → 管理员确认切片边界后，触发 Embedding + ChromaDB + FTS5 索引\n\n整个流程异步执行，上传后立即返回，前端每 3 秒轮询文档状态。', time: '14:16', sources: [{ doc: '架构设计.pptx', page: 5, snippet: 'Pipeline 处理链：上传 → MinerU 转换 → 切片引擎 → Embedding → 向量入库...' }, { doc: '开发指南.md', page: 15, snippet: '文档处理采用 FastAPI BackgroundTasks 异步执行，不阻塞上传请求...' }] },
      ],
    },
  ],
  3: [],
};

export default function QAPage() {
  const [kbs] = useState<KnowledgeBase[]>(mockKBs);
  const [currentKB, setCurrentKB] = useState<KnowledgeBase>(mockKBs[1]);
  const [convMap, setConvMap] = useState<Record<number, Conversation[]>>(initialConversations);
  const [currentConv, setCurrentConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversations = convMap[currentKB.id] || [];

  const selectKB = useCallback((kb: KnowledgeBase) => {
    setCurrentKB(kb);
    const convs = convMap[kb.id] || [];
    if (convs.length > 0 && convs[0].msgs.length > 0) {
      setCurrentConv(convs[0]);
      setMessages(convs[0].msgs);
    } else {
      setCurrentConv(null);
      setMessages([]);
    }
  }, [convMap]);

  const selectConv = useCallback((conv: Conversation) => {
    setCurrentConv(conv);
    setMessages(conv.msgs || []);
  }, []);

  const newConversation = useCallback(() => {
    const newConv: Conversation = {
      id: Date.now(),
      title: '新对话',
      msgs: [],
    };
    setConvMap((prev) => ({
      ...prev,
      [currentKB.id]: [newConv, ...(prev[currentKB.id] || [])],
    }));
    setCurrentConv(newConv);
    setMessages([]);
  }, [currentKB.id]);

  const deleteConv = useCallback((id: number) => {
    message.success('对话已删除');
    setConvMap((prev) => ({
      ...prev,
      [currentKB.id]: (prev[currentKB.id] || []).filter((c) => c.id !== id),
    }));
    if (currentConv?.id === id) {
      setCurrentConv(null);
      setMessages([]);
    }
  }, [currentKB.id, currentConv]);

  const sendMessage = useCallback(
    (query: string) => {
      let conv = currentConv;
      if (!conv) {
        conv = {
          id: Date.now(),
          title: query.substring(0, 50),
          msgs: [],
        };
        setConvMap((prev) => ({
          ...prev,
          [currentKB.id]: [conv!, ...(prev[currentKB.id] || [])],
        }));
        setCurrentConv(conv);
      }

      const userMsg: Message = {
        role: 'user',
        content: query,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedMsgs = [...messages, userMsg];
      if (conv.title === '新对话') {
        conv = { ...conv, title: query.substring(0, 50) };
        setConvMap((prev) => ({
          ...prev,
          [currentKB.id]: (prev[currentKB.id] || []).map((c) =>
            c.id === conv!.id ? conv! : c
          ),
        }));
        setCurrentConv(conv);
      }
      conv.msgs = [...conv.msgs, userMsg];
      setMessages(updatedMsgs);

      setIsStreaming(true);

      let streamContent = '';
      const fullText = mockAnswerText;
      let idx = 0;
      const assistantMsg: Message = {
        role: 'assistant',
        content: '',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      streamTimerRef.current = setInterval(() => {
        if (idx < fullText.length) {
          streamContent += fullText.charAt(idx);
          idx++;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...assistantMsg, content: streamContent };
            return copy;
          });
        } else {
          clearInterval(streamTimerRef.current!);
          streamTimerRef.current = null;
          const finalMsg: Message = {
            role: 'assistant',
            content: fullText,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            sources: [
              { doc: '技术架构文档.md', page: 3, snippet: '系统采用 React + Ant Design 构建前端，FastAPI 构建后端 RESTful API，SQLite 作为应用数据库...' },
              { doc: '数据处理手册.docx', page: 7, snippet: '文档上传后进入异步处理管道：格式判断 → MinerU 转换 → 智能切片 → 向量化入库...' },
            ],
          };
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = finalMsg;
            return copy;
          });
          conv!.msgs = [...conv!.msgs, finalMsg];
          setIsStreaming(false);
        }
      }, 25);
    },
    [currentKB.id, currentConv, messages]
  );

  const stopStreaming = useCallback(() => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Sider
        width={280}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <QASider
          knowledgeBases={kbs}
          conversations={conversations}
          currentKB={currentKB}
          currentConv={currentConv}
          onSelectKB={selectKB}
          onSelectConv={selectConv}
          onNewConversation={newConversation}
          onDeleteConv={deleteConv}
        />
      </Layout.Sider>
      <Layout.Content style={{ display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
        <ChatArea
          currentKB={currentKB}
          messages={messages}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onStop={stopStreaming}
        />
      </Layout.Content>
    </Layout>
  );
}
