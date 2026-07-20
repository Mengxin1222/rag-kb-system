from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import User
from app.schemas.user import UserOut, UserCreate
from app.services.auth import hash_password
from app.api.deps import get_admin_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(User).all()


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = User(
        username=user_in.username,
        password_hash=hash_password(user_in.password),
        role=user_in.role if user_in.role in ("admin", "user") else "user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="不能删除自己")
    db.delete(user)
    db.commit()


# Dashboard endpoint
@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    from sqlalchemy import text
    from app.models import KnowledgeBase, Document, Chunk, Message, Conversation

    kb_count = db.query(KnowledgeBase).count()
    doc_count = db.query(Document).count()
    doc_failed = db.query(Document).filter(Document.status == "failed").count()
    chunk_count = db.query(Chunk).count()
    msg_count = db.query(Message).filter(Message.role == "user").count()

    # 7-day trend
    rows = db.execute(text(
        "SELECT DATE(created_at) d, COUNT(*) c FROM messages "
        "WHERE role='user' AND created_at >= date('now','-7 days') "
        "GROUP BY d ORDER BY d"
    )).fetchall()
    trend = [{"date": r[0], "count": r[1]} for r in rows]

    # Active KB ranking
    rows = db.execute(text(
        "SELECT kb_id, COUNT(*) c FROM conversations "
        "GROUP BY kb_id ORDER BY c DESC LIMIT 10"
    )).fetchall()
    kb_ranking = [{"kb_id": r[0], "count": r[1]} for r in rows]

    # Storage
    total_size = db.execute(text(
        "SELECT COALESCE(SUM(file_size), 0) FROM documents"
    )).scalar()

    return {
        "kb_count": kb_count,
        "doc_count": doc_count,
        "doc_failed": doc_failed,
        "chunk_count": chunk_count,
        "query_count": msg_count,
        "trend_7d": trend,
        "kb_ranking": kb_ranking,
        "storage_bytes": total_size,
    }
