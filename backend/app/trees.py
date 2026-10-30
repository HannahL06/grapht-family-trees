import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.db import run_query
from app.core.dependencies import get_current_user, require_tree_access

router = APIRouter()


class TreeCreate(BaseModel):
    name: str


class TreeUpdate(BaseModel):
    name: str | None = None


class TreeResponse(BaseModel):
    id: str
    name: str
    owner_id: str


@router.post("/trees", response_model=TreeResponse)
def create_tree(body: TreeCreate, current_user: dict = Depends(get_current_user)):
    tree = {"id": str(uuid.uuid4()), "name": body.name, "owner_id": current_user["id"]}
    run_query(
        "CREATE (t:Tree {id: $id, name: $name, owner_id: $owner_id})",
        tree,
    )
    return tree


@router.get("/trees", response_model=list[TreeResponse])
def list_trees(current_user: dict = Depends(get_current_user)):
    return run_query(
        "MATCH (t:Tree {owner_id: $owner_id}) "
        "RETURN t.id AS id, t.name AS name, t.owner_id AS owner_id",
        {"owner_id": current_user["id"]},
    )


@router.get("/trees/{tree_id}", response_model=TreeResponse)
def get_tree(tree: dict = Depends(require_tree_access)):
    return tree


@router.patch("/trees/{tree_id}", response_model=TreeResponse)
def update_tree(body: TreeUpdate, tree: dict = Depends(require_tree_access)):
    if body.name is not None:
        run_query(
            "MATCH (t:Tree {id: $id}) SET t.name = $name",
            {"id": tree["id"], "name": body.name},
        )
        tree["name"] = body.name
    return tree


@router.delete("/trees/{tree_id}", status_code=204)
def delete_tree(tree: dict = Depends(require_tree_access)):
    # Two separate deletes: DETACH DELETE on a node from an OPTIONAL MATCH
    # that found nothing would try to delete a null value, which Neo4j
    # rejects — so people and the tree itself are deleted in separate steps.
    run_query("MATCH (p:Person {tree_id: $tree_id}) DETACH DELETE p", {"tree_id": tree["id"]})
    run_query("MATCH (t:Tree {id: $tree_id}) DETACH DELETE t", {"tree_id": tree["id"]})
