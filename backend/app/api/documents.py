import os
import uuid
import hashlib
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, BackgroundTasks, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models import Document, Chunk, User, KnowledgeBase
from app.schemas.document import DocumentOut
from app.api.deps import get_current_user, get_admin_user
from app.services.pipeline import process_document
from app.services.finalize import finalize_document, cleanup_document_vectors

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXT = {"pdf", "docx", "pptx", "xlsx", "txt", "md"}


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    kb_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    background_tasks: BackgroundTasks = None,
    chunk_method: str | None = Form(None),
    chunk_heading_levels: str | None = Form(None),
    chunk_max_chars: int | None = Form(None),
    chunk_overlap: int | None = Form(None),
    chunk_separators: str | None = Form(None),
):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"不支持的文件格式: {ext}")

    kb_dir = os.path.join(settings.UPLOAD_DIR, str(kb_id))
    os.makedirs(kb_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(kb_dir, safe_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    has_override = any(
        v is not None
        for v in [chunk_method, chunk_heading_levels, chunk_max_chars, chunk_overlap, chunk_separators]
    )
    doc = Document(
        kb_id=kb_id,
        filename=file.filename,
        original_format=ext,
        file_path=file_path,
        file_size=len(content),
        status="pending",
        override_strategy=has_override,
        chunk_method=chunk_method,
        chunk_heading_levels=chunk_heading_levels,
        chunk_max_chars=chunk_max_chars,
        chunk_overlap=chunk_overlap,
        chunk_separators=chunk_separators,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(process_document, doc.id)

    return doc


@router.get("/{doc_id}/status", response_model=DocumentOut)
def get_status(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(kb_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Document).filter(Document.kb_id == kb_id).order_by(Document.created_at.desc()).all()


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
    background_tasks: BackgroundTasks = None,
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    # Gather ChromaDB ids and BM25 texts for cleanup
    chunks = db.query(Chunk).filter(Chunk.document_id == doc_id).all()
    chroma_ids = [c.chroma_id for c in chunks if c.chroma_id]
    chunk_texts = [c.content for c in chunks]

    # Clean up files
    for path in [doc.file_path, doc.md_path]:
        if path and os.path.exists(path):
            os.remove(path)

    kb_id = doc.kb_id
    db.delete(doc)
    db.commit()

    # Background cleanup of vectors
    if background_tasks and (chroma_ids or chunk_texts):
        background_tasks.add_task(cleanup_document_vectors, kb_id, chroma_ids, chunk_texts)


class DocumentStrategyUpdate(BaseModel):
    chunk_method: str | None = None
    chunk_heading_levels: str | None = None
    chunk_max_chars: int | None = None
    chunk_overlap: int | None = None
    chunk_separators: str | None = None


@router.put("/{doc_id}/strategy")
def update_document_strategy(
    doc_id: int,
    body: DocumentStrategyUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    if doc.status == "processing":
        raise HTTPException(status_code=400, detail="文档处理中，暂不可修改策略")

    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(doc, field, value)

    has_override = any(
        getattr(doc, f) is not None
        for f in ["chunk_method", "chunk_heading_levels", "chunk_max_chars", "chunk_overlap", "chunk_separators"]
    )
    doc.override_strategy = has_override
    db.commit()
    return {"status": "ok", "override_strategy": has_override}


@router.post("/{doc_id}/finalize")
def finalize(
    doc_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="文档尚未就绪，请等待处理完成")
    background_tasks.add_task(finalize_document, doc_id)
    return {"status": "finalizing"}


# --- Chunk Editor ---

class ChunkItem(BaseModel):
    id: int
    content: str
    char_start: int
    char_end: int
    char_count: int
    page_start: int | None = None
    page_end: int | None = None
    content_tags: str | None = None


class ChunksOut(BaseModel):
    document_id: int
    md_text: str
    chunks: List[ChunkItem]


class ChunkBoundary(BaseModel):
    id: int
    char_start: int
    char_end: int


class ChunksUpdate(BaseModel):
    chunks: List[ChunkBoundary]


@router.get("/{doc_id}/preview")
def preview_document(
    doc_id: int,
    page: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    if not doc.md_path or not os.path.exists(doc.md_path):
        raise HTTPException(status_code=400, detail="文档 Markdown 不可用")

    with open(doc.md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    if page is not None:
        import re
        pages = re.split(r"\[PAGE_(\d+)\]", md_text)
        found = ""
        for i in range(1, len(pages), 2):
            pn = int(pages[i])
            if pn == page:
                found = pages[i + 1] if i + 1 < len(pages) else ""
                break
        if not found:
            return {"document_id": doc.id, "page": page, "content": ""}
        return {"document_id": doc.id, "page": page, "content": found.strip()}

    return {"document_id": doc.id, "content": md_text}


@router.get("/{doc_id}/chunks", response_model=ChunksOut)
def get_chunks(doc_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    if not doc.md_path or not os.path.exists(doc.md_path):
        raise HTTPException(status_code=400, detail="文档 Markdown 不可用")

    with open(doc.md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    chunks = db.query(Chunk).filter(Chunk.document_id == doc_id).order_by(Chunk.char_start).all()

    return ChunksOut(
        document_id=doc.id,
        md_text=md_text,
        chunks=[
            ChunkItem(
                id=c.id,
                content=c.content,
                char_start=c.char_start,
                char_end=c.char_end,
                char_count=c.char_count,
                page_start=c.page_start,
                page_end=c.page_end,
                content_tags=c.content_tags,
            )
            for c in chunks
        ],
    )


@router.put("/{doc_id}/chunks")
def update_chunks(
    doc_id: int,
    body: ChunksUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    if not doc.md_path or not os.path.exists(doc.md_path):
        raise HTTPException(status_code=400, detail="文档 Markdown 不可用")

    with open(doc.md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    text_len = len(md_text)
    for bc in body.chunks:
        chunk = db.query(Chunk).filter(Chunk.id == bc.id, Chunk.document_id == doc_id).first()
        if not chunk:
            continue
        if bc.char_start < 0 or bc.char_end > text_len:
            raise HTTPException(status_code=400, detail=f"Chunk {bc.id} 边界超出文档范围")
        if bc.char_start >= bc.char_end:
            raise HTTPException(status_code=400, detail=f"Chunk {bc.id} 起始位置必须小于结束位置")
        new_content = md_text[bc.char_start:bc.char_end]
        if not new_content.strip():
            raise HTTPException(status_code=400, detail=f"Chunk {bc.id} 内容不能为空")
        chunk.char_start = bc.char_start
        chunk.char_end = bc.char_end
        chunk.content = new_content
        chunk.char_count = len(new_content)
        chunk.content_hash = hashlib.md5(new_content.encode("utf-8")).hexdigest()
        chunk.embedding_status = "pending"

    # Validate no overlapping chunks
    sorted_boundaries = sorted(body.chunks, key=lambda x: x.char_start)
    for i in range(len(sorted_boundaries) - 1):
        if sorted_boundaries[i].char_end > sorted_boundaries[i + 1].char_start:
            raise HTTPException(
                status_code=400,
                detail=f"Chunk {sorted_boundaries[i].id} 与 Chunk {sorted_boundaries[i+1].id} 边界重叠",
            )

    db.commit()

    return {"updated": len(body.chunks)}


@router.post("/{doc_id}/chunks/confirm")
def confirm_chunks(
    doc_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    doc.chunks_reviewed = True
    db.commit()
    return {"status": "confirmed"}
