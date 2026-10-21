import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.db import run_query

router = APIRouter()


def ensure_person_indexes() -> None:
    """Call once at app startup. Every query below filters on id+tree_id
    together, so both need an index for this to stay fast as data grows."""
    run_query("CREATE INDEX person_id_index IF NOT EXISTS FOR (p:Person) ON (p.id)")
    run_query("CREATE INDEX person_tree_id_index IF NOT EXISTS FOR (p:Person) ON (p.tree_id)")


class PersonCreate(BaseModel):
    name: str
    birth_year: int | None = None
    death_year: int | None = None
    birth_place: str | None = None
    notes: str | None = None


class PersonUpdate(BaseModel):
    name: str | None = None
    birth_year: int | None = None
    death_year: int | None = None
    birth_place: str | None = None
    notes: str | None = None


class PersonResponse(BaseModel):
    id: str
    tree_id: str
    name: str
    birth_year: int | None = None
    death_year: int | None = None
    birth_place: str | None = None
    notes: str | None = None


@router.post("/trees/{tree_id}/people", response_model=PersonResponse)
def create_person_in_tree(tree_id: str, body: PersonCreate):
    person = {
        "id": str(uuid.uuid4()),
        "tree_id": tree_id,
        "name": body.name,
        "birth_year": body.birth_year,
        "death_year": body.death_year,
        "birth_place": body.birth_place,
        "notes": body.notes,
    }
    run_query(
        "CREATE (p:Person {id: $id, tree_id: $tree_id, name: $name, "
        "birth_year: $birth_year, death_year: $death_year, "
        "birth_place: $birth_place, notes: $notes})",
        person,
    )
    return person


@router.get("/trees/{tree_id}/people", response_model=list[PersonResponse])
def list_people_in_tree(tree_id: str, search: str | None = None):
    if search:
        return run_query(
            "MATCH (p:Person {tree_id: $tree_id}) "
            "WHERE toLower(p.name) CONTAINS toLower($search) "
            "RETURN p.id AS id, p.tree_id AS tree_id, p.name AS name, "
            "p.birth_year AS birth_year, p.death_year AS death_year, "
            "p.birth_place AS birth_place, p.notes AS notes "
            "ORDER BY p.name",
            {"tree_id": tree_id, "search": search},
        )
    return run_query(
        "MATCH (p:Person {tree_id: $tree_id}) "
        "RETURN p.id AS id, p.tree_id AS tree_id, p.name AS name, "
        "p.birth_year AS birth_year, p.death_year AS death_year, "
        "p.birth_place AS birth_place, p.notes AS notes "
        "ORDER BY p.name",
        {"tree_id": tree_id},
    )


@router.get("/trees/{tree_id}/people/{person_id}", response_model=PersonResponse)
def get_person_in_tree(tree_id: str, person_id: str):
    rows = run_query(
        "MATCH (p:Person {id: $person_id, tree_id: $tree_id}) "
        "RETURN p.id AS id, p.tree_id AS tree_id, p.name AS name, "
        "p.birth_year AS birth_year, p.death_year AS death_year, "
        "p.birth_place AS birth_place, p.notes AS notes",
        {"person_id": person_id, "tree_id": tree_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Person not found")
    return rows[0]


@router.patch("/trees/{tree_id}/people/{person_id}", response_model=PersonResponse)
def update_person_in_tree(tree_id: str, person_id: str, body: PersonUpdate):
    existing = get_person_in_tree(tree_id, person_id)  # raises 404 if missing
    updates = body.model_dump(exclude_unset=True)
    if updates:
        # NOT a Cypher injection risk, despite the f-string: `updates.keys()`
        # can only be field names from PersonUpdate (name/birth_year/etc.) —
        # a fixed set defined by the schema above, never raw request text.
        # Every VALUE is still a real parameter ($name, $birth_year, ...).
        set_clause = ", ".join(f"p.{field} = ${field}" for field in updates)
        run_query(
            f"MATCH (p:Person {{id: $person_id, tree_id: $tree_id}}) SET {set_clause}",
            {"person_id": person_id, "tree_id": tree_id, **updates},
        )
        existing.update(updates)
    return existing


@router.delete("/trees/{tree_id}/people/{person_id}", status_code=204)
def delete_person_in_tree(tree_id: str, person_id: str):
    get_person_in_tree(tree_id, person_id)  # raises 404 if missing
    run_query(
        "MATCH (p:Person {id: $person_id, tree_id: $tree_id}) DETACH DELETE p",
        {"person_id": person_id, "tree_id": tree_id},
    )
