# RAG 知识库问答系统

基于 RAG（Retrieval-Augmented Generation）技术的通用知识库问答系统。支持多知识库隔离、混合检索（向量 + BM25 + RRF + Rerank）、SSE 流式问答、上下文压缩，以及完整的文档管理 Pipeline。

## 技术栈

| 层 | 选型 |
|---|---|
| 后端框架 | Python FastAPI |
| 应用数据库 | SQLite (SQLAlchemy ORM) |
| 向量数据库 | ChromaDB |
| BM25 引擎 | SQLite FTS5 + jieba 分词 |
| LLM | DeepSeek API |
| Embedding | 阿里云 Embedding API |
| Rerank | 阿里云 Rerank API |
| 文档解析 | MinerU API |
| 前端框架 | React + TypeScript + Ant Design 5 (开发中) |

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+ (前端)

### 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 配置环境变量

在 `backend/` 目录创建 `.env` 文件：

```env
# 数据库
DATABASE_URL=sqlite:///./data/app.db
CHROMA_PERSIST_DIR=./data/chroma

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_EXPIRE_MINUTES=60

# 管理员种子账号
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=admin123

# API Keys（可选，无 API 时使用零向量降级）
LLM_API_URL=https://api.deepseek.com/v1/chat/completions
LLM_API_KEY=your-deepseek-key
EMBEDDING_API_URL=your-embedding-api-url
EMBEDDING_API_KEY=your-embedding-key
RERANK_API_URL=your-rerank-api-url
RERANK_API_KEY=your-rerank-key
MINERU_API_URL=your-mineru-api-url
MINERU_API_KEY=your-mineru-key
```

### 初始化数据库并启动

```bash
cd backend

# 初始化数据库 + 创建管理员账号
python seed.py

# 启动开发服务器
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

服务启动后访问 `http://127.0.0.1:8000/docs` 查看 Swagger API 文档。

## 项目结构

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库连接
│   │   ├── models/              # ORM 模型 (User, KB, Document, Chunk, Conversation, Message)
│   │   ├── schemas/             # Pydantic 请求/响应模式
│   │   ├── api/                 # 路由处理器
│   │   │   ├── auth.py          # 认证 (JWT)
│   │   │   ├── kb.py            # 知识库 CRUD + Chunk 搜索
│   │   │   ├── documents.py     # 文档上传/管理/切片编辑
│   │   │   ├── chat.py          # 对话 + SSE 流式问答
│   │   │   └── admin.py         # 用户管理 + 仪表盘
│   │   ├── services/            # 业务逻辑
│   │   │   ├── auth.py          # bcrypt + JWT
│   │   │   ├── mineru.py        # MinerU 文档转换
│   │   │   ├── chunking.py      # 切片引擎 (heading/character/semantic)
│   │   │   ├── pipeline.py      # 文档处理管道
│   │   │   ├── embedding.py     # Embedding API
│   │   │   ├── chroma.py        # ChromaDB 向量存储
│   │   │   ├── bm25.py          # SQLite FTS5 BM25 索引
│   │   │   ├── finalize.py      # Embedding + 索引 finalize 管道
│   │   │   ├── retrieval.py     # 混合检索 + RRF + Rerank + Chunk 搜索
│   │   │   ├── rerank.py        # Rerank API
│   │   │   ├── llm.py           # DeepSeek 流式 LLM
│   │   │   └── compression.py   # 上下文压缩
│   │   └── utils/
│   ├── seed.py                  # 种子脚本
│   ├── requirements.txt
│   └── test_ticket*.py          # 集成测试
├── docs/
│   ├── architecture-overview.md # 架构总览
│   ├── database-design.md       # 数据库设计
│   ├── frontend-spec.md         # 前端规格文档
│   └── adr/                     # 架构决策记录
├── CONTEXT.md                   # 领域术语表
├── tickets.md                   # 开发 tickets
└── .gitignore
```

## 核心功能

### 知识库管理
- 创建/编辑/删除知识库，支持 14+ 项可配置参数
- 三种切片策略：标题分割、字符分割、语义分割
- 围栏代码块原子保护，超限代码块 AST 按函数切分
- 文档级策略覆盖 (PUT /api/documents/{id}/strategy)
- Chunk 内容类型自动检测 (code / link / image)

### 检索与问答
- 混合检索：向量 (ChromaDB) + BM25 (FTS5 + jieba)
- RRF 融合常数可配，向量/BM25 各自独立 Top-K
- 阿里云 Rerank API 精排
- SSE 流式输出，打字机逐字渲染
- 回答带引用来源（文档名 + 页码）
- 对话历史上下文压缩（超限自动摘要）
- 连接中断时自动保存部分回答

### Chunk 搜索
- 支持跨知识库多选搜索
- 三种检索方式：BM25 关键词 / 向量语义 / 混合
- 返回文档名、页码、内容标签、匹配分数
- 可点击查看 Markdown 全文

### 管理功能
- 用户管理：创建/删除用户，支持管理员和普通用户角色
- 仪表盘：知识库/文档/查询统计 + 7天趋势 + 活跃排行

## API 总览

| 模块 | 前缀 | 关键端点 |
|---|---|---|
| 认证 | `/api/auth` | POST /login, /refresh |
| 知识库 | `/api/kb` | CRUD, GET /search (多KB搜索) |
| 文档 | `/api/documents` | POST /upload, GET /{id}/preview, PUT /{id}/strategy, GET /{id}/chunks, POST /{id}/finalize |
| 对话 | `/api/conversations` | POST /create, GET /list, GET /{id}/messages, DELETE /{id} |
| 问答 | `/api/chat` | POST /send (SSE) |
| 管理 | `/api/admin` | GET /dashboard, POST /users, DELETE /users/{id} |

## License

MIT
