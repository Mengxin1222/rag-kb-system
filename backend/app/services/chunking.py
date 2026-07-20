import ast as _ast
import asyncio
import math
import hashlib
import json
import re
from typing import List
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter


_LINK_RE = re.compile(r"https?://[^\s\)\]\"]+|\[.+?\]\(https?://[^\s\)]+\)")
_IMAGE_RE = re.compile(r"!\[.*?\]\(.+?\)|<img\s[^>]*>")
_CODE_RE = re.compile(r"```\w*\n[\s\S]*?```|`[^`\n]+`")


def _detect_content_tags(content: str) -> str | None:
    tags = []
    if _CODE_RE.search(content):
        tags.append("code")
    if _LINK_RE.search(content):
        tags.append("link")
    if _IMAGE_RE.search(content):
        tags.append("image")
    return json.dumps(tags, ensure_ascii=False) if tags else None


_CODE_FENCE_RE = re.compile(r"```(\w*)\n(.*?)```", re.DOTALL)
_CODE_PLACEHOLDER = "[CODE_BLOCK_{i}]"


def _protect_code_blocks(text: str) -> tuple[str, list[str], list[str]]:
    """Extract fenced code blocks, return (protected_text, placeholders, original_code)."""
    code_blocks: list[str] = []
    langs: list[str] = []

    def _replace(m: re.Match) -> str:
        idx = len(code_blocks)
        code_blocks.append(m.group(0))
        langs.append(m.group(1) or "")
        return _CODE_PLACEHOLDER.format(i=idx)

    protected = _CODE_FENCE_RE.sub(_replace, text)
    return protected, code_blocks, langs


def _restore_code_blocks(text: str, code_blocks: list[str]) -> str:
    """Replace placeholders with original code blocks."""
    result = text
    for i, cb in enumerate(code_blocks):
        result = result.replace(_CODE_PLACEHOLDER.format(i=i), cb)
    return result


def _split_code_block_by_ast(code: str, max_chars: int) -> list[str]:
    """Split Python code block at function/class boundaries using AST."""
    try:
        tree = _ast.parse(code)
    except SyntaxError:
        return _split_code_by_blank_lines(code, max_chars)

    lines = code.split("\n")
    breakpoints: set[int] = {0}
    leading_comment_end = _find_leading_comment_end(lines)

    for node in _ast.walk(tree):
        if isinstance(node, (_ast.FunctionDef, _ast.AsyncFunctionDef, _ast.ClassDef)):
            if hasattr(node, "end_lineno") and node.end_lineno:
                bp = node.lineno - 1  # 0-indexed, split BEFORE the def/class
                # Keep leading comments with their function
                if bp > leading_comment_end + 1:
                    breakpoints.add(bp)
            else:
                breakpoints.add(node.lineno - 1)

    breakpoints.add(len(lines))
    sorted_bp = sorted(breakpoints)

    chunks: list[str] = []
    for j in range(len(sorted_bp) - 1):
        start = sorted_bp[j]
        end = sorted_bp[j + 1]
        chunk_lines = lines[start:end]
        chunk_text = "\n".join(chunk_lines).strip()
        if not chunk_text:
            continue
        if len(chunk_text) > max_chars:
            sub = _split_code_by_blank_lines(chunk_text, max_chars)
            chunks.extend(sub)
        else:
            chunks.append(chunk_text)
    return chunks


def _find_leading_comment_end(lines: list[str]) -> int:
    """Return the line index after the last leading comment (empty line = break)."""
    last = 0
    seen_blank = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            seen_blank = True
        elif stripped.startswith("#") and not seen_blank:
            last = i + 1
        else:
            break
    return last


def _split_code_by_blank_lines(code: str, max_chars: int) -> list[str]:
    """Split code at blank lines, then enforce max_chars."""
    blocks = re.split(r"\n\s*\n", code)
    chunks: list[str] = []
    buf = ""
    for block in blocks:
        if buf and len(buf) + len(block) + 2 > max_chars:
            chunks.append(buf.strip())
            buf = block
        else:
            buf = buf + "\n\n" + block if buf else block
    if buf.strip():
        text = buf.strip()
        if len(text) > max_chars and max_chars > 30:
            text = text[:max_chars - 20] + "\n\n[代码过长已截断]"
        chunks.append(text)
    return chunks


def _split_oversized_content(text: str, max_chars: int) -> list[str]:
    """Handle oversized text: try AST on code blocks, then blank-line, then hard cut."""
    protected, code_blocks, langs = _protect_code_blocks(text)
    result_parts: list[str] = []

    if len(protected) <= max_chars and not code_blocks:
        return [text]

    parts = protected.split(_CODE_PLACEHOLDER.format(i=0))
    for pi, part in enumerate(parts):
        if part:
            result_parts.append(part)
        if pi < len(code_blocks):
            cb = code_blocks[pi]
            if len(cb) <= max_chars:
                result_parts.append(cb)
            else:
                lang = langs[pi].lower() if pi < len(langs) else ""
                inner = cb[3 + len(langs[pi]) + 1:-3] if langs[pi] else cb[3:-3]
                fence = f"```{langs[pi]}\n" if langs[pi] else "```\n"
                if lang in ("python", "py"):
                    sub_chunks = _split_code_block_by_ast(inner, max_chars - len(fence) - 4)
                else:
                    sub_chunks = _split_code_by_blank_lines(inner, max_chars - len(fence) - 4)
                for sc in sub_chunks:
                    result_parts.append(f"{fence}{sc}\n```")

    # Merge consecutive non-code parts and ensure max_chars
    merged: list[str] = []
    buf = ""
    for part in result_parts:
        if buf and len(buf) + len(part) > max_chars:
            merged.append(buf)
            buf = part
        else:
            buf = buf + ("\n" if buf and not buf.endswith("\n") else "") + part if buf else part
    if buf:
        merged.append(buf)

    return merged if merged else [text]


def _apply_code_protection(md_text: str, strategy: dict, raw_chunks: list[dict]) -> list[dict]:
    """Post-process: restore code blocks, split oversized chunks."""
    max_chars = strategy["max_chars"]
    final = []
    for chunk in raw_chunks:
        content = chunk["content"]
        if len(content) <= max_chars:
            final.append(chunk)
        else:
            sub_parts = _split_oversized_content(content, max_chars)
            pos = chunk["char_start"]
            for part in sub_parts:
                idx = md_text.find(part, pos) if len(part) > 5 else -1
                if idx == -1:
                    idx = pos
                final.append({
                    "content": part,
                    "content_hash": hashlib.md5(part.encode("utf-8")).hexdigest(),
                    "char_count": len(part),
                    "char_start": idx,
                    "char_end": idx + len(part),
                    "page": chunk.get("page") or _extract_page(part),
                })
                pos = idx + len(part)
    return final


def get_chunking_strategy(doc, kb) -> dict:
    if doc and doc.override_strategy:
        return {
            "method": doc.chunk_method or kb.chunk_method,
            "heading_levels": doc.chunk_heading_levels or kb.chunk_heading_levels,
            "max_chars": doc.chunk_max_chars or kb.chunk_max_chars,
            "overlap": doc.chunk_overlap or kb.chunk_overlap,
            "separators": json.loads(doc.chunk_separators or kb.chunk_separators),
        }
    return {
        "method": kb.chunk_method,
        "heading_levels": kb.chunk_heading_levels,
        "max_chars": kb.chunk_max_chars,
        "overlap": kb.chunk_overlap,
        "separators": json.loads(kb.chunk_separators),
    }


def parse_page_number(line: str) -> int | None:
    m = re.match(r"^\[PAGE_(\d+)\]", line.strip())
    return int(m.group(1)) if m else None


def chunk_document(md_text: str, strategy: dict) -> list[dict]:
    if strategy["method"] == "character":
        raw = _chunk_by_characters(md_text, strategy)
        return _apply_code_protection(md_text, strategy, raw)
    if strategy["method"] == "semantic":
        return _run_sync(_chunk_by_semantic(md_text, strategy))

    # Heading-based: protect code blocks first, split, restore, then enforce
    protected, code_blocks, _langs = _protect_code_blocks(md_text)
    heading_levels = [int(lv.strip()) for lv in strategy["heading_levels"].split(",") if lv.strip()]
    if not heading_levels:
        heading_levels = [2]

    headers_to_split_on = []
    for lv in sorted(heading_levels):
        headers_to_split_on.append(("#" * lv, f"h{lv}"))

    md_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on,
        strip_headers=False,
    )

    char_splitter = RecursiveCharacterTextSplitter(
        chunk_size=strategy["max_chars"],
        chunk_overlap=strategy["overlap"],
        separators=strategy["separators"],
        keep_separator=True,
    )

    header_splits = md_splitter.split_text(protected)

    raw_chunks = []
    pos = 0
    for hs in header_splits:
        page = _extract_page(hs.page_content)
        sub_texts = char_splitter.split_text(hs.page_content)
        for st in sub_texts:
            if not st.strip():
                continue
            restored = _restore_code_blocks(st, code_blocks)
            content_hash = hashlib.md5(restored.encode("utf-8")).hexdigest()
            idx = md_text.find(restored, pos) if len(restored) > 5 else -1
            if idx == -1:
                idx = pos
            raw_chunks.append({
                "content": restored,
                "content_hash": content_hash,
                "char_count": len(restored),
                "char_start": idx,
                "char_end": idx + len(restored),
                "page": page,
                "content_tags": _detect_content_tags(restored),
            })
            pos = idx + len(restored)

    return _apply_code_protection(md_text, strategy, raw_chunks)


def _apply_code_protection(md_text: str, strategy: dict, raw_chunks: list[dict]) -> list[dict]:
    """Post-process: split oversized chunks (after code block restoration)."""
    max_chars = strategy["max_chars"]
    final = []
    for chunk in raw_chunks:
        content = chunk["content"]
        if len(content) <= max_chars:
            final.append(chunk)
        else:
            sub_parts = _split_oversized_content(content, max_chars)
            pos = chunk["char_start"]
            for part in sub_parts:
                idx = md_text.find(part, pos) if len(part) > 5 else -1
                if idx == -1:
                    idx = pos
                final.append({
                    "content": part,
                    "content_hash": hashlib.md5(part.encode("utf-8")).hexdigest(),
                    "char_count": len(part),
                    "char_start": idx,
                    "char_end": idx + len(part),
                    "page": chunk.get("page") or _extract_page(part),
                    "content_tags": _detect_content_tags(part),
                })
                pos = idx + len(part)
    return final


def _chunk_by_characters(md_text: str, strategy: dict) -> list[dict]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=strategy["max_chars"],
        chunk_overlap=strategy["overlap"],
        separators=strategy["separators"],
        keep_separator=True,
    )
    texts = splitter.split_text(md_text)
    result = []
    pos = 0
    for t in texts:
        if not t.strip():
            continue
        content_hash = hashlib.md5(t.encode("utf-8")).hexdigest()
        idx = md_text.find(t, pos) if len(t) > 5 else -1
        if idx == -1:
            idx = pos
        page = _extract_page(t)
        result.append({
            "content": t,
            "content_hash": content_hash,
            "char_count": len(t),
            "char_start": idx,
            "char_end": idx + len(t),
            "page": page,
            "content_tags": _detect_content_tags(t),
        })
        pos = idx + len(t)
    return result


def _extract_page(text: str) -> int | None:
    m = re.search(r"\[PAGE_(\d+)\]", text)
    return int(m.group(1)) if m else None


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 1.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 1.0
    return dot / (norm_a * norm_b)


_SENTENCE_SPLIT = re.compile(
    r"(?<=[。！？!?\n])\s*",
)


def _split_sentences(text: str) -> list[str]:
    parts = _SENTENCE_SPLIT.split(text)
    return [p for p in parts if p.strip()]


async def _chunk_by_semantic(md_text: str, strategy: dict) -> list[dict]:
    from app.services.embedding import embed_texts

    max_chars = strategy["max_chars"]

    sentences = _split_sentences(md_text)
    if len(sentences) <= 2:
        return _chunk_by_characters(md_text, strategy)

    # Group sentences into segments of ~150 chars for embedding
    segments: list[str] = []
    buf = ""
    for s in sentences:
        if buf and len(buf) + len(s) > 150:
            segments.append(buf)
            buf = s
        else:
            buf = buf + s if buf else s
    if buf.strip():
        segments.append(buf)

    if len(segments) <= 1:
        return _chunk_by_characters(md_text, strategy)

    # Embed segments
    try:
        vectors = await embed_texts(segments)
    except Exception:
        return _chunk_by_characters(md_text, strategy)

    if not vectors or all(all(v == 0 for v in vec) for vec in vectors):
        return _chunk_by_characters(md_text, strategy)

    # Compute similarity between adjacent segments
    similarities: list[float] = []
    for i in range(len(vectors) - 1):
        sim = _cosine_similarity(vectors[i], vectors[i + 1])
        similarities.append(sim)

    if not similarities:
        return _chunk_by_characters(md_text, strategy)

    # Find split points at similarity valleys
    mean_sim = sum(similarities) / len(similarities)
    std_sim = math.sqrt(sum((s - mean_sim) ** 2 for s in similarities) / len(similarities))
    threshold = max(0.3, mean_sim - std_sim * 0.8)
    split_points: set[int] = {0}

    for i, sim in enumerate(similarities):
        if sim < threshold:
            split_points.add(i + 1)

    split_points.add(len(segments))

    # Merge consecutive segments between split points into chunks
    sorted_points = sorted(split_points)
    chunks_data: list[list[str]] = []
    for j in range(len(sorted_points) - 1):
        start = sorted_points[j]
        end = sorted_points[j + 1]
        chunk_segs = segments[start:end]
        if not chunk_segs:
            continue
        chunks_data.append(chunk_segs)

    # Enforce max_chars: split oversized chunks
    char_splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_chars,
        chunk_overlap=strategy.get("overlap", 0),
        separators=strategy["separators"],
        keep_separator=True,
    )

    final_chunks = []
    for segs in chunks_data:
        joined = "".join(segs)
        if len(joined) <= max_chars:
            idx = md_text.find(joined) if len(joined) > 5 else -1
            if idx == -1:
                idx = md_text.find(segs[0]) if segs else 0
            if idx == -1:
                idx = 0
            final_chunks.append({
                "content": joined,
                "content_hash": hashlib.md5(joined.encode("utf-8")).hexdigest(),
                "char_count": len(joined),
                "char_start": idx,
                "char_end": idx + len(joined),
                "page": _extract_page(joined),
                "content_tags": _detect_content_tags(joined),
            })
        else:
            sub_texts = char_splitter.split_text(joined)
            pos = md_text.find(joined) if len(joined) > 5 else -1
            if pos == -1:
                pos = md_text.find(segs[0]) if segs else 0
            if pos == -1:
                pos = 0
            for st in sub_texts:
                if not st.strip():
                    continue
                idx = md_text.find(st, pos) if len(st) > 5 else -1
                if idx == -1:
                    idx = pos
                final_chunks.append({
                    "content": st,
                    "content_hash": hashlib.md5(st.encode("utf-8")).hexdigest(),
                    "char_count": len(st),
                    "char_start": idx,
                    "char_end": idx + len(st),
                    "page": _extract_page(st),
                    "content_tags": _detect_content_tags(st),
                })
                pos = idx + len(st)

    return final_chunks


def _run_sync(coro):
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    else:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
