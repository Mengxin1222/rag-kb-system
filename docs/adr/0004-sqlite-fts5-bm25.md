# 使用 SQLite FTS5 实现 BM25 关键词检索

我们选择 SQLite FTS5 作为 BM25 全文检索引擎，与 ChromaDB 向量检索并行，通过 RRF 融合结果。

## Considered Options

- **whoosh** — 纯 Python 全文搜索库，功能完备但性能和并发不如 FTS5，且需要独立维护索引文件。
- **rank-bm25 内存索引** — 实现简单，但重启后需从数据库全量重建索引，不适合持久化场景。
- **Elasticsearch** — 企业级方案，但单独的 Java 服务违背了我们零外部依赖的设计目标。
- **SQLite FTS5（已选）** — 复用已有 SQLite 连接，零额外依赖。FTS5 内置 BM25 评分，支持实时增删，持久化于同一数据库文件。

## Consequences

- FTS5 虚拟表的 chunk 内容与应用表 chunks 保持同步：文档处理完毕后写入，删除文档时清理。
- BM25 和向量检索并行执行，各召回 K 条，RRF 融合后送入 Rerank。
- FTS5 中文分词需配置 tokenize 为 `unicode61 remove_diacritics 0`（不依赖分词器）或配合 jieba 分词后写入。
