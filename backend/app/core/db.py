from neo4j import Driver, GraphDatabase

from app.core import config

_driver: Driver | None = None


def get_driver() -> Driver:
    global _driver
    if _driver is None:
        settings = {
            "NEO4J_URI": config.NEO4J_URI,
            "NEO4J_USERNAME": config.NEO4J_USERNAME,
            "NEO4J_PASSWORD": config.NEO4J_PASSWORD,
        }
        missing = [name for name, value in settings.items() if not value]
        if missing:
            raise RuntimeError(f"Missing Neo4j settings in .env: {', '.join(missing)}")
        _driver = GraphDatabase.driver(
            config.NEO4J_URI, auth=(config.NEO4J_USERNAME, config.NEO4J_PASSWORD)
        )
    return _driver


def close_driver() -> None:
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


def run_query(query: str, params: dict | None = None) -> list[dict]:
    records, _, _ = get_driver().execute_query(query, params or {})
    return [record.data() for record in records]


def test_connection() -> None:
    get_driver().verify_connectivity()
    result = run_query("RETURN 1 AS n")
    print(f"Neo4j connection OK: {result}")
