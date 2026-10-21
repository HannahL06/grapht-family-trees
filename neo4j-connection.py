import os
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load backend/.env no matter where you launch Python from
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
    raise RuntimeError("Missing NEO4J_* settings; check backend/.env")

_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

def get_driver():
    return _driver

def run_query(query: str, params: dict | None = None) -> list[dict]:
    with _driver.session() as session:
        return [record.data() for record in session.run(query, params or {})]

def test_connection():
    print(run_query("RETURN 1 AS n"))