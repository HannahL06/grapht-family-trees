import uuid
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.db import run_query
from app.core.dependencies import require_tree_access

# Every route here is under /trees/{tree_id}/..., so the access check is
# attached to the whole router: no route in this file can forget it.
router = APIRouter(dependencies=[Depends(require_tree_access)])


class RelationshipType(str, Enum):
    PARENT_OF = "PARENT_OF"
    MARRIED_TO = "MARRIED_TO"


class RelationshipCreate(BaseModel):
    person_a_id: str
    person_b_id: str
    type: RelationshipType


class RelationshipResponse(BaseModel):
    relationship_id: str
    person_a_id: str
    person_b_id: str
    type: RelationshipType


def _both_people_in_tree(tree_id: str, person_a_id: str, person_b_id: str) -> bool:
    rows = run_query(
        "MATCH (p:Person) WHERE p.id IN [$a_id, $b_id] AND p.tree_id = $tree_id "
        "RETURN count(p) AS c",
        {"a_id": person_a_id, "b_id": person_b_id, "tree_id": tree_id},
    )
    return rows[0]["c"] == 2


@router.post("/trees/{tree_id}/relationships", response_model=RelationshipResponse)
def create_relationship(tree_id: str, body: RelationshipCreate):
    if body.person_a_id == body.person_b_id:
        raise HTTPException(
            status_code=400, detail="A person cannot have a relationship with themself."
        )

    if not _both_people_in_tree(tree_id, body.person_a_id, body.person_b_id):
        raise HTTPException(status_code=404, detail="Both people must exist in this tree.")

    if body.type == RelationshipType.PARENT_OF:
        # MERGE on the exact directed pattern: creates it if new, or returns
        # the existing one if this exact edge already exists — either way,
        # calling this twice never produces two parallel edges.
        rows = run_query(
            "MATCH (a:Person {id: $a_id, tree_id: $tree_id}), "
            "(b:Person {id: $b_id, tree_id: $tree_id}) "
            "MERGE (a)-[r:PARENT_OF]->(b) "
            "ON CREATE SET r.id = $new_id "
            "RETURN r.id AS relationship_id",
            {
                "a_id": body.person_a_id,
                "b_id": body.person_b_id,
                "tree_id": tree_id,
                "new_id": str(uuid.uuid4()),
            },
        )
        relationship_id = rows[0]["relationship_id"]
    else:
        # MARRIED_TO has no fixed direction, so MERGE on one direction alone
        # isn't enough — check both directions explicitly before creating.
        existing = run_query(
            "MATCH (a:Person {id: $a_id, tree_id: $tree_id})"
            "-[r:MARRIED_TO]-"
            "(b:Person {id: $b_id, tree_id: $tree_id}) "
            "RETURN r.id AS relationship_id LIMIT 1",
            {"a_id": body.person_a_id, "b_id": body.person_b_id, "tree_id": tree_id},
        )
        if existing:
            relationship_id = existing[0]["relationship_id"]
        else:
            relationship_id = str(uuid.uuid4())
            run_query(
                "MATCH (a:Person {id: $a_id, tree_id: $tree_id}), "
                "(b:Person {id: $b_id, tree_id: $tree_id}) "
                "CREATE (a)-[r:MARRIED_TO {id: $new_id}]->(b)",
                {
                    "a_id": body.person_a_id,
                    "b_id": body.person_b_id,
                    "tree_id": tree_id,
                    "new_id": relationship_id,
                },
            )

    return {
        "relationship_id": relationship_id,
        "person_a_id": body.person_a_id,
        "person_b_id": body.person_b_id,
        "type": body.type,
    }


@router.delete("/trees/{tree_id}/relationships/{relationship_id}", status_code=204)
def delete_relationship(tree_id: str, relationship_id: str):
    # Tree isolation: the relationship must connect two people who are BOTH
    # in this tree, not just exist somewhere — same principle as people.py.
    rows = run_query(
        "MATCH (a:Person {tree_id: $tree_id})-[r {id: $relationship_id}]-"
        "(b:Person {tree_id: $tree_id}) "
        "RETURN count(r) AS c",
        {"tree_id": tree_id, "relationship_id": relationship_id},
    )
    if rows[0]["c"] == 0:
        raise HTTPException(status_code=404, detail="Relationship not found")

    run_query(
        "MATCH (:Person {tree_id: $tree_id})-[r {id: $relationship_id}]-"
        "(:Person {tree_id: $tree_id}) "
        "DELETE r",
        {"tree_id": tree_id, "relationship_id": relationship_id},
    )
