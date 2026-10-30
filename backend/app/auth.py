import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from neo4j.exceptions import ConstraintError
from pydantic import BaseModel

from app.core.db import run_query
from app.core.security import hash_password

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
