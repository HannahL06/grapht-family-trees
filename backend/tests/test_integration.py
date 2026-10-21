"""Integration tests: these make real calls against the configured AuraDB
instance (Tasks 1.6/1.7). Each test creates and cleans up its own
tree(s)/people — nothing here touches the sample-fam seed data.

Uses the `client` fixture from conftest.py, which triggers FastAPI's
lifespan (ensure_person_indexes() runs against the real database on
every test here).
"""

import pytest


# --- Trees (Task 1.6) -------------------------------------------------

def test_tree_crud_lifecycle(client):
    r = client.post("/trees", json={"name": "Test Tree"})
    assert r.status_code == 200
    tree = r.json()
    assert tree["name"] == "Test Tree"
    assert tree["owner_id"] == "dev-user"
    tree_id = tree["id"]

    r = client.get("/trees")
    assert r.status_code == 200
    assert any(t["id"] == tree_id for t in r.json())

    r = client.get(f"/trees/{tree_id}")
    assert r.status_code == 200
    assert r.json()["id"] == tree_id

    r = client.patch(f"/trees/{tree_id}", json={"name": "Renamed Tree"})
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed Tree"

    r = client.delete(f"/trees/{tree_id}")
    assert r.status_code == 204

    r = client.get(f"/trees/{tree_id}")
    assert r.status_code == 404


def test_get_missing_tree_returns_404(client):
    r = client.get("/trees/does-not-exist")
    assert r.status_code == 404


def test_patch_missing_tree_returns_404(client):
    r = client.patch("/trees/does-not-exist", json={"name": "x"})
    assert r.status_code == 404


def test_delete_missing_tree_returns_404(client):
    r = client.delete("/trees/does-not-exist")
    assert r.status_code == 404


# --- People (Task 1.7) -------------------------------------------------

@pytest.fixture
def tree_ids(client):
    tree_a = client.post("/trees", json={"name": "Tree A"}).json()["id"]
    tree_b = client.post("/trees", json={"name": "Tree B"}).json()["id"]
    yield tree_a, tree_b
    client.delete(f"/trees/{tree_a}")
    client.delete(f"/trees/{tree_b}")


def test_person_crud_lifecycle(client, tree_ids):
    tree_a, _ = tree_ids

    r = client.post(f"/trees/{tree_a}/people", json={"name": "Alice", "birth_year": 1990})
    assert r.status_code == 200
    person = r.json()
    assert person["name"] == "Alice"
    assert person["tree_id"] == tree_a
    person_id = person["id"]

    r = client.get(f"/trees/{tree_a}/people")
    assert r.status_code == 200
    assert any(p["id"] == person_id for p in r.json())

    r = client.get(f"/trees/{tree_a}/people", params={"search": "ali"})
    assert r.status_code == 200
    assert any(p["id"] == person_id for p in r.json())

    r = client.get(f"/trees/{tree_a}/people", params={"search": "zzz-no-match"})
    assert r.status_code == 200
    assert r.json() == []

    r = client.get(f"/trees/{tree_a}/people/{person_id}")
    assert r.status_code == 200
    assert r.json()["name"] == "Alice"

    r = client.patch(f"/trees/{tree_a}/people/{person_id}", json={"birth_place": "Boston"})
    assert r.status_code == 200
    assert r.json()["birth_place"] == "Boston"
    assert r.json()["name"] == "Alice"  # unrelated fields untouched

    r = client.delete(f"/trees/{tree_a}/people/{person_id}")
    assert r.status_code == 204

    r = client.get(f"/trees/{tree_a}/people/{person_id}")
    assert r.status_code == 404


def test_cross_tree_isolation(client, tree_ids):
    tree_a, tree_b = tree_ids
    person_id = client.post(f"/trees/{tree_a}/people", json={"name": "Bob"}).json()["id"]

    # Bob belongs to tree_a — fetching/editing/deleting him through tree_b
    # must behave as if he doesn't exist there.
    r = client.get(f"/trees/{tree_b}/people/{person_id}")
    assert r.status_code == 404

    r = client.patch(f"/trees/{tree_b}/people/{person_id}", json={"name": "Hacked"})
    assert r.status_code == 404

    r = client.delete(f"/trees/{tree_b}/people/{person_id}")
    assert r.status_code == 404

    # he's untouched and still fetchable through the correct tree
    r = client.get(f"/trees/{tree_a}/people/{person_id}")
    assert r.status_code == 200
    assert r.json()["name"] == "Bob"


def test_get_missing_person_returns_404(client, tree_ids):
    tree_a, _ = tree_ids
    r = client.get(f"/trees/{tree_a}/people/does-not-exist")
    assert r.status_code == 404
