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
    # The three fields below only apply to MARRIED_TO (rejected on PARENT_OF).
    marriage_year: int | None = None
    # A divorced marriage is a past one; the UI shows it faded. Giving a
    # divorce_year implies divorced; divorced=false with a year is a 400.
    divorced: bool = False
    divorce_year: int | None = None


class RelationshipUpdate(BaseModel):
    # Only fields that are actually sent are changed. marriage_year and
    # divorce_year: null clears them. divorced: null means "no change";
    # false also clears divorce_year.
    marriage_year: int | None = None
    divorced: bool | None = None
    divorce_year: int | None = None


class RelationshipResponse(BaseModel):
    relationship_id: str
    person_a_id: str
    person_b_id: str
    type: RelationshipType
    marriage_year: int | None = None
    divorced: bool = False
    divorce_year: int | None = None


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

    is_marriage = body.type == RelationshipType.MARRIED_TO
    if not is_marriage and (
        body.marriage_year is not None or body.divorced or body.divorce_year is not None
    ):
        raise HTTPException(
            status_code=400,
            detail="marriage_year, divorced and divorce_year only apply to MARRIED_TO.",
        )

    sent = body.model_fields_set
    if body.divorce_year is not None and "divorced" in sent and not body.divorced:
        raise HTTPException(
            status_code=400, detail="divorce_year requires divorced to be true."
        )

    if not _both_people_in_tree(tree_id, body.person_a_id, body.person_b_id):
        raise HTTPException(status_code=404, detail="Both people must exist in this tree.")

    marriage_year = None
    divorced = False
    divorce_year = None

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
            "RETURN r.id AS relationship_id, r.marriage_year AS marriage_year, "
            "coalesce(r.divorced, false) AS divorced, r.divorce_year AS divorce_year LIMIT 1",
            {"a_id": body.person_a_id, "b_id": body.person_b_id, "tree_id": tree_id},
        )
        if existing:
            relationship_id = existing[0]["relationship_id"]
            old = existing[0]
            marriage_year, divorced, divorce_year = (
                old["marriage_year"],
                old["divorced"],
                old["divorce_year"],
            )
            # Re-posting an existing marriage updates only fields that were
            # actually sent (a default `divorced: false` is not "sent").
            if body.marriage_year is not None:
                marriage_year = body.marriage_year
            if "divorced" in sent:
                divorced = body.divorced
                if not divorced:
                    divorce_year = None
            if body.divorce_year is not None:
                divorced, divorce_year = True, body.divorce_year
            if (marriage_year, divorced, divorce_year) != (
                old["marriage_year"],
                old["divorced"],
                old["divorce_year"],
            ):
                run_query(
                    "MATCH (:Person {tree_id: $tree_id})-[r:MARRIED_TO {id: $rid}]-"
                    "(:Person {tree_id: $tree_id}) "
                    "SET r.marriage_year = $marriage_year, r.divorced = $divorced, "
                    "r.divorce_year = $divorce_year",
                    {
                        "tree_id": tree_id,
                        "rid": relationship_id,
                        "marriage_year": marriage_year,
                        "divorced": divorced,
                        "divorce_year": divorce_year,
                    },
                )
        else:
            relationship_id = str(uuid.uuid4())
            marriage_year = body.marriage_year
            divorce_year = body.divorce_year
            divorced = body.divorced or divorce_year is not None
            run_query(
                "MATCH (a:Person {id: $a_id, tree_id: $tree_id}), "
                "(b:Person {id: $b_id, tree_id: $tree_id}) "
                "CREATE (a)-[r:MARRIED_TO {id: $new_id, marriage_year: $marriage_year, "
                "divorced: $divorced, divorce_year: $divorce_year}]->(b)",
                {
                    "a_id": body.person_a_id,
                    "b_id": body.person_b_id,
                    "tree_id": tree_id,
                    "new_id": relationship_id,
                    "marriage_year": marriage_year,
                    "divorced": divorced,
                    "divorce_year": divorce_year,
                },
            )

    return {
        "relationship_id": relationship_id,
        "person_a_id": body.person_a_id,
        "person_b_id": body.person_b_id,
        "type": body.type,
        "marriage_year": marriage_year,
        "divorced": divorced,
        "divorce_year": divorce_year,
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

    # Only change fields that were sent. The SET clause is built from field
    # names of RelationshipUpdate (a fixed set), never from request text; the
    # values are real parameters.
    updates = body.model_dump(exclude_unset=True)
    if updates.get("divorced") is None:
        updates.pop("divorced", None)  # null divorced = no change
    if updates.get("divorce_year") is not None:
        if updates.get("divorced") is False:
            raise HTTPException(
                status_code=400, detail="divorce_year requires divorced to be true."
            )
        updates["divorced"] = True  # a divorce year implies divorced
    if updates.get("divorced") is False:
        updates["divorce_year"] = None  # un-divorcing clears the year
    if updates:
        set_clause = ", ".join(f"r.{field} = ${field}" for field in updates)
        run_query(
            "MATCH (:Person {tree_id: $tree_id})-[r:MARRIED_TO {id: $rid}]->"
            f"(:Person {{tree_id: $tree_id}}) SET {set_clause}",
            {"tree_id": tree_id, "rid": relationship_id, **updates},
        )
    current = run_query(
        "MATCH (:Person {tree_id: $tree_id})-[r:MARRIED_TO {id: $rid}]->"
        "(:Person {tree_id: $tree_id}) "
        "RETURN r.marriage_year AS marriage_year, coalesce(r.divorced, false) AS divorced, "
        "r.divorce_year AS divorce_year",
        {"tree_id": tree_id, "rid": relationship_id},
    )[0]
    return {
        "relationship_id": relationship_id,
        "person_a_id": rel["person_a_id"],
        "person_b_id": rel["person_b_id"],
        "type": rel["type"],
        **current,
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
