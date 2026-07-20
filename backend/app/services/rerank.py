import os
import httpx

RERANK_API_URL = os.getenv("RERANK_API_URL", "")
RERANK_API_KEY = os.getenv("RERANK_API_KEY", "")


async def rerank(query: str, documents: list[str], top_n: int = 5) -> list[dict]:
    """
    Call Alibaba Rerank API.
    Returns ranked list with {"index": int, "score": float}.
    """
    if not RERANK_API_URL or not documents:
        # Fallback: return top-N as-is
        return [{"index": i, "score": 1.0, "text": d}
                for i, d in enumerate(documents[:top_n])]

    async with httpx.AsyncClient(timeout=30) as client:
        headers = {"Authorization": f"Bearer {RERANK_API_KEY}"} if RERANK_API_KEY else {}
        resp = await client.post(
            RERANK_API_URL,
            json={
                "query": query,
                "documents": documents,
                "top_n": top_n,
            },
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("results", data.get("output", []))
