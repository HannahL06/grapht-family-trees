import uuid
from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException
from neo4j.exceptions import ConstraintError
from pydantic import BaseModel

from app.core.db import run_query
from app.core.dependencies import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter()


def ensure_user_constraints() -> None:
    """Call once at app startup. Neo4j enforces these — a duplicate email
    is rejected by the database itself, not just by application code."""
    run_query(
        "CREATE CONSTRAINT user_email_unique IF NOT EXISTS "
        "FOR (u:User) REQUIRE u.email IS UNIQUE"
    )
    run_query(
        "CREATE CONSTRAINT user_id_unique IF NOT EXISTS "
        "FOR (u:User) REQUIRE u.id IS UNIQUE"
    )


class UserCreate(BaseModel):
    name: str
    email: str  # TODO: see Task 1.9.x — switch to pydantic.EmailStr for real validation
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    # Deliberately no password/password_hash field — this is what the API is
    # allowed to send back, so leaving it out here makes it structurally
    # impossible to accidentally return a user's hash in a response.


@router.post("/auth/register", response_model=UserResponse, status_code=201)
def register(body: UserCreate):
    user = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        run_query(
            "CREATE (u:User {id: $id, name: $name, email: $email, "
            "password_hash: $password_hash, created_at: $created_at})",
            user,
        )
    except ConstraintError:
        raise HTTPException(status_code=400, detail="Email already registered")

    return user


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest):
    rows = run_query(
        "MATCH (u:User {email: $email}) RETURN u.id AS id, u.password_hash AS password_hash",
        {"email": body.email.lower()},
    )
    # Same generic error whether the email doesn't exist or the password is
    # wrong — telling them apart would let an attacker discover which
    # emails are registered.
    invalid = HTTPException(status_code=401, detail="Invalid email or password")
    if not rows:
        raise invalid
    user = rows[0]
    if not verify_password(body.password, user["password_hash"]):
        raise invalid

    return {
        "access_token": create_access_token(user["id"]),
        "refresh_token": create_refresh_token(user["id"]),
    }


@router.post("/auth/refresh", response_model=AccessTokenResponse)
def refresh(body: RefreshRequest):
    try:
        payload = decode_token(body.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    rows = run_query("MATCH (u:User {id: $id}) RETURN u.id AS id", {"id": payload["sub"]})
    if not rows:
        raise HTTPException(status_code=401, detail="User no longer exists")

    return {"access_token": create_access_token(payload["sub"])}


@router.post("/auth/logout")
def logout():
    # Stateless JWTs: there's nothing stored server-side to invalidate.
    # The client is responsible for discarding the token.
    return {"status": "logged out"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
