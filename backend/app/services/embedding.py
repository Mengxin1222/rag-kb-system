import os
from typing import List
import httpx

EMBEDDING_API_URL = os.getenv("EMBEDDING_API_URL", "")
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY", "")


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Call Alibaba Embedding API to get vectors for texts.
    Returns list of embedding vectors.
    Set EMBEDDING_API_URL and EMBEDDING_API_KEY in env.
    """
    if not EMBEDDING_API_URL:
        # Fallback: return zero vectors for testing
        return [[0.0] * 1024 for _ in texts]

    async with httpx.AsyncClient(timeout=120) as client:
        headers = {"Authorization": f"Bearer {EMBEDDING_API_KEY}"} if EMBEDDING_API_KEY else {}
        resp = await client.post(
            EMBEDDING_API_URL,
            json={"input": texts},
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()
        return [item["embedding"] for item in data.get("data", data.get("output", []))]
