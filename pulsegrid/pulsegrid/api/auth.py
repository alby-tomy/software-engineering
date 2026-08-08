"""JWT authentication and RBAC (Week 9)."""

from __future__ import annotations

import bcrypt
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from pulsegrid.config import settings
from pulsegrid.models import User, UserRole

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


def _build_dev_users() -> dict[str, User]:
    return {
        "admin": User(
            id="user-admin",
            username="admin",
            email="admin@pulsegrid.local",
            role=UserRole.ADMIN,
            hashed_password=hash_password("admin"),
        ),
        "responder": User(
            id="user-responder",
            username="responder",
            email="responder@pulsegrid.local",
            role=UserRole.RESPONDER,
            hashed_password=hash_password("responder"),
        ),
    }


_DEV_USERS: dict[str, User] | None = None


def get_dev_users() -> dict[str, User]:
    global _DEV_USERS
    if _DEV_USERS is None:
        _DEV_USERS = _build_dev_users()
    return _DEV_USERS


def authenticate_user(username: str, password: str) -> User | None:
    user = get_dev_users().get(username)
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(user: User) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user.id,
        "username": user.username,
        "role": user.role.value,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, str]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return {
            "user_id": str(payload["sub"]),
            "username": str(payload["username"]),
            "role": str(payload["role"]),
        }
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    data = decode_token(credentials.credentials)
    user = get_dev_users().get(data["username"])
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(*roles: UserRole):
    async def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles and user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return checker
