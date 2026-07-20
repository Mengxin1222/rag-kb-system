import json
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional


DEFAULT_SYSTEM_PROMPT = (
    "你是一个专业的知识库问答助手。请根据以下从知识库中检索到的上下文内容回答用户的问题。"
    "每个上下文片段标注了来源（文档名、页码）。\n"
    "要求：\n"
    "1. 仅基于提供的上下文内容作答，不要编造信息。\n"
    '2. 如果上下文不足以回答问题，请明确告知用户"知识库中未找到相关信息"。\n'
    "3. 在回答中使用 [文档名 第X页] 标注引用来源，例如 [产品手册.pdf 第3页]。\n"
    "4. 使用与用户提问相同的语言回答。\n"
    "5. 回答简洁、准确、有条理。"
)

DEFAULT_SEPARATORS = '["\\n\\n","\\n","。","!","？","?","；",";",""]'


class KnowledgeBaseCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = ""
    chunk_method: Optional[str] = None
    chunk_heading_levels: Optional[str] = None
    chunk_max_chars: Optional[int] = None
    chunk_overlap: Optional[int] = None
    chunk_separators: Optional[str] = None
    retrieval_top_k: Optional[int] = None
    bm25_top_k: Optional[int] = None
    rerank_top_n: Optional[int] = None
    rrf_k: Optional[int] = None
    conversation_max_rounds: Optional[int] = None
    context_compression: Optional[bool] = None
    system_prompt: Optional[str] = None
    llm_model: Optional[str] = None
    llm_temperature: Optional[float] = None
    embedding_model: Optional[str] = None
    rerank_model: Optional[str] = None


class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    chunk_method: Optional[str] = None
    chunk_heading_levels: Optional[str] = None
    chunk_max_chars: Optional[int] = None
    chunk_overlap: Optional[int] = None
    chunk_separators: Optional[str] = None
    retrieval_top_k: Optional[int] = None
    bm25_top_k: Optional[int] = None
    rerank_top_n: Optional[int] = None
    rrf_k: Optional[int] = None
    conversation_max_rounds: Optional[int] = None
    context_compression: Optional[bool] = None
    system_prompt: Optional[str] = None
    llm_model: Optional[str] = None
    llm_temperature: Optional[float] = None
    embedding_model: Optional[str] = None
    rerank_model: Optional[str] = None


class KnowledgeBaseOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    admin_id: int
    chunk_method: str
    chunk_heading_levels: str
    chunk_max_chars: int
    chunk_overlap: int
    chunk_separators: str
    retrieval_top_k: int
    bm25_top_k: int
    rerank_top_n: int
    rrf_k: int
    conversation_max_rounds: int
    context_compression: bool
    system_prompt: str
    llm_model: str
    llm_temperature: float
    embedding_model: str
    rerank_model: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeBaseListOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    admin_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
