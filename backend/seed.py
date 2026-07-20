import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models import User
from app.services.auth import hash_password
from app.config import settings

Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    existing = db.query(User).filter(User.username == settings.SEED_ADMIN_USERNAME).first()
    if not existing:
        admin = User(
            username=settings.SEED_ADMIN_USERNAME,
            password_hash=hash_password(settings.SEED_ADMIN_PASSWORD),
            role="admin",
        )
        db.add(admin)
        db.commit()
        print(f"管理员已创建: {settings.SEED_ADMIN_USERNAME}")
    else:
        print("管理员已存在，跳过")
finally:
    db.close()
