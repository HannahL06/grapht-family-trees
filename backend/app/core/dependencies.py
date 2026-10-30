import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.db import run_query
from app.core.security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    """FastAPI dependency: verifies the Bearer access token and returns the
    current user's data. Raises 401 for a missing, invalid, expired, or
    wrong-type (e.g. a refresh token used here) token."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    rows = run_query(
        "MATCH (u:User {id: $id}) RETURN u.id AS id, u.name AS name, u.email AS email",
        {"id": payload["sub"]},
    )
    if not rows:
        raise HTTPException(status_code=401, detail="User no longer exists")

    return rows[0]
