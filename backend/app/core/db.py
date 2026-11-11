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
    # fetch_size=-1: ask for the whole result in one round trip. We load every
    # row into a list anyway, and the default (1,000 rows per round trip) cost
    # roughly 1 s per 10,000 rows against a remote AuraDB. execute_write keeps
    # the automatic retry on transient errors that execute_query had.
    def work(tx):
        return [record.data() for record in tx.run(query, params or {})]

    with get_driver().session(fetch_size=-1) as session:
        return session.execute_write(work)


def test_connection() -> None:
    get_driver().verify_connectivity()
    result = run_query("RETURN 1 AS n")
    print(f"Neo4j connection OK: {result}")
