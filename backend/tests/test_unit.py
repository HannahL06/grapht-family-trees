"""Unit tests: no network calls, no database. Fast, always safe to run."""

from fastapi.testclient import TestClient

from app.main import app

# No `with` here deliberately — this does NOT trigger FastAPI's lifespan,
# so ensure_person_indexes() never runs and no real AuraDB call happens.
client = TestClient(app)


def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
