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


def require_tree_access(tree_id: str, current_user: dict = Depends(get_current_user)) -> dict:
    """Verifies the tree exists and the current user may access it, and
    returns the tree. 401 if not logged in, 404 if the tree doesn't exist,
    403 if it exists but belongs to someone else.

    Attached at the router level for every /trees/{tree_id}/... router, so
    new routes there are protected automatically. This is the single place
    Phase 3's role-based sharing (Task 3.7) will change."""
    rows = run_query(
        "MATCH (t:Tree {id: $id}) RETURN t.id AS id, t.name AS name, t.owner_id AS owner_id",
        {"id": tree_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Tree not found")
    tree = rows[0]
    # TODO: Phase 3 — expand to include shared trees (editor/viewer roles),
    # not just sole ownership.
    if tree["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You do not have access to this tree")
    return tree
