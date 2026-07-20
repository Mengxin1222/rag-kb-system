from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, Token
from app.models import User as UserModel
from app.services.auth import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=Token)
def login(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == user_in.username).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    token = create_access_token(user.username, user.role)
    return Token(access_token=token, role=user.role)


@router.post("/refresh", response_model=Token)
def refresh(current_user: UserModel = Depends(get_current_user)):
    token = create_access_token(current_user.username, current_user.role)
    return Token(access_token=token, role=current_user.role)
