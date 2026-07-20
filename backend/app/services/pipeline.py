import os
import uuid
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.config import settings
from app.models import Document, Chunk, KnowledgeBase
from app.services.mineru import convert_to_markdown
from app.services.chunking import chunk_document, get_chunking_strategy


def process_document(doc_id: int):
    """Run the full document processing pipeline in background."""
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return

        doc.status = "processing"
        db.commit()

        kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == doc.kb_id).first()

        # Step 1: MinerU conversion (non-MD formats)
        if doc.original_format != "md":
            try:
                md_text = _run_sync(convert_to_markdown(doc.file_path, doc.original_format))
                md_dir = os.path.join(settings.UPLOAD_DIR, "md", str(doc.kb_id))
                os.makedirs(md_dir, exist_ok=True)
                md_filename = f"{uuid.uuid4().hex}.md"
                md_path = os.path.join(md_dir, md_filename)
                with open(md_path, "w", encoding="utf-8") as f:
                    f.write(md_text)
                doc.md_path = md_path
                db.commit()
            except Exception as e:
                doc.status = "failed"
                doc.error_message = f"MinerU 转换失败: {str(e)}"
                db.commit()
                return
        else:
            with open(doc.file_path, "r", encoding="utf-8") as f:
                md_text = f.read()
            doc.md_path = doc.file_path

        # Step 2: Chunking
        strategy = get_chunking_strategy(doc, kb)
        chunks_data = chunk_document(md_text, strategy)

        for cd in chunks_data:
            chunk = Chunk(
                document_id=doc.id,
                content=cd["content"],
                content_hash=cd["content_hash"],
                char_count=cd["char_count"],
                char_start=cd["char_start"],
                char_end=cd["char_end"],
                page_start=cd.get("page"),
                page_end=cd.get("page"),
                embedding_status="pending",
                content_tags=cd.get("content_tags"),
            )
            db.add(chunk)

        doc.chunk_count = len(chunks_data)
        doc.status = "ready"
        db.commit()

    except Exception as e:
        db.rollback()
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = "failed"
            doc.error_message = str(e)
            db.commit()
    finally:
        db.close()


def _run_sync(coro):
    import asyncio
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    else:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, coro)
            return future.result()
