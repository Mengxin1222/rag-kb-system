import os
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import settings as app_settings

_client = None


def get_chroma_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        os.makedirs(app_settings.CHROMA_PERSIST_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=app_settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def get_collection_name(kb_id: int) -> str:
    return f"kb_{kb_id}"


def create_collection(kb_id: int):
    client = get_chroma_client()
    name = get_collection_name(kb_id)
    return client.get_or_create_collection(name=name)


def delete_collection(kb_id: int):
    client = get_chroma_client()
    name = get_collection_name(kb_id)
    try:
        client.delete_collection(name=name)
    except Exception:
        pass


def delete_chunks_from_collection(kb_id: int, chroma_ids: list[str]):
    if not chroma_ids:
        return
    client = get_chroma_client()
    try:
        collection = client.get_collection(name=get_collection_name(kb_id))
        collection.delete(ids=chroma_ids)
    except Exception:
        pass
