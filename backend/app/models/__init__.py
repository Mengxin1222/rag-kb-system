from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # admin / user
    created_at = Column(DateTime, server_default=func.now())

    conversations = relationship("Conversation", back_populates="user")
    knowledge_bases = relationship("KnowledgeBase", back_populates="admin")


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Chunking strategy
    chunk_method = Column(String(20), nullable=False, default="heading")
    chunk_heading_levels = Column(String(50), nullable=False, default="2")
    chunk_max_chars = Column(Integer, nullable=False, default=1000)
    chunk_overlap = Column(Integer, nullable=False, default=0)
    chunk_separators = Column(Text, nullable=False,
        default='["\\n\\n","\\n","。","!","？","?","；",";",""]')

    # Retrieval
    retrieval_top_k = Column(Integer, nullable=False, default=20)
    bm25_top_k = Column(Integer, nullable=False, default=20)
    rerank_top_n = Column(Integer, nullable=False, default=5)
    rrf_k = Column(Integer, nullable=False, default=60)

    # Conversation
    conversation_max_rounds = Column(Integer, nullable=False, default=10)
    context_compression = Column(Boolean, nullable=False, default=True)

    # LLM / models
    system_prompt = Column(Text, nullable=False, default=(
        "你是一个专业的知识库问答助手。请根据以下从知识库中检索到的上下文内容回答用户的问题。"
        "每个上下文片段标注了来源（文档名、页码）。\n"
        "要求：\n"
        "1. 仅基于提供的上下文内容作答，不要编造信息。\n"
        '2. 如果上下文不足以回答问题，请明确告知用户"知识库中未找到相关信息"。\n'
        "3. 在回答中使用 [文档名 第X页] 标注引用来源，例如 [产品手册.pdf 第3页]。\n"
        "4. 使用与用户提问相同的语言回答。\n"
        "5. 回答简洁、准确、有条理。"
    ))
    llm_model = Column(String(100), nullable=False, default="deepseek-chat")
    llm_temperature = Column(Float, nullable=False, default=0.7)
    embedding_model = Column(String(100), nullable=False, default="text-embedding-v3")
    rerank_model = Column(String(100), nullable=False, default="gte-rerank")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    admin = relationship("User", back_populates="knowledge_bases")
    documents = relationship("Document", back_populates="knowledge_base", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="knowledge_base", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    kb_id = Column(Integer, ForeignKey("knowledge_bases.id"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    original_format = Column(String(20), nullable=False)
    file_path = Column(String(1000), nullable=False)
    md_path = Column(String(1000))
    file_size = Column(Integer)
    status = Column(String(20), nullable=False, default="pending")  # pending/processing/ready/failed
    chunks_reviewed = Column(Boolean, default=False)
    error_message = Column(Text)
    chunk_count = Column(Integer, default=0)

    # Document-level override of chunking strategy
    override_strategy = Column(Boolean, default=False)
    chunk_method = Column(String(20))
    chunk_heading_levels = Column(String(50))
    chunk_max_chars = Column(Integer)
    chunk_overlap = Column(Integer)
    chunk_separators = Column(Text)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    knowledge_base = relationship("KnowledgeBase", back_populates="documents")
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    kb_id = Column(Integer, ForeignKey("knowledge_bases.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), default="新对话")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="conversations")
    knowledge_base = relationship("KnowledgeBase", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user / assistant
    content = Column(Text, nullable=False)
    sources = Column(Text)  # JSON string
    created_at = Column(DateTime, server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    chroma_id = Column(String(200))
    content_hash = Column(String(64), nullable=False)
    content = Column(Text, nullable=False)
    char_count = Column(Integer)
    char_start = Column(Integer, nullable=False)
    char_end = Column(Integer, nullable=False)
    page_start = Column(Integer)
    page_end = Column(Integer)
    embedding_status = Column(String(20), nullable=False, default="pending")  # pending / embedded
    content_tags = Column(Text)  # JSON list: ["link", "image", "code"]
    created_at = Column(DateTime, server_default=func.now())

    document = relationship("Document", back_populates="chunks")
