from sqlalchemy import text
from sqlalchemy.orm import Session

_has_jieba = False
try:
    import jieba as _jieba
    _has_jieba = True
except ImportError:
    pass


def _tokenize_text(text: str) -> str:
    if _has_jieba:
        words = _jieba.cut(text)
        return "  ".join(words)
    return text


def init_bm25(db: Session):
    db.execute(text(
        "CREATE TABLE IF NOT EXISTS bm25_index ("
        "  kb_id INTEGER,"
        "  chunk_text TEXT"
        ")"
    ))
    try:
        db.execute(text(
            "CREATE VIRTUAL TABLE IF NOT EXISTS bm25_fts USING fts5("
            "  kb_id,"
            "  chunk_text,"
            "  content='bm25_index',"
            "  content_rowid='rowid',"
            "  tokenize='unicode61'"
            ")"
        ))
    except Exception:
        pass
    db.commit()


def index_chunks_bm25(db: Session, kb_id: int, chunks: list[tuple[str, str]]):
    for chunk_id, chunk_text in chunks:
        db.execute(text(
            "INSERT INTO bm25_index (kb_id, chunk_text) VALUES (:kb_id, :text)"
        ), {"kb_id": kb_id, "text": chunk_text})
    db.commit()

    try:
        db.execute(text("INSERT INTO bm25_fts(bm25_fts) VALUES('rebuild')"))
        db.commit()
    except Exception:
        db.rollback()


def delete_kb_bm25(db: Session, kb_id: int):
    try:
        db.execute(text("DELETE FROM bm25_index WHERE kb_id = :kb_id"), {"kb_id": kb_id})
        db.commit()
        db.execute(text("INSERT INTO bm25_fts(bm25_fts) VALUES('rebuild')"))
        db.commit()
    except Exception:
        db.rollback()


def delete_chunks_bm25(db: Session, kb_id: int, chunk_texts: list[str]):
    for text in chunk_texts[:]:
        db.execute(text(
            "DELETE FROM bm25_index WHERE kb_id = :kb_id AND chunk_text = :text"
        ), {"kb_id": kb_id, "text": text})
    db.commit()

    try:
        db.execute(text("INSERT INTO bm25_fts(bm25_fts) VALUES('rebuild')"))
        db.commit()
    except Exception:
        db.rollback()
