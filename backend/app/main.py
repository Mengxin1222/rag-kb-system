from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api.auth import router as auth_router
from app.api.kb import router as kb_router
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.api.admin import router as admin_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="RAG 知识库问答系统", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth")
app.include_router(kb_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(admin_router)
