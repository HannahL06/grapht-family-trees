"""Integration tests: these make real calls against the configured AuraDB
instance (Tasks 1.6/1.7/1.8/1.9/1.10). Each test creates and cleans up its
own tree(s)/people/users — nothing here touches the sample-fam seed data.

Uses the `client` fixture from conftest.py, which triggers FastAPI's
lifespan (ensure_person_indexes() runs against the real database on
every test here).
"""

import uuid

import pytest

from app.core.db import run_query


# --- Auth (Task 1.9) ----------------------------------------------------

@pytest.fixture
def register_user(client):
    created_emails = []

    def _register(name="Test User", email=None, password="correct-horse-battery-staple"):
        if email is None:
            email = f"test-{uuid.uuid4()}@example.com"
        resp = client.post(
            "/api/auth/register", json={"name": name, "email": email, "password": password}
        )
        if resp.status_code == 201:
            created_emails.append(email.lower())
        return resp

    yield _register

    for email in created_emails:
        run_query("MATCH (u:User {email: $email}) DETACH DELETE u", {"email": email})


def test_register_new_user_returns_201(register_user):
    resp = register_user(name="Alice Example")
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Alice Example"
    assert "password" not in body
    assert "password_hash" not in body


def test_register_duplicate_email_rejected(register_user):
    email = f"dup-{uuid.uuid4()}@example.com"
    first = register_user(email=email)
    assert first.status_code == 201

    # same email, different case — must still be caught as a duplicate
    second = register_user(email=email.upper(), name="Someone Else")
    assert second.status_code == 400


def test_register_normalizes_email_to_lowercase(register_user):
    email = f"case-{uuid.uuid4()}@example.com"
    resp = register_user(email=email.upper())
    assert resp.status_code == 201
    assert resp.json()["email"] == email.lower()


# --- Login / JWT (Task 1.10) --------------------------------------------

LOGIN_PASSWORD = "correct-horse-battery-staple"


@pytest.fixture
def logged_in_user(client, register_user):
    email = f"login-{uuid.uuid4()}@example.com"
    register_user(email=email, password=LOGIN_PASSWORD)
    tokens = client.post(
        "/api/auth/login", json={"email": email, "password": LOGIN_PASSWORD}
    ).json()
    return email, tokens


def test_login_returns_tokens(logged_in_user):
    _email, tokens = logged_in_user
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"


def test_login_wrong_password_rejected(client, register_user):
    email = f"wrongpw-{uuid.uuid4()}@example.com"
    register_user(email=email, password=LOGIN_PASSWORD)
    r = client.post("/api/auth/login", json={"email": email, "password": "not-the-password"})
    assert r.status_code == 401


def test_login_unknown_email_rejected(client):
    r = client.post(
        "/api/auth/login", json={"email": "nobody-at-all@example.com", "password": "x"}
    )
    assert r.status_code == 401


def test_me_with_valid_token(client, logged_in_user):
    email, tokens = logged_in_user
    r = client.get("/api/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 200
    assert r.json()["email"] == email


def test_me_without_token_rejected(client):
    r = client.get("/api/me")
    assert r.status_code == 401


def test_me_with_garbage_token_rejected(client):
    r = client.get("/api/me", headers={"Authorization": "Bearer garbage.not.valid"})
    assert r.status_code == 401


def test_me_with_refresh_token_rejected(client, logged_in_user):
    """A refresh token must not work as an access token, even though both
    are valid, correctly-signed JWTs — only the `type` claim tells them apart."""
    _email, tokens = logged_in_user
    r = client.get("/api/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"})
    assert r.status_code == 401


def test_refresh_issues_new_access_token(client, logged_in_user):
    _email, tokens = logged_in_user
    r = client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_refresh_with_access_token_rejected(client, logged_in_user):
    _email, tokens = logged_in_user
    r = client.post("/api/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert r.status_code == 401


def test_logout_returns_200(client):
    r = client.post("/api/auth/logout")
    assert r.status_code == 200


# --- Trees (Task 1.6) -------------------------------------------------

def test_tree_crud_lifecycle(authed_client):
    r = authed_client.post("/api/trees", json={"name": "Test Tree"})
    assert r.status_code == 200
    tree = r.json()
    assert tree["name"] == "Test Tree"
    assert tree["owner_id"] == authed_client.get("/api/me").json()["id"]
    tree_id = tree["id"]

    r = authed_client.get("/api/trees")
    assert r.status_code == 200
    assert any(t["id"] == tree_id for t in r.json())

    r = authed_client.get(f"/api/trees/{tree_id}")
    assert r.status_code == 200
    assert r.json()["id"] == tree_id

    r = authed_client.patch(f"/api/trees/{tree_id}", json={"name": "Renamed Tree"})
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed Tree"

    r = authed_client.delete(f"/api/trees/{tree_id}")
    assert r.status_code == 204

    r = authed_client.get(f"/api/trees/{tree_id}")
    assert r.status_code == 404


def test_get_missing_tree_returns_404(authed_client):
    r = authed_client.get("/api/trees/does-not-exist")
    assert r.status_code == 404


def test_patch_missing_tree_returns_404(authed_client):
    r = authed_client.patch("/api/trees/does-not-exist", json={"name": "x"})
    assert r.status_code == 404


def test_delete_missing_tree_returns_404(authed_client):
    r = authed_client.delete("/api/trees/does-not-exist")
    assert r.status_code == 404


# --- People (Task 1.7) -------------------------------------------------

@pytest.fixture
def tree_ids(authed_client):
    tree_a = authed_client.post("/api/trees", json={"name": "Tree A"}).json()["id"]
    tree_b = authed_client.post("/api/trees", json={"name": "Tree B"}).json()["id"]
    yield tree_a, tree_b
    authed_client.delete(f"/api/trees/{tree_a}")
    authed_client.delete(f"/api/trees/{tree_b}")


def test_person_crud_lifecycle(authed_client, tree_ids):
    tree_a, _ = tree_ids

    r = authed_client.post(f"/api/trees/{tree_a}/people", json={"name": "Alice", "birth_year": 1990})
    assert r.status_code == 200
    person = r.json()
    assert person["name"] == "Alice"
    assert person["tree_id"] == tree_a
    person_id = person["id"]

    r = authed_client.get(f"/api/trees/{tree_a}/people")
    assert r.status_code == 200
    assert any(p["id"] == person_id for p in r.json())

    r = authed_client.get(f"/api/trees/{tree_a}/people", params={"search": "ali"})
    assert r.status_code == 200
    assert any(p["id"] == person_id for p in r.json())

    r = authed_client.get(f"/api/trees/{tree_a}/people", params={"search": "zzz-no-match"})
    assert r.status_code == 200
    assert r.json() == []

    r = authed_client.get(f"/api/trees/{tree_a}/people/{person_id}")
    assert r.status_code == 200
    assert r.json()["name"] == "Alice"

    r = authed_client.patch(f"/api/trees/{tree_a}/people/{person_id}", json={"birth_place": "Boston"})
    assert r.status_code == 200
    assert r.json()["birth_place"] == "Boston"
    assert r.json()["name"] == "Alice"  # unrelated fields untouched

    r = authed_client.delete(f"/api/trees/{tree_a}/people/{person_id}")
    assert r.status_code == 204

    r = authed_client.get(f"/api/trees/{tree_a}/people/{person_id}")
    assert r.status_code == 404


def test_cross_tree_isolation(authed_client, tree_ids):
    tree_a, tree_b = tree_ids
    person_id = authed_client.post(f"/api/trees/{tree_a}/people", json={"name": "Bob"}).json()["id"]

    # Bob belongs to tree_a — fetching/editing/deleting him through tree_b
    # must behave as if he doesn't exist there.
    r = authed_client.get(f"/api/trees/{tree_b}/people/{person_id}")
    assert r.status_code == 404

    r = authed_client.patch(f"/api/trees/{tree_b}/people/{person_id}", json={"name": "Hacked"})
    assert r.status_code == 404

    r = authed_client.delete(f"/api/trees/{tree_b}/people/{person_id}")
    assert r.status_code == 404

    # he's untouched and still fetchable through the correct tree
    r = authed_client.get(f"/api/trees/{tree_a}/people/{person_id}")
    assert r.status_code == 200
    assert r.json()["name"] == "Bob"


def test_get_missing_person_returns_404(authed_client, tree_ids):
    tree_a, _ = tree_ids
    r = authed_client.get(f"/api/trees/{tree_a}/people/does-not-exist")
    assert r.status_code == 404


# --- Relationships (Task 1.8) ------------------------------------------

def _add_person(authed_client, tree_id, name):
    return authed_client.post(f"/api/trees/{tree_id}/people", json={"name": name}).json()["id"]


def test_parent_of_create_is_idempotent(authed_client, tree_ids):
    """Creating the same PARENT_OF edge twice must not produce a duplicate
    (MERGE, not CREATE) — same relationship_id both times."""
    tree_a, _ = tree_ids
    parent_id = _add_person(authed_client, tree_a, "Parent")
    child_id = _add_person(authed_client, tree_a, "Child")

    r1 = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": parent_id, "person_b_id": child_id, "type": "PARENT_OF"},
    )
    assert r1.status_code == 200
    rel_id_1 = r1.json()["relationship_id"]

    r2 = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": parent_id, "person_b_id": child_id, "type": "PARENT_OF"},
    )
    assert r2.status_code == 200
    rel_id_2 = r2.json()["relationship_id"]

    assert rel_id_1 == rel_id_2  # no duplicate edge was created


def test_married_to_detects_existing_regardless_of_direction(authed_client, tree_ids):
    """MERGE alone only checks one direction — this proves the explicit
    both-directions check actually works, by creating a->b then b->a."""
    tree_a, _ = tree_ids
    alice_id = _add_person(authed_client, tree_a, "Alice")
    bob_id = _add_person(authed_client, tree_a, "Bob")

    r1 = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": alice_id, "person_b_id": bob_id, "type": "MARRIED_TO"},
    )
    assert r1.status_code == 200
    rel_id_1 = r1.json()["relationship_id"]

    # reversed order on purpose
    r2 = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": bob_id, "person_b_id": alice_id, "type": "MARRIED_TO"},
    )
    assert r2.status_code == 200
    rel_id_2 = r2.json()["relationship_id"]

    assert rel_id_1 == rel_id_2  # recognized as the same existing marriage


def test_married_to_allows_polygamy(authed_client, tree_ids):
    """No count limit on MARRIED_TO — one person can have multiple
    distinct partners, each a separate edge."""
    tree_a, _ = tree_ids
    person_id = _add_person(authed_client, tree_a, "Person")
    partner_1 = _add_person(authed_client, tree_a, "Partner One")
    partner_2 = _add_person(authed_client, tree_a, "Partner Two")

    r1 = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": person_id, "person_b_id": partner_1, "type": "MARRIED_TO"},
    )
    r2 = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": person_id, "person_b_id": partner_2, "type": "MARRIED_TO"},
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["relationship_id"] != r2.json()["relationship_id"]


def test_self_relationship_rejected(authed_client, tree_ids):
    tree_a, _ = tree_ids
    person_id = _add_person(authed_client, tree_a, "Solo")
    r = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": person_id, "person_b_id": person_id, "type": "PARENT_OF"},
    )
    assert r.status_code == 400


def test_relationship_rejects_person_from_other_tree(authed_client, tree_ids):
    tree_a, tree_b = tree_ids
    person_a = _add_person(authed_client, tree_a, "InTreeA")
    person_b = _add_person(authed_client, tree_b, "InTreeB")

    r = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": person_a, "person_b_id": person_b, "type": "PARENT_OF"},
    )
    assert r.status_code == 404


def test_invalid_relationship_type_rejected(authed_client, tree_ids):
    tree_a, _ = tree_ids
    a = _add_person(authed_client, tree_a, "A")
    b = _add_person(authed_client, tree_a, "B")
    r = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": a, "person_b_id": b, "type": "NONSENSE"},
    )
    assert r.status_code == 422  # FastAPI/Pydantic rejects it before our code runs


def test_delete_relationship(authed_client, tree_ids):
    tree_a, _ = tree_ids
    a = _add_person(authed_client, tree_a, "A")
    b = _add_person(authed_client, tree_a, "B")
    rel_id = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": a, "person_b_id": b, "type": "PARENT_OF"},
    ).json()["relationship_id"]

    r = authed_client.delete(f"/api/trees/{tree_a}/relationships/{rel_id}")
    assert r.status_code == 204

    # deleting again — it's gone now, so 404
    r = authed_client.delete(f"/api/trees/{tree_a}/relationships/{rel_id}")
    assert r.status_code == 404


def test_delete_relationship_cross_tree_rejected(authed_client, tree_ids):
    tree_a, tree_b = tree_ids
    a = _add_person(authed_client, tree_a, "A")
    b = _add_person(authed_client, tree_a, "B")
    rel_id = authed_client.post(
        f"/api/trees/{tree_a}/relationships",
        json={"person_a_id": a, "person_b_id": b, "type": "PARENT_OF"},
    ).json()["relationship_id"]

    # the relationship is in tree_a — deleting it through tree_b must fail
    r = authed_client.delete(f"/api/trees/{tree_b}/relationships/{rel_id}")
    assert r.status_code == 404

    # and it must still exist afterward, deletable through the real tree
    r = authed_client.delete(f"/api/trees/{tree_a}/relationships/{rel_id}")
    assert r.status_code == 204


# --- Tree ownership & access (Task 1.11) --------------------------------

def test_tree_routes_require_login(client):
    """No token -> 401 on every tree-scoped route, whether or not the tree exists."""
    assert client.get("/api/trees").status_code == 401
    assert client.post("/api/trees", json={"name": "x"}).status_code == 401
    assert client.get("/api/trees/anything").status_code == 401
    assert client.get("/api/trees/anything/people").status_code == 401
    assert client.post("/api/trees/anything/people", json={"name": "x"}).status_code == 401
    assert client.get("/api/trees/anything/graph").status_code == 401
    assert client.post(
        "/api/trees/anything/relationships",
        json={"person_a_id": "a", "person_b_id": "b", "type": "PARENT_OF"},
    ).status_code == 401


def test_create_tree_saves_logged_in_user_as_owner(authed_client):
    me = authed_client.get("/api/me").json()
    tree = authed_client.post("/api/trees", json={"name": "Mine"}).json()
    try:
        assert tree["owner_id"] == me["id"]
    finally:
        authed_client.delete(f"/api/trees/{tree['id']}")


def test_list_trees_returns_only_own_trees(make_authed_client):
    user_a = make_authed_client()
    user_b = make_authed_client()
    tree_a = user_a.post("/api/trees", json={"name": "A's tree"}).json()["id"]
    try:
        assert any(t["id"] == tree_a for t in user_a.get("/api/trees").json())
        assert not any(t["id"] == tree_a for t in user_b.get("/api/trees").json())
    finally:
        user_a.delete(f"/api/trees/{tree_a}")


def test_other_users_tree_returns_403(make_authed_client):
    user_a = make_authed_client()
    user_b = make_authed_client()
    tree_a = user_a.post("/api/trees", json={"name": "A's tree"}).json()["id"]
    try:
        assert user_b.get(f"/api/trees/{tree_a}").status_code == 403
        assert user_b.patch(f"/api/trees/{tree_a}", json={"name": "Hijacked"}).status_code == 403
        assert user_b.delete(f"/api/trees/{tree_a}").status_code == 403

        # untouched by B's attempts
        still_there = user_a.get(f"/api/trees/{tree_a}")
        assert still_there.status_code == 200
        assert still_there.json()["name"] == "A's tree"
    finally:
        user_a.delete(f"/api/trees/{tree_a}")


def test_other_users_tree_contents_return_403(make_authed_client):
    """People, relationships and graph under someone else's tree are blocked
    too — not just the tree record itself."""
    user_a = make_authed_client()
    user_b = make_authed_client()
    tree_a = user_a.post("/api/trees", json={"name": "A's tree"}).json()["id"]
    person_id = user_a.post(f"/api/trees/{tree_a}/people", json={"name": "Private"}).json()["id"]
    try:
        assert user_b.get(f"/api/trees/{tree_a}/people").status_code == 403
        assert user_b.get(f"/api/trees/{tree_a}/people/{person_id}").status_code == 403
        assert user_b.post(f"/api/trees/{tree_a}/people", json={"name": "Intruder"}).status_code == 403
        assert user_b.get(f"/api/trees/{tree_a}/graph").status_code == 403
        assert user_b.post(
            f"/api/trees/{tree_a}/relationships",
            json={"person_a_id": person_id, "person_b_id": person_id, "type": "PARENT_OF"},
        ).status_code == 403
    finally:
        user_a.delete(f"/api/trees/{tree_a}")


def test_missing_tree_returns_404_for_logged_in_user(authed_client):
    assert authed_client.get("/api/trees/does-not-exist").status_code == 404
    assert authed_client.get("/api/trees/does-not-exist/people").status_code == 404
