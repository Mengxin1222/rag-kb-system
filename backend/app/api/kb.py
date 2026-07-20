from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import KnowledgeBase, User
from app.schemas.knowledge_base import (
    KnowledgeBaseCreate, KnowledgeBaseUpdate,
    KnowledgeBaseOut, KnowledgeBaseListOut,
)
from app.api.deps import get_current_user, get_admin_user
from app.services.chroma import delete_collection
from app.services.bm25 import delete_kb_bm25
from app.services.retrieval import search_chunks

router = APIRouter(prefix="/api/kb", tags=["knowledge_bases"])


@router.get("", response_model=list[KnowledgeBaseListOut])
def list_kb(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(KnowledgeBase).all()


@router.post("", response_model=KnowledgeBaseOut, status_code=status.HTTP_201_CREATED)
def create_kb(
    kb_in: KnowledgeBaseCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    kb_data = {"name": kb_in.name, "description": kb_in.description or "", "admin_id": admin.id}
    strategy_fields = [
        "chunk_method", "chunk_heading_levels", "chunk_max_chars", "chunk_overlap",
        "chunk_separators", "retrieval_top_k", "bm25_top_k", "rerank_top_n", "rrf_k",
        "conversation_max_rounds", "context_compression", "system_prompt",
        "llm_model", "llm_temperature", "embedding_model", "rerank_model",
    ]
    for field in strategy_fields:
        val = getattr(kb_in, field, None)
        if val is not None:
            kb_data[field] = val
    kb = KnowledgeBase(**kb_data)
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return kb


@router.get("/search")
def search_kb(
    kb_ids: str = Query(..., min_length=1, description="知识库ID列表，逗号分隔"),
    q: str = Query(..., min_length=1),
    method: str = Query("hybrid", pattern="^(bm25|vector|hybrid)$"),
    top_n: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        id_list = [int(x.strip()) for x in kb_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="kb_ids 格式错误，应为逗号分隔的整数")
    if not id_list:
        raise HTTPException(status_code=400, detail="至少指定一个知识库ID")

    all_results: list[dict] = []
    for kb_id in id_list:
        kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
        if not kb:
            continue
        results = search_chunks(db, kb_id, q, method=method, top_n=top_n)
        for r in results:
            r["kb_id"] = kb_id
            r["kb_name"] = kb.name
        all_results.extend(results)

    all_results.sort(key=lambda x: x["score"], reverse=True)
    all_results = all_results[:top_n]

    return {
        "kb_ids": id_list,
        "query": q,
        "method": method,
        "total": len(all_results),
        "results": all_results,
    }


@router.get("/{kb_id}", response_model=KnowledgeBaseOut)
def get_kb(kb_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    return kb


@router.put("/{kb_id}", response_model=KnowledgeBaseOut)
def update_kb(
    kb_id: int,
    kb_in: KnowledgeBaseUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    for field, value in kb_in.model_dump(exclude_unset=True).items():
        setattr(kb, field, value)
    db.commit()
    db.refresh(kb)
    return kb


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_kb(
    kb_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    db.delete(kb)
    db.commit()
    delete_collection(kb_id)
    delete_kb_bm25(db, kb_id)
