import os
import httpx
from app.config import settings

MINERU_API_URL = os.getenv("MINERU_API_URL", "")
MINERU_API_KEY = os.getenv("MINERU_API_KEY", "")


async def convert_to_markdown(file_path: str, original_format: str) -> str:
    """Convert non-MD files to Markdown via MinerU API. Returns markdown text."""
    if original_format == "md":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    if not MINERU_API_URL:
        raise RuntimeError("MinerU API not configured (MINERU_API_URL)")

    async with httpx.AsyncClient(timeout=300) as client:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f)}
            headers = {"Authorization": f"Bearer {MINERU_API_KEY}"} if MINERU_API_KEY else {}
            resp = await client.post(
                f"{MINERU_API_URL}/convert",
                files=files,
                headers=headers,
            )
        resp.raise_for_status()
        return resp.text
