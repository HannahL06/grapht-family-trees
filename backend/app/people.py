"""Sprint-only: simple person/spouse/child creation for the demo page.

NOTE: hardcoded to a single tree for now. When this becomes the real
`people` feature (Task 1.5+), these functions move behind real schemas
and a tree_id taken from an authorized route, not a constant.
"""

import uuid

from pydantic import BaseModel

from app.core.db import run_query

SAMPLE_TREE_ID = "sample-fam"


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


def add_person(name: str, birth_year: int | None = None) -> dict:
    """Create a standalone Person node with no relationships yet."""
    new_person = {
        "id": str(uuid.uuid4()),
        "tree_id": SAMPLE_TREE_ID,
        "name": name,
        "birth_year": birth_year,
    }
    run_query(
        "CREATE (p:Person {id: $id, tree_id: $tree_id, name: $name, birth_year: $birth_year})",
        new_person,
    )
    return new_person


def add_spouse(person_id: str, spouse_name: str, spouse_birth_year: int | None = None) -> dict:
    """Create a new person and marry them to an existing person.

    The MARRIED_TO edge gets its own `id` property (a UUID set here in
    Python), the same pattern as Person.id — not elementId(r), which
    Neo4j's own docs say isn't guaranteed stable across restores/dumps/
    database copies. See design.md's MARRIED_TO section.
    """
    spouse = add_person(spouse_name, spouse_birth_year)
    run_query(
        "MATCH (a:Person {id: $person_id}), (b:Person {id: $spouse_id}) "
        "MERGE (a)-[r:MARRIED_TO]->(b) "
        "ON CREATE SET r.id = $relationship_id",
        {
            "person_id": person_id,
            "spouse_id": spouse["id"],
            "relationship_id": str(uuid.uuid4()),
        },
    )
    return spouse


def add_child(
    parent_id: str,
    child_name: str,
    second_parent_id: str | None = None,
    child_birth_year: int | None = None,
) -> dict:
    """Create a new person as the child of one or two existing people.

    Each PARENT_OF edge gets its own `id` property, same reasoning as
    add_spouse above. One UUID is generated per parent, since each parent
    gets a separate edge.
    """
    child = add_person(child_name, child_birth_year)
    parent_ids = [parent_id] + ([second_parent_id] if second_parent_id else [])
    pairs = [{"parent_id": pid, "relationship_id": str(uuid.uuid4())} for pid in parent_ids]
    run_query(
        "UNWIND $pairs AS pair "
        "MATCH (parent:Person {id: pair.parent_id}), (child:Person {id: $child_id}) "
        "MERGE (parent)-[r:PARENT_OF]->(child) "
        "ON CREATE SET r.id = pair.relationship_id",
        {"pairs": pairs, "child_id": child["id"]},
    )
    return child


def link_child(parent_id: str, child_id: str) -> None:
    """Connect two EXISTING people with a PARENT_OF edge (parent_id -> child_id).

    Unlike add_child, neither person is created here — both must already
    exist. Uses MERGE (not CREATE) so calling this twice for the same pair
    does not create a duplicate edge, per design.md's PARENT_OF rules.
    """
    if parent_id == child_id:
        raise ValueError("A person cannot be their own parent or child.")
    run_query(
        "MATCH (parent:Person {id: $parent_id}), (child:Person {id: $child_id}) "
        "MERGE (parent)-[r:PARENT_OF]->(child) "
        "ON CREATE SET r.id = $relationship_id",
        {
            "parent_id": parent_id,
            "child_id": child_id,
            "relationship_id": str(uuid.uuid4()),
        },
    )


def link_parent(child_id: str, parent_id: str) -> None:
    """Connect two EXISTING people with a PARENT_OF edge (parent_id -> child_id).

    Same underlying operation as link_child — a PARENT_OF edge points the
    same way regardless of which person you picked first in the UI. This
    separate name/argument order matches the "pick a child, then add their
    parent" form, as opposed to link_child's "pick a parent, add their child."
    """
    link_child(parent_id, child_id)


def list_people() -> list[dict]:
    return run_query(
        "MATCH (p:Person {tree_id: $tree_id}) RETURN p.id AS id, p.name AS name "
        "ORDER BY p.name",
        {"tree_id": SAMPLE_TREE_ID},
    )


def get_graph() -> dict:
    nodes = run_query(
        "MATCH (p:Person {tree_id: $tree_id}) RETURN p.id AS id, p.name AS name",
        {"tree_id": SAMPLE_TREE_ID},
    )
    edges = run_query(
        "MATCH (a:Person {tree_id: $tree_id})-[r]->(b:Person {tree_id: $tree_id}) "
        "RETURN r.id AS id, a.id AS source, b.id AS target, type(r) AS type",
        {"tree_id": SAMPLE_TREE_ID},
    )
    return {"nodes": nodes, "edges": edges}
