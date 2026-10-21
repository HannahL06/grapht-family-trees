import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    # `with` triggers FastAPI's lifespan (startup/shutdown), so
    # ensure_person_indexes() runs the same way it does for the real app.
    with TestClient(app) as c:
        yield c
