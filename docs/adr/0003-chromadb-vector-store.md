# 使用 ChromaDB 作为向量存储

我们选择 ChromaDB 作为向量数据库，而非 PostgreSQL + pgvector。应用层的用户、知识库元数据、对话历史等关系型数据使用 SQLite。

## Considered Options

- **PostgreSQL + pgvector** — 统一存储，一次查询即可关联向量和元数据。但需要单独部署和管理 PostgreSQL，运维成本高。
- **ChromaDB + SQLite** — 向量检索和关系型数据分离存储。ChromaDB 零配置，Python 原生集成，作为嵌入进程运行的轻量方案。SQLite 同样零配置。两者都不需要额外服务。

## Consequences

- 向量数据与关系型数据分属两个存储系统，无法跨库 JOIN 查询。
- 但 RAG 场景中向量检索和元数据查询本就分属不同流程，实际影响很小。
- 部署简单：无需安装任何外部数据库服务。
