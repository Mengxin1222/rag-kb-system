# 数据库设计

应用数据库使用 SQLite，向量库使用 ChromaDB。以下是应用层关系型数据库的表结构。

## ER 关系

```
User ──1:N──> Conversation
User ──1:N──> KnowledgeBase (Admin only)
KnowledgeBase ──1:N──> Document
KnowledgeBase ──1:N──> Conversation
Document ──1:N──> Chunk (metadata only; content in ChromaDB)
Conversation ──1:N──> Message
```

## 表结构

### users

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 主键 |
| username | TEXT UNIQUE NOT NULL | 用户名 |
| password_hash | TEXT NOT NULL | 密码哈希 |
| role | TEXT NOT NULL DEFAULT 'user' | 角色：admin / user |
| created_at | DATETIME NOT NULL | 创建时间 |

### knowledge_bases

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 主键 |
| name | TEXT NOT NULL | 知识库名称 |
| description | TEXT | 描述 |
| admin_id | INTEGER FK → users | 创建者 |
| chunk_method | TEXT NOT NULL DEFAULT 'heading' | heading / character / semantic |
| chunk_heading_levels | TEXT NOT NULL DEFAULT '2' | 按哪级标题切，逗号分隔如 '2,3' |
| chunk_max_chars | INTEGER NOT NULL DEFAULT 1000 | 最大字符数 |
| chunk_overlap | INTEGER NOT NULL DEFAULT 0 | 重叠字符数 |
| chunk_separators | TEXT NOT NULL DEFAULT '["\\n\\n","\\n","。","!","？","?","；",";",""]' | 递归切割分隔符，按优先级排列，空字符串 = 字符级兜底 |
| retrieval_top_k | INTEGER NOT NULL DEFAULT 20 | 向量检索召回数 |
| bm25_top_k | INTEGER NOT NULL DEFAULT 20 | BM25 关键词检索召回数 |
| rerank_top_n | INTEGER NOT NULL DEFAULT 5 | Rerank 后保留数 |
| rrf_k | INTEGER NOT NULL DEFAULT 60 | RRF 融合常数 |
| conversation_max_rounds | INTEGER NOT NULL DEFAULT 10 | 对话最大轮数 |
| context_compression | BOOLEAN NOT NULL DEFAULT 1 | 上下文压缩开关 |
| system_prompt | TEXT NOT NULL | 系统提示词 |
| llm_model | TEXT NOT NULL DEFAULT 'deepseek-chat' | LLM 模型名 |
| llm_temperature | REAL NOT NULL DEFAULT 0.7 | LLM temperature |
| embedding_model | TEXT NOT NULL DEFAULT 'text-embedding-v3' | Embedding 模型名 |
| rerank_model | TEXT NOT NULL DEFAULT 'gte-rerank' | Rerank 模型名 |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

### documents

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 主键 |
| kb_id | INTEGER FK → knowledge_bases | 所属知识库 |
| filename | TEXT NOT NULL | 原始文件名 |
| original_format | TEXT NOT NULL | 原始格式：pdf / docx / pptx / xlsx / txt / md |
| file_path | TEXT NOT NULL | 原始文件存储路径 |
| md_path | TEXT | MinerU 转换后 Markdown 路径 |
| file_size | INTEGER | 文件大小（字节） |
| status | TEXT NOT NULL DEFAULT 'pending' | pending / processing / ready / failed |
| chunks_reviewed | BOOLEAN DEFAULT 0 | 管理员是否已确认切片边界 |
| error_message | TEXT | 失败原因 |
| chunk_count | INTEGER DEFAULT 0 | 切片数量 |
| override_strategy | BOOLEAN DEFAULT 0 | 是否覆盖知识库默认切片策略 |
| chunk_method | TEXT | 覆盖值 |
| chunk_heading_levels | TEXT | 覆盖值 |
| chunk_max_chars | INTEGER | 覆盖值 |
| chunk_overlap | INTEGER | 覆盖值 |
| chunk_separators | TEXT | 覆盖值 |
| created_at | DATETIME NOT NULL | 上传时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

### conversations

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 主键 |
| kb_id | INTEGER FK → knowledge_bases | 所属知识库 |
| user_id | INTEGER FK → users | 提问用户 |
| title | TEXT | 对话标题（自动生成或首条提问截取） |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 最后活跃时间 |

### messages

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 主键 |
| conversation_id | INTEGER FK → conversations | 所属对话 |
| role | TEXT NOT NULL | user / assistant |
| content | TEXT NOT NULL | 消息内容 |
| sources | TEXT | 引用来源，JSON 格式 [{"document": "...", "page": 1, "chunk_text": "..."}] |
| created_at | DATETIME NOT NULL | 发送时间 |

### chunks (元数据)

ChromaDB 存储向量和完整文本，此表仅存储元数据用于关联和清理。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 主键 |
| document_id | INTEGER FK → documents | 所属文档 |
| chroma_id | TEXT | ChromaDB 中的 chunk id（embedding 后填充） |
| content_hash | TEXT NOT NULL | 内容哈希，用于去重 |
| content | TEXT NOT NULL | 切片文本内容 |
| char_count | INTEGER | 切片字符数 |
| char_start | INTEGER NOT NULL | 在文档 MD 中的起始字符位置 |
| char_end | INTEGER NOT NULL | 在文档 MD 中的结束字符位置 |
| page_start | INTEGER | 起始页码 |
| page_end | INTEGER | 结束页码 |
| embedding_status | TEXT NOT NULL DEFAULT 'pending' | pending / embedded |
| content_tags | TEXT | JSON 数组，内容类型标签 ["code","link","image"] |
| created_at | DATETIME NOT NULL | 创建时间 |

## 索引

```sql
CREATE INDEX idx_kb_admin ON knowledge_bases(admin_id);
CREATE INDEX idx_doc_kb ON documents(kb_id);
CREATE INDEX idx_doc_status ON documents(status);
CREATE INDEX idx_conv_kb ON conversations(kb_id);
CREATE INDEX idx_conv_user ON conversations(user_id);
CREATE INDEX idx_msg_conv ON messages(conversation_id);
CREATE INDEX idx_chunk_doc ON chunks(document_id);
```

## BM25 索引（SQLite FTS5）

每个知识库的文档处理完成后，chunk 文本同步写入 FTS5 虚拟表，删除文档时清理。

```sql
CREATE VIRTUAL TABLE bm25_index USING fts5(
    kb_id,
    document_id,
    chunk_text,
    content='chunks',
    content_rowid='id'
);
```

## 默认系统提示词

```
你是一个专业的知识库问答助手。请根据以下从知识库中检索到的上下文内容回答用户的问题。
每个上下文片段标注了来源（文档名、页码）。
要求：
1. 仅基于提供的上下文内容作答，不要编造信息。
2. 如果上下文不足以回答问题，请明确告知用户"知识库中未找到相关信息"。
3. 在回答中使用 [文档名 第X页] 标注引用来源，例如 [产品手册.pdf 第3页]。
4. 使用与用户提问相同的语言回答。
5. 回答简洁、准确、有条理。
```

## 仪表盘统计

管理员首页展示全局数据：

| 指标 | 数据来源 |
|---|---|
| 知识库总数 | `SELECT COUNT(*) FROM knowledge_bases` |
| 文档总数 / 失败数 | `SELECT COUNT(\*), SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) FROM documents` |
| 切片总数 | `SELECT COUNT(*) FROM chunks` |
| 总提问数 | `SELECT COUNT(*) FROM messages WHERE role='user'` |
| 近 7 天提问趋势 | `SELECT DATE(created_at) d, COUNT(\*) FROM messages WHERE role='user' AND created_at >= date('now','-7 days') GROUP BY d` |
| 活跃知识库排行 | `SELECT kb_id, COUNT(\*) cnt FROM conversations JOIN messages ... GROUP BY kb_id ORDER BY cnt DESC` |
| 存储用量 | 文件系统 `documents.file_size` 汇总 + `files/` 目录真实占用 |
