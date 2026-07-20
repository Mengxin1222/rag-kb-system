from pydantic import BaseModel
from datetime import datetime


class DocumentOut(BaseModel):
    id: int
    kb_id: int
    filename: str
    original_format: str
    file_size: int | None
    status: str
    chunks_reviewed: bool
    chunk_count: int
    error_message: str | None
    override_strategy: bool | None = False
    chunk_method: str | None = None
    chunk_heading_levels: str | None = None
    chunk_max_chars: int | None = None
    chunk_overlap: int | None = None
    chunk_separators: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
