import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.db import run_query
from app.core.dependencies import require_tree_access

# Every route here is under /trees/{tree_id}/..., so the access check is
# attached to the whole router: no route in this file can forget it.
router = APIRouter(dependencies=[Depends(require_tree_access)])


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


class PersonListItem(PersonResponse):
    # Years of every marriage with a known year (a person can have several).
    marriage_years: list[int] = []


@router.get("/trees/{tree_id}/people", response_model=list[PersonListItem])
def list_people_in_tree(tree_id: str, search: str | None = None):
    # `$search IS NULL OR ...` keeps one query for both the plain list and
    # the search; the search text is still a parameter, never concatenated.
    rows = run_query(
        "MATCH (p:Person {tree_id: $tree_id}) "
        "WHERE $search IS NULL OR toLower(p.name) CONTAINS toLower($search) "
        "OPTIONAL MATCH (p)-[m:MARRIED_TO]-(:Person {tree_id: $tree_id}) "
        "WITH p, [y IN collect(m.marriage_year) WHERE y IS NOT NULL] AS marriage_years "
        "RETURN p.id AS id, p.tree_id AS tree_id, p.name AS name, "
        "p.birth_year AS birth_year, p.death_year AS death_year, "
        "p.birth_place AS birth_place, p.notes AS notes, "
        "marriage_years "
        "ORDER BY p.name",
        {"tree_id": tree_id, "search": search or None},
    )
    for row in rows:
        row["marriage_years"].sort()
    return rows


class RelativeRef(BaseModel):
    id: str
    name: str


class SpouseRef(RelativeRef):
    marriage_year: int | None = None
    divorced: bool = False
    divorce_year: int | None = None
    relationship_id: str


class RelativesResponse(BaseModel):
    parents: list[RelativeRef]
    spouses: list[SpouseRef]
    children: list[RelativeRef]


@router.get("/trees/{tree_id}/people/{person_id}/relatives", response_model=RelativesResponse)
def get_relatives(tree_id: str, person_id: str):
    get_person_in_tree(tree_id, person_id)  # raises 404 if missing / other tree
    params = {"person_id": person_id, "tree_id": tree_id}
    parents = run_query(
        "MATCH (x:Person {tree_id: $tree_id})-[:PARENT_OF]->(:Person {id: $person_id, tree_id: $tree_id}) "
        "RETURN x.id AS id, x.name AS name ORDER BY x.name",
        params,
    )
    children = run_query(
        "MATCH (:Person {id: $person_id, tree_id: $tree_id})-[:PARENT_OF]->(x:Person {tree_id: $tree_id}) "
        "RETURN x.id AS id, x.name AS name ORDER BY x.name",
        params,
    )
    spouses = run_query(
        "MATCH (:Person {id: $person_id, tree_id: $tree_id})-[r:MARRIED_TO]-(x:Person {tree_id: $tree_id}) "
        "RETURN x.id AS id, x.name AS name, r.marriage_year AS marriage_year, "
        "coalesce(r.divorced, false) AS divorced, r.divorce_year AS divorce_year, "
        "r.id AS relationship_id ORDER BY x.name",
        params,
    )
    return {"parents": parents, "spouses": spouses, "children": children}


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
