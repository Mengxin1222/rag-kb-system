# 系统架构总览

基于 RAG 技术的通用知识库问答系统 —— 全文 domain-modeling + grilling 访谈产物，累计 43 个架构决策。

---

## 1. 技术栈

| 层 | 选型 |
|---|---|
| 前端框架 | React + TypeScript |
| 前端组件库 | Ant Design |
| 后端框架 | Python FastAPI |
| 应用数据库 | SQLite |
| 向量数据库 | ChromaDB |
| BM25 引擎 | SQLite FTS5 |
| LLM | DeepSeek API（deepseek-chat） |
| Embedding | 阿里 Embedding API |
| Rerank | 阿里 Rerank API |
| 文档解析 | MinerU API（非 Markdown → Markdown） |
| 异步任务 | FastAPI BackgroundTasks |
| 认证 | JWT Token |
| 响应输出 | SSE 流式 |

---

## 2. 领域模型

详见 [CONTEXT.md](../CONTEXT.md)，共 12 个核心术语：

| 术语 | 英文 | 一句话定义 |
|---|---|---|
| 知识库 | Knowledge Base | 隔离的文档集合，独立向量索引 |
| 文档 | Document | 上传的文件，PDF/Word/PPT/Excel/TXT/MD |
| 切片 | Chunk | 文档按策略分割后的检索单元，含内容类型标签（code/link/image） |
| 切片策略 | Chunking Strategy | 分割规则：方法（heading/character/semantic）、标题层级、最大字符、重叠 |
| 管理员 | Admin | 创建知识库、上传/管理文档 |
| 用户 | User | 浏览知识库、提问（只读） |
| 提问 | Query | 用户针对知识库提出的问题 |
| 回答 | Answer | LLM 基于检索 Chunk 生成的回复 |
| 对话 | Conversation | 知识库内的多轮问答线程 |
| 上下文压缩 | Context Compression | 历史过长时压缩早期轮次 |
| 检索 | Retrieval | BM25 + 向量混合检索，各自独立 Top-K，RRF 融合后 Rerank |
| 重排序 | Rerank | 检索结果精排取 Top-N |
| 管道 | Pipeline | MinerU 转换 → 切片 → Embedding → 入库 |

---

## 3. 前端页面

| 页面 | 角色 | 功能 |
|---|---|---|
| 登录页 | 所有人 | JWT 登录，返回 token + role |
| 问答页 | User + Admin | 选择知识库 → 新建/继续对话 → SSE 流式问答，引用卡片展示来源 |
| 知识库管理 | Admin | 创建/编辑/删除 KB，配置全部策略参数，上传文档 + 切片编辑器 |
| 仪表盘 | Admin | 统计概览 + 7天趋势图 + 活跃排行 |
| 用户管理 | Admin | 新建/删除用户，可指定 admin 或 user 角色 |

---

## 4. API 设计

| 模块 | 路径前缀 | 主要端点 |
|---|---|---|
| 认证 | `/api/auth` | POST `/login`, POST `/refresh` |
| 知识库 | `/api/kb` | CRUD，GET `/list`, POST `/create`, PUT `/{id}`, DELETE `/{id}` |
| 文档 | `/api/documents` | POST `/upload`（支持上传时指定切片策略）, GET `/{id}/status`, DELETE `/{id}`, GET `/preview/{id}?page=N`, PUT `/{id}/strategy`（文档级策略覆盖） |
| 切片 | `/api/documents` | GET `/{id}/chunks`（含 content_tags）, PUT `/{id}/chunks` (保存拖拽调整后的边界), POST `/{id}/finalize` (确认切片 → 触发 Embedding) |
| 对话 | `/api/conversations` | GET `/list`, POST `/create`, GET `/{id}/messages`, DELETE `/{id}` |
| 问答 | `/api/chat` | POST `/send`（SSE 流式返回） |
| 管理员 | `/api/admin` | GET `/dashboard`, POST `/users`, DELETE `/users/{id}` |

---

## 5. 数据库设计

详见 [database-design.md](database-design.md)，6 张表 + 1 个 FTS5 虚拟表：

```
User ──1:N──> Conversation
User ──1:N──> KnowledgeBase (Admin only)
KnowledgeBase ──1:N──> Document
KnowledgeBase ──1:N──> Conversation
Document ──1:N──> Chunk (元数据; 向量在 ChromaDB)
Conversation ──1:N──> Message
```

---

## 6. 检索流程

```
用户提问
  │
  ├──→ Embedding（阿里 API）
  │       │
  │       └──→ ChromaDB 向量检索 Top-K
  │
  ├──→ BM25 关键词检索（SQLite FTS5）Top-K
  │
  └──→ RRF 融合去重
          │
          └──→ 阿里 Rerank API 精排 Top-N
                  │
                  └──→ 拼接上下文 + System Prompt + 对话历史
                          │
                          └──→ DeepSeek LLM 流式生成回答
                                  │
                                  └──→ 返回 SSE + 引用来源（文档名 + 页码）
```

---

## 7. 文档处理管道

```
上传文档
  │
  ├── 格式判断
  │     ├── Markdown (.md) ──→ 跳过转换
  │     └── 其他格式 ──→ MinerU API → Markdown（保留页码标记）
  │                    Status: pending → processing
  │
  └──→ 自动切片（应用 KB 默认或 Document 覆盖的策略）
          │
          ├── 第一步：按指定 Markdown 标题层级切分
          └── 超限部分按可配置的分隔符顺序递归切分
          │
          ├── Status: ready（切片为草稿状态，待管理员确认）
          │
          ├──（可选）管理员打开切片编辑器
          │     ├── 左侧：Markdown 渲染预览 + Chunk 边界可视化
          │     ├── 右侧：Chunk 列表，每个 Chunk 显示内容和起始位置
          │     ├── 拖拽边界线调整 Chunk 范围
          │     ├── 合并相邻 Chunk / 拆分 Chunk
          │     └── 保存 → 更新 Chunk 元数据
          │
          └──→ 管理员确认切片 / 跳过直接确认
                │
                ├── Embedding（阿里 API）
                ├── ChromaDB 入库
                ├── SQLite FTS5 写入（BM25 索引）
                └── chunks_finalized = 1
```

---

## 8. 可配置项汇总

| 配置项 | 级别 | 默认值 |
|---|---|---|
| 切片方法 | KB → Document 覆盖 | heading（heading / character / semantic） |
| 切片标题层级 | KB → Document 覆盖 | 2（如 1,2,3） |
| 切片最大字符 | KB → Document 覆盖 | 1000 |
| 切片 overlap | KB → Document 覆盖 | 0 |
| 切片分隔符（递归顺序） | KB → Document 覆盖 | `\n\n → \n → 。→ . → ！→ ? → ；→ ; → 字符` |
| 向量检索 Top-K | KB | 20 |
| BM25 检索 Top-K | KB | 20 |
| RRF 融合常数 K | KB | 60 |
| Rerank Top-N | KB | 5 |
| 对话最大轮数 | KB | 10 |
| 上下文压缩 | KB | 开启 |
| System Prompt | KB | 见默认模板 |
| LLM 模型 | KB | deepseek-chat |
| LLM Temperature | KB | 0.7 |
| Embedding 模型 | KB | text-embedding-v3 |
| Rerank 模型 | KB | gte-rerank |

---

## 9. 架构决策记录（ADR）

| 编号 | 决策 | 文件 |
|---|---|---|
| ADR-0001 | 使用 MinerU 统一文档解析管道 | [0001-mineru-pipeline.md](adr/0001-mineru-pipeline.md) |
| ADR-0002 | 多知识库物理隔离检索 | [0002-multi-knowledge-base-isolation.md](adr/0002-multi-knowledge-base-isolation.md) |
| ADR-0003 | ChromaDB 作为向量存储 + SQLite 作应用库 | [0003-chromadb-vector-store.md](adr/0003-chromadb-vector-store.md) |
| ADR-0004 | SQLite FTS5 实现 BM25 关键词检索 | [0004-sqlite-fts5-bm25.md](adr/0004-sqlite-fts5-bm25.md) |
