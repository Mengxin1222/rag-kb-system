# Tickets: RAG 知识库问答系统 — 后端

纯后端实现。FastAPI + SQLite + ChromaDB + LangChain。

参考：[docs/architecture-overview.md](docs/architecture-overview.md)

---

## Ticket 1: 项目脚手架 & 认证

**要做什么：** FastAPI 项目骨架搭建，全部数据库表创建，JWT 认证可用，种子管理员就绪。

**阻塞：** 无 — 可立即开工

- [ ] 项目目录结构：config、database、models、schemas、api、services、utils
- [ ] SQLAlchemy ORM 模型：users、knowledge_bases、documents、conversations、messages、chunks（完整字段按 database-design.md）
- [ ] ChromaDB 持久化 Client 启动时初始化
- [ ] JWT 认证：POST /api/auth/login + token 验证依赖注入 + POST /api/auth/refresh
- [ ] 首次启动时 seed 管理员账号
- [ ] CORS 中间件

---

## Ticket 2: 知识库 CRUD

**要做什么：** 知识库完整 CRUD API，全部可配置字段。

**阻塞：** Ticket 1

- [ ] knowledge_bases 模型和 schema（所有配置字段：chunk_method、chunk_heading_levels、chunk_max_chars、chunk_overlap、chunk_separators、retrieval_top_k、rerank_top_n、conversation_max_rounds、context_compression、system_prompt、llm_model、llm_temperature、embedding_model、rerank_model）
- [ ] API：GET /api/kb（列表）、POST /api/kb（创建，仅名称必填其余用默认值）、GET /api/kb/{id}（详情）、PUT /api/kb/{id}（更新）、DELETE /api/kb/{id}（级联删除 documents 和 chunks 元数据）
- [ ] 创建/更新/删除仅限 admin 角色

---

## Ticket 3: 文档上传 & 自动切片管道

**要做什么：** 上传文档 → MinerU API 转换非 MD 格式 → LangChain 自动切片 → 切片草稿入库。

**阻塞：** Ticket 2

- [ ] POST /api/documents/upload：multipart 文件上传，校验格式，存入 files/ 目录，创建 document 记录（status=pending）
- [ ] MinerU API 集成：pdf/docx/pptx/xlsx → markdown，写入 md_path，状态更新 processing → ready/failed
- [ ] 切片引擎：LangChain MarkdownHeaderTextSplitter + RecursiveCharacterTextSplitter，分隔符从 chunk_separators 字段读取，支持 chunk_overlap
- [ ] 切片入库：char_start、char_end、content、content_hash、page_start、page_end，embedding_status=pending
- [ ] FastAPI BackgroundTasks 异步处理，GET /api/documents/{id}/status 供前端轮询
- [ ] GET /api/documents（按 kb_id 列表）、GET /api/documents/{id}（详情）、DELETE /api/documents/{id}（级联清理）

---

## Ticket 4: 切片编辑器 API

**要做什么：** 读写切片边界的 API，供前端拖拽编辑器调用。

**阻塞：** Ticket 3

- [ ] GET /api/documents/{id}/chunks：返回文档 MD 全文 + 所有切片元数据（char_start、char_end、content、page）
- [ ] PUT /api/documents/{id}/chunks：接收调整后的边界数组，重新计算各切片 content/content_hash，写入数据库
- [ ] POST /api/documents/{id}/chunks/confirm：标记 chunks_reviewed=1，触发后续 embedding（见 Ticket 5）

---

## Ticket 5: Embedding & BM25 入库

**要做什么：** 确认切片后 → 阿里 Embedding API 向量化 → ChromaDB 写入 → BM25 FTS5 索引建立。

**阻塞：** Ticket 3（切片存在即可，不依赖 Ticket 4）

- [ ] POST /api/documents/{id}/finalize：触发 embedding 管道（BackgroundTasks）
- [ ] 阿里 Embedding API：chunk.content → 向量
- [ ] ChromaDB：按 KB 创建 Collection（命名 kb_{id}），批量写入向量，回填 chroma_id 到 chunks 表
- [ ] BM25 索引：写入 SQLite FTS5 虚拟表（kb_id、document_id、chunk_text）
- [ ] 删除文档：级联清理 ChromaDB 向量 + FTS5 条目 + chunks 元数据
- [ ] 更新 chunks.embedding_status=embedded、documents.chunks_reviewed=1
- [ ] GET /api/documents/{id}/status 返回 embedding 进度

---

## Ticket 6: 问答 & 混合检索

**要做什么：** 创建对话、提问、混合检索管道（向量 + BM25 + RRF + Rerank）、SSE 流式返回。

**阻塞：** Ticket 5

- [ ] POST /api/conversations：创建对话（user_id + kb_id），自动生成标题
- [ ] POST /api/chat/send：SSE 流式端点
  1. Query → 阿里 Embedding → ChromaDB 向量检索 Top-K（按 kb Collection 过滤）
  2. BM25 检索（FTS5 MATCH）Top-K（按 kb_id 过滤）
  3. RRF 融合去重 → 候选列表
  4. 阿里 Rerank API 精排 Top-N
  5. 拼接上下文 + SystemPrompt（从 KB 配置读取）+ 消息历史 → DeepSeek API（stream=True）
  6. SSE 逐 token 推送
  7. 保存消息到 DB（role=user/assistant、content、sources JSON）
- [ ] GET /api/conversations（按 user_id + kb_id 列表）、GET /api/conversations/{id}/messages、DELETE /api/conversations/{id}

---

## Ticket 7: 多轮对话 & 上下文压缩

**要做什么：** 对话历史管理、超轮数自动压缩早期轮次为摘要。

**阻塞：** Ticket 6

- [ ] 对话标题：首条提问前 50 字自动截取
- [ ] 上下文压缩：当消息轮数 > conversation_max_rounds 且 context_compression 开启时 → 调用 DeepSeek 将早期轮次压缩为摘要 → 作为系统级上下文注入
- [ ] conversation.updated_at 新消息时自动刷新

---

## Ticket 8: 文档预览 API & 用户管理

**要做什么：** 按页码返回文档 Markdown 内容；管理员用户 CRUD。

**阻塞：** Ticket 6

- [ ] GET /api/documents/{id}/preview?page=N：返回指定页码的 Markdown 内容
- [ ] GET/POST/DELETE /api/admin/users：管理员专用用户管理

---

## Ticket 9: 管理员仪表盘

**要做什么：** 聚合统计 API 供管理员仪表盘使用。

**阻塞：** Ticket 6（需要 messages 数据）

- [ ] GET /api/admin/dashboard：
  - 知识库总数
  - 文档总数 / 失败数
  - 切片总数
  - 总提问数
  - 近 7 天/30 天提问趋势（GROUP BY DATE）
  - 活跃知识库排行（按对话+消息数）
  - 存储用量（汇总 file_size）
