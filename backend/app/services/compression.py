"""Context compression: summarize early conversation rounds via LLM."""


async def compress_history(messages: list[dict], max_rounds: int, model: str = "deepseek-chat") -> list[dict]:
    """
    If messages exceed max_rounds * 2 (user+assistant per round),
    compress early rounds into a summary.
    Returns compressed message list.
    """
    from app.services.llm import chat_stream
    import asyncio

    max_msgs = max_rounds * 2
    if len(messages) <= max_msgs:
        return messages

    # Take early rounds to compress
    early = messages[: len(messages) - max_msgs]
    recent = messages[len(messages) - max_msgs:]

    # Build compression prompt
    history_text = "\n".join(
        f"{'用户' if m['role'] == 'user' else '助手'}: {m['content'][:200]}"
        for m in early
    )

    compress_prompt = [
        {"role": "system", "content": "你是一个对话摘要助手。请将以下对话历史压缩为一段简短的摘要，保留关键问题和结论。"},
        {"role": "user", "content": f"请将以下对话历史压缩为一段摘要（100字以内）：\n\n{history_text}"},
    ]

    summary = ""
    async for token in chat_stream(compress_prompt, model, 0.3):
        summary += token

    return [{"role": "system", "content": f"[对话历史摘要]\n{summary}"}] + recent
