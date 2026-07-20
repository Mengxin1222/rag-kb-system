import hashlib
from typing import List
from sqlalchemy import text as sa_text
from sqlalchemy.orm import Session

from app.services.chroma import get_chroma_client, get_collection_name
from app.services.embedding import embed_texts
from app.services.rerank import rerank


def search_chunks(
    db: Session,
    kb_id: int,
    query: str,
    method: str = "hybrid",
    top_n: int = 20,
) -> list[dict]:
    """
    Search chunks in a KB by keyword, vector, or hybrid.
    Returns enriched results with document filenames.
    """
    from app.models import Document

    if method == "bm25":
        results = _bm25_only(db, kb_id, query, top_n)
    elif method == "vector":
        results = _vector_only(kb_id, query, top_n)
    else:
        results = _hybrid_no_rerank(db, kb_id, query, top_n)

    # Enrich with document metadata
    chunk_texts = set(r["content"] for r in results)
    if not chunk_texts:
        return []

    # Lookup chunk+document info from DB
    from app.models import Chunk
    rows = (
        db.query(Chunk.content, Chunk.document_id, Chunk.page_start, Document.filename)
        .join(Document, Chunk.document_id == Document.id)
        .filter(Document.kb_id == kb_id, Chunk.content.in_(chunk_texts))
        .all()
    )
    lookup: dict[str, tuple] = {}
    for row in rows:
        lookup[row[0]] = (row[1], row[2], row[3])

    enriched = []
    for r in results:
        doc_id, page, doc_name = lookup.get(r["content"], (None, r.get("page"), ""))
        enriched.append({
            "content": r["content"],
            "score": round(r["score"], 4),
            "document_id": doc_id,
            "document_name": doc_name or "",
            "page": page,
            "source": r.get("source", method),
        })
    return enriched


def _bm25_only(db: Session, kb_id: int, query: str, top_n: int) -> list[dict]:
    from app.services.bm25 import init_bm25
    init_bm25(db)
    rows = db.execute(
        sa_text(
            "SELECT chunk_text, rank FROM bm25_fts "
            "WHERE bm25_fts MATCH :query AND kb_id = :kb_id "
            "ORDER BY rank LIMIT :limit"
        ),
        {"query": query, "kb_id": kb_id, "limit": top_n},
    ).fetchall()
    return [
        {"content": row[0], "score": 1.0 / (1 + i), "source": "bm25", "page": None}
        for i, row in enumerate(rows)
    ]


def _vector_only(kb_id: int, query: str, top_n: int) -> list[dict]:
    vectors = _run_async(embed_texts([query]))
    query_vector = vectors[0] if vectors else None
    if not query_vector:
        return []
    try:
        collection = get_chroma_client().get_collection(name=get_collection_name(kb_id))
        vr = collection.query(query_embeddings=[query_vector], n_results=top_n)
        results = []
        for i in range(len(vr.get("ids", [[]])[0])):
            results.append({
                "content": vr["documents"][0][i] if vr.get("documents") else "",
                "score": float(vr["distances"][0][i]) if vr.get("distances") else 0.0,
                "source": "vector",
                "page": (vr.get("metadatas", [[]])[0][i] or {}).get("page") if vr.get("metadatas") else None,
            })
        return results
    except Exception:
        return []


def _hybrid_no_rerank(db: Session, kb_id: int, query: str, top_n: int) -> list[dict]:
    vectors = _run_async(embed_texts([query]))
    query_vector = vectors[0] if vectors else None

    vector_results = []
    if query_vector:
        try:
            collection = get_chroma_client().get_collection(name=get_collection_name(kb_id))
            vr = collection.query(query_embeddings=[query_vector], n_results=top_n)
            for i in range(len(vr.get("ids", [[]])[0])):
                vector_results.append({
                    "id": vr["ids"][0][i],
                    "content": vr["documents"][0][i] if vr.get("documents") else "",
                    "score": float(vr["distances"][0][i]) if vr.get("distances") else 0.0,
                    "source": "vector",
                    "page": (vr.get("metadatas", [[]])[0][i] or {}).get("page") if vr.get("metadatas") else None,
                })
        except Exception:
            pass

    rows = db.execute(
        sa_text(
            "SELECT chunk_text, rank FROM bm25_fts "
            "WHERE bm25_fts MATCH :query AND kb_id = :kb_id "
            "ORDER BY rank LIMIT :limit"
        ),
        {"query": query, "kb_id": kb_id, "limit": top_n},
    ).fetchall()
    bm25_results = []
    for row in rows:
        bm25_results.append({
            "id": f"bm25_{hashlib.md5(row[0].encode('utf-8')).hexdigest()[:12]}",
            "content": row[0],
            "score": 0.0,
            "source": "bm25",
            "page": None,
        })

    fused = _rrf_fuse(vector_results, bm25_results, k=60)
    return [{"content": r["content"], "score": r["score"], "source": "hybrid", "page": r.get("page")}
            for r in fused[:top_n]]


def hybrid_retrieve(
    db: Session,
    kb_id: int,
    query: str,
    top_k: int = 20,
    bm25_top_k: int = 20,
    rerank_top_n: int = 5,
    rrf_k: int = 60,
) -> list[dict]:
    """
    Hybrid retrieval pipeline:
    1. Embed query → ChromaDB vector search
    2. BM25 keyword search (FTS5)
    3. RRF fusion
    4. Rerank
    Returns list of {"content": str, "document": str, "page": int, "score": float}
    """

    # Step 1: Query embedding
    vectors = _run_async(embed_texts([query]))
    query_vector = vectors[0] if vectors else None

    # Step 2: Vector search
    vector_results = []
    if query_vector:
        try:
            collection = get_chroma_client().get_collection(name=get_collection_name(kb_id))
            vr = collection.query(query_embeddings=[query_vector], n_results=top_k)
            for i in range(len(vr.get("ids", [[]])[0])):
                vector_results.append({
                    "id": vr["ids"][0][i],
                    "content": vr["documents"][0][i] if vr.get("documents") else "",
                    "score": float(vr["distances"][0][i]) if vr.get("distances") else 0.0,
                    "source": "vector",
                    "page": (vr.get("metadatas", [[]])[0][i] or {}).get("page") if vr.get("metadatas") else None,
                })
        except Exception:
            pass

    # Step 3: BM25 search
    bm25_results = []
    try:
        rows = db.execute(
            sa_text(
                "SELECT chunk_text, rank FROM bm25_fts WHERE bm25_fts MATCH :query AND kb_id = :kb_id ORDER BY rank LIMIT :limit"
            ),
            {"query": query, "kb_id": kb_id, "limit": bm25_top_k},
        ).fetchall()
        for row in rows:
            bm25_results.append({
                "id": f"bm25_{hashlib.md5(row[0].encode('utf-8')).hexdigest()[:12]}",
                "content": row[0],
                "score": 0.0,
                "source": "bm25",
                "page": None,
            })
    except Exception:
        pass

    # Step 4: RRF fusion
    fused = _rrf_fuse(vector_results, bm25_results, k=rrf_k)

    # Step 5: Rerank
    documents = [r["content"] for r in fused[:rerank_top_n * 2]]
    if documents:
        reranked = _run_async(rerank(query, documents, rerank_top_n))
        results = []
        for rr in reranked:
            idx = rr.get("index", 0)
            if idx < len(documents):
                results.append({
                    "content": documents[idx],
                    "document": "",
                    "page": fused[idx].get("page") if idx < len(fused) else None,
                    "score": rr.get("score", 0.0),
                })
        return results

    # Fallback: return top fused results
    return [{"content": r["content"], "document": "", "page": r.get("page"), "score": r["score"]}
            for r in fused[:rerank_top_n]]


def _rrf_fuse(
    vec_results: list[dict],
    bm25_results: list[dict],
    k: int = 60,
) -> list[dict]:
    scores: dict[str, float] = {}
    pages: dict[str, int | None] = {}

    for rank, item in enumerate(vec_results):
        key = item["content"]
        scores[key] = scores.get(key, 0) + 1.0 / (k + rank + 1)
        if key not in pages and item.get("page"):
            pages[key] = item["page"]

    for rank, item in enumerate(bm25_results):
        key = item["content"]
        scores[key] = scores.get(key, 0) + 1.0 / (k + rank + 1)
        if key not in pages and item.get("page"):
            pages[key] = item["page"]

    sorted_items = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [
        {"content": key, "score": score, "page": pages.get(key)}
        for key, score in sorted_items
    ]


def _run_async(coro):
    import asyncio
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    else:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
