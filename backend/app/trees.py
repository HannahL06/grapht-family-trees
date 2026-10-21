import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.db import run_query

router = APIRouter()

# TODO: Task 1.11 — replace with the real logged-in user's id once auth exists.
DEV_OWNER_ID = "dev-user"


class TreeCreate(BaseModel):
    name: str


class TreeUpdate(BaseModel):
    name: str | None = None


class TreeResponse(BaseModel):
    id: str
    name: str
    owner_id: str


@router.post("/trees", response_model=TreeResponse)
def create_tree(body: TreeCreate):
    tree = {"id": str(uuid.uuid4()), "name": body.name, "owner_id": DEV_OWNER_ID}
    run_query(
        "CREATE (t:Tree {id: $id, name: $name, owner_id: $owner_id})",
        tree,
    )
    return tree


@router.get("/trees", response_model=list[TreeResponse])
def list_trees():
    return run_query(
        "MATCH (t:Tree {owner_id: $owner_id}) "
        "RETURN t.id AS id, t.name AS name, t.owner_id AS owner_id",
        {"owner_id": DEV_OWNER_ID},
    )


@router.get("/trees/{tree_id}", response_model=TreeResponse)
def get_tree(tree_id: str):
    rows = run_query(
        "MATCH (t:Tree {id: $id}) RETURN t.id AS id, t.name AS name, t.owner_id AS owner_id",
        {"id": tree_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Tree not found")
    return rows[0]


@router.patch("/trees/{tree_id}", response_model=TreeResponse)
def update_tree(tree_id: str, body: TreeUpdate):
    existing = get_tree(tree_id)  # raises 404 if missing
    if body.name is not None:
        run_query(
            "MATCH (t:Tree {id: $id}) SET t.name = $name",
            {"id": tree_id, "name": body.name},
        )
        existing["name"] = body.name
    return existing


@router.delete("/trees/{tree_id}", status_code=204)
def delete_tree(tree_id: str):
    get_tree(tree_id)  # raises 404 if missing
    # Two separate deletes: DETACH DELETE on a node from an OPTIONAL MATCH
    # that found nothing would try to delete a null value, which Neo4j
    # rejects — so people and the tree itself are deleted in separate steps.
    run_query("MATCH (p:Person {tree_id: $tree_id}) DETACH DELETE p", {"tree_id": tree_id})
    run_query("MATCH (t:Tree {id: $tree_id}) DETACH DELETE t", {"tree_id": tree_id})
