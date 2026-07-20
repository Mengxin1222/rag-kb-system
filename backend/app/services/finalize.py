"""Finalize pipeline: embed + ChromaDB + BM25 indexing."""
import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Document, Chunk
from app.services.embedding import embed_texts
from app.services.chroma import create_collection, get_collection_name, get_chroma_client, delete_chunks_from_collection
from app.services.bm25 import index_chunks_bm25, delete_chunks_bm25, init_bm25


def finalize_document(doc_id: int):
    db = SessionLocal()
    try:
        init_bm25(db)

        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc or doc.status != "ready":
            return

        doc.status = "processing"
        db.commit()

        kb_id = doc.kb_id

        # Get all chunks for this document
        chunks = db.query(Chunk).filter(
            Chunk.document_id == doc_id,
            Chunk.embedding_status == "pending"
        ).all()
        if not chunks:
            doc.status = "ready"
            doc.chunks_reviewed = True
            db.commit()
            return

        texts = [c.content for c in chunks]

        # Embedding
        vectors = _run_async(embed_texts(texts))

        # ChromaDB
        collection = create_collection(kb_id)
        chroma_ids = [f"d{doc_id}_c{c.id}" for c in chunks]
        collection.add(
            ids=chroma_ids,
            embeddings=vectors,
            documents=texts,
            metadatas=[{"document_id": doc_id, "kb_id": kb_id, "page": c.page_start} for c in chunks],
        )

        # Update chunk records with chroma_id
        for c, cid in zip(chunks, chroma_ids):
            c.chroma_id = cid
            c.embedding_status = "embedded"

        # BM25 index
        index_chunks_bm25(db, kb_id, [(cid, text) for cid, text in zip(chroma_ids, texts)])

        doc.status = "ready"
        doc.chunks_reviewed = True
        db.commit()

    except Exception as e:
        db.rollback()
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = "failed"
            doc.error_message = f"Embedding 失败: {str(e)}"
            db.commit()
    finally:
        db.close()


def cleanup_document_vectors(kb_id: int, chroma_ids: list[str], chunk_texts: list[str]):
    """Clean up ChromaDB vectors and BM25 entries for deleted document."""
    db = SessionLocal()
    try:
        delete_chunks_from_collection(kb_id, chroma_ids)
        delete_chunks_bm25(db, kb_id, chunk_texts)
    finally:
        db.close()


def _run_async(coro):
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    else:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
