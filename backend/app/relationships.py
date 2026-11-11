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
    # Only meaningful for MARRIED_TO; rejected with a 400 on PARENT_OF.
    marriage_year: int | None = None


class RelationshipUpdate(BaseModel):
    marriage_year: int | None = None


class RelationshipResponse(BaseModel):
    relationship_id: str
    person_a_id: str
    person_b_id: str
    type: RelationshipType
    marriage_year: int | None = None


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

    if body.marriage_year is not None and body.type != RelationshipType.MARRIED_TO:
        raise HTTPException(
            status_code=400, detail="marriage_year only applies to MARRIED_TO relationships."
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
        marriage_year = None
    else:
        # MARRIED_TO has no fixed direction, so MERGE on one direction alone
        # isn't enough — check both directions explicitly before creating.
        existing = run_query(
            "MATCH (a:Person {id: $a_id, tree_id: $tree_id})"
            "-[r:MARRIED_TO]-"
            "(b:Person {id: $b_id, tree_id: $tree_id}) "
            "RETURN r.id AS relationship_id, r.marriage_year AS marriage_year LIMIT 1",
            {"a_id": body.person_a_id, "b_id": body.person_b_id, "tree_id": tree_id},
        )
        if existing:
            relationship_id = existing[0]["relationship_id"]
            marriage_year = existing[0]["marriage_year"]
            if body.marriage_year is not None:
                # Re-posting an existing marriage with a year fills in/updates it.
                run_query(
                    "MATCH (:Person {tree_id: $tree_id})-[r:MARRIED_TO {id: $rid}]-"
                    "(:Person {tree_id: $tree_id}) SET r.marriage_year = $year",
                    {"tree_id": tree_id, "rid": relationship_id, "year": body.marriage_year},
                )
                marriage_year = body.marriage_year
        else:
            relationship_id = str(uuid.uuid4())
            marriage_year = body.marriage_year
            run_query(
                "MATCH (a:Person {id: $a_id, tree_id: $tree_id}), "
                "(b:Person {id: $b_id, tree_id: $tree_id}) "
                "CREATE (a)-[r:MARRIED_TO {id: $new_id, marriage_year: $year}]->(b)",
                {
                    "a_id": body.person_a_id,
                    "b_id": body.person_b_id,
                    "tree_id": tree_id,
                    "new_id": relationship_id,
                    "year": marriage_year,
                },
            )

    return {
        "relationship_id": relationship_id,
        "person_a_id": body.person_a_id,
        "person_b_id": body.person_b_id,
        "type": body.type,
        "marriage_year": marriage_year,
    }


@router.patch(
    "/trees/{tree_id}/relationships/{relationship_id}", response_model=RelationshipResponse
)
def update_relationship(tree_id: str, relationship_id: str, body: RelationshipUpdate):
    # Same isolation as DELETE: both endpoints must be in this tree.
    rows = run_query(
        "MATCH (a:Person {tree_id: $tree_id})-[r {id: $rid}]->(b:Person {tree_id: $tree_id}) "
        "RETURN a.id AS person_a_id, b.id AS person_b_id, type(r) AS type",
        {"tree_id": tree_id, "rid": relationship_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Relationship not found")
    rel = rows[0]
    if rel["type"] != "MARRIED_TO":
        raise HTTPException(
            status_code=400, detail="Only MARRIED_TO relationships can be edited."
        )

    run_query(
        "MATCH (:Person {tree_id: $tree_id})-[r:MARRIED_TO {id: $rid}]->(:Person {tree_id: $tree_id}) "
        "SET r.marriage_year = $year",
        {"tree_id": tree_id, "rid": relationship_id, "year": body.marriage_year},
    )
    return {
        "relationship_id": relationship_id,
        "person_a_id": rel["person_a_id"],
        "person_b_id": rel["person_b_id"],
        "type": rel["type"],
        "marriage_year": body.marriage_year,
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
