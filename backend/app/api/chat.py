import asyncio
import json
import traceback
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel

from app.database import get_db
from app.models import Conversation, Message, KnowledgeBase, User
from app.api.deps import get_current_user
from app.services.retrieval import hybrid_retrieve
from app.services.llm import chat_stream
from app.services.compression import compress_history

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    query: str


# --- Conversations ---

@router.post("/api/conversations", status_code=201)
def create_conversation(
    kb_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    conv = Conversation(kb_id=kb_id, user_id=current_user.id)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {"id": conv.id, "kb_id": conv.kb_id, "title": conv.title, "created_at": str(conv.created_at)}


@router.get("/api/conversations")
def list_conversations(
    kb_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Conversation).filter(Conversation.user_id == current_user.id)
    if kb_id:
        q = q.filter(Conversation.kb_id == kb_id)
    convs = q.order_by(Conversation.updated_at.desc()).all()
    return [{"id": c.id, "kb_id": c.kb_id, "title": c.title, "created_at": str(c.created_at), "updated_at": str(c.updated_at)} for c in convs]


@router.get("/api/conversations/{conv_id}/messages")
def get_messages(conv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")
    msgs = db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.created_at).all()
    return [{"id": m.id, "role": m.role, "content": m.content, "sources": json.loads(m.sources) if m.sources else [], "created_at": str(m.created_at)} for m in msgs]


@router.delete("/api/conversations/{conv_id}", status_code=204)
def delete_conversation(conv_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")
    db.delete(conv)
    db.commit()


# --- Chat (SSE streaming) ---

def _build_llm_messages(
    db: Session,
    conv_id: int,
    kb_id: int,
    query: str,
    retrieval_top_k: int,
    bm25_top_k: int,
    rerank_top_n: int,
    rrf_k: int,
    conversation_max_rounds: int,
    context_compression_enabled: bool,
    system_prompt: str,
    llm_model: str,
) -> tuple[list[dict], list[dict], str]:
    retrieved = hybrid_retrieve(db, kb_id, query, retrieval_top_k, bm25_top_k, rerank_top_n, rrf_k)

    context_parts = []
    sources = []
    for r in retrieved:
        doc_name = r.get("document", "")
        page = r.get("page")
        if page:
            context_parts.append(f"[来源: {doc_name} 第{page}页]\n{r['content']}")
            sources.append({"document": doc_name, "page": page, "chunk_text": r["content"][:200]})
        else:
            context_parts.append(r["content"])
            sources.append({"document": doc_name, "chunk_text": r["content"][:200]})

    context = "\n\n---\n\n".join(context_parts) if context_parts else ""

    history_msgs = db.query(Message).filter(
        Message.conversation_id == conv_id
    ).order_by(Message.created_at.desc()).limit(conversation_max_rounds * 2).all()
    history_msgs.reverse()

    llm_messages = [{"role": "system", "content": system_prompt}]
    for m in history_msgs:
        llm_messages.append({"role": m.role, "content": m.content})

    if context:
        llm_messages.append({"role": "system", "content": f"以下是从知识库检索到的相关内容：\n\n{context}"})

    if context_compression_enabled and len(llm_messages) > conversation_max_rounds * 2 + 2:
        llm_messages = _run_compression(llm_messages, conversation_max_rounds, llm_model)

    return llm_messages, sources, context


def _run_compression(llm_messages: list[dict], max_rounds: int, model: str) -> list[dict]:
    try:
        import asyncio as _asyncio
        loop = _asyncio.new_event_loop()
        result = loop.run_until_complete(compress_history(llm_messages, max_rounds, model))
        loop.close()
        return result
    except Exception:
        return llm_messages


@router.post("/api/chat/send")
async def send_message(
    body: ChatRequest,
    conversation_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")

    kb = db.query(KnowledgeBase).filter(KnowledgeBase.id == conv.kb_id).first()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")

    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="提问不能为空")

    user_msg = Message(conversation_id=conv.id, role="user", content=query)
    db.add(user_msg)
    db.commit()

    if conv.title == "新对话":
        conv.title = query[:50]
        db.commit()

    conv_id = conv.id
    kb_id = kb.id
    retrieval_top_k = kb.retrieval_top_k
    bm25_top_k = kb.bm25_top_k
    rerank_top_n = kb.rerank_top_n
    rrf_k = kb.rrf_k
    conversation_max_rounds = kb.conversation_max_rounds
    context_compression_enabled = kb.context_compression
    system_prompt = kb.system_prompt
    llm_model = kb.llm_model
    llm_temperature = kb.llm_temperature

    loop = asyncio.get_running_loop()
    llm_messages, sources, _context = await loop.run_in_executor(
        None,
        _build_llm_messages,
        db,
        conv_id,
        kb_id,
        query,
        retrieval_top_k,
        bm25_top_k,
        rerank_top_n,
        rrf_k,
        conversation_max_rounds,
        context_compression_enabled,
        system_prompt,
        llm_model,
    )

    # Re-query conversation inside event generator to get its own session
    from app.database import SessionLocal as _SL

    partial_answer = [""]

    async def event_generator():
        try:
            async for token in chat_stream(llm_messages, llm_model, llm_temperature):
                partial_answer[0] += token
                yield {"event": "token", "data": token}
        except (GeneratorExit, asyncio.CancelledError):
            _save_partial(conv_id, partial_answer[0], sources, user_msg)
            raise
        except Exception as e:
            traceback.print_exc()
            _save_partial(conv_id, partial_answer[0], sources, user_msg)
            yield {"event": "error", "data": str(e)}
            return

        _save_full(conv_id, partial_answer[0], sources)
        yield {"event": "done", "data": json.dumps({"sources": sources}, ensure_ascii=False)}

    async def event_generator_with_cleanup():
        try:
            async for event in event_generator():
                yield event
        except (GeneratorExit, asyncio.CancelledError):
            _save_partial(conv_id, partial_answer[0], sources, user_msg)

    return EventSourceResponse(event_generator_with_cleanup())


def _save_partial(conv_id: int, content: str, sources: list[dict], user_msg: Message):
    if not content.strip():
        return
    db2 = None
    try:
        from app.database import SessionLocal as _SL2
        db2 = _SL2()
        assistant_msg = Message(
            conversation_id=conv_id,
            role="assistant",
            content=content + "\n\n[回答被中断]",
            sources=json.dumps(sources, ensure_ascii=False),
        )
        db2.add(assistant_msg)
        db2.commit()
    finally:
        if db2:
            db2.close()


def _save_full(conv_id: int, content: str, sources: list[dict]):
    if not content.strip():
        return
    db2 = None
    try:
        from app.database import SessionLocal as _SL2
        db2 = _SL2()
        assistant_msg = Message(
            conversation_id=conv_id,
            role="assistant",
            content=content,
            sources=json.dumps(sources, ensure_ascii=False),
        )
        db2.add(assistant_msg)
        db2.commit()
    finally:
        if db2:
            db2.close()
