import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.db import run_query
from app.main import app

TEST_PASSWORD = "correct-horse-battery-staple"


@pytest.fixture
def client():
    # Unauthenticated client. `with` triggers FastAPI's lifespan
    # (startup/shutdown), so index/constraint setup runs like the real app.
    with TestClient(app) as c:
        yield c


@pytest.fixture
def make_authed_client():
    """Factory: each call registers a fresh user, logs them in, and returns
    a client that sends that user's access token on every request. Call it
    twice to get two different users (e.g. to test cross-user access).
    Users created here are deleted at teardown."""
    contexts = []
    emails = []

    def _make():
        ctx = TestClient(app)
        c = ctx.__enter__()
        email = f"authed-{uuid.uuid4()}@example.com"
        c.post(
            "/auth/register",
            json={"name": "Authed Test", "email": email, "password": TEST_PASSWORD},
        )
        token = c.post(
            "/auth/login", json={"email": email, "password": TEST_PASSWORD}
        ).json()["access_token"]
        c.headers.update({"Authorization": f"Bearer {token}"})
        contexts.append(ctx)
        emails.append(email)
        return c

    yield _make

    for ctx in contexts:
        ctx.__exit__(None, None, None)
    for email in emails:
        run_query("MATCH (u:User {email: $email}) DETACH DELETE u", {"email": email})


@pytest.fixture
def authed_client(make_authed_client):
    return make_authed_client()
