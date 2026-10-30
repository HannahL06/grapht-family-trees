from fastapi import APIRouter, Depends

from app.core.db import run_query
from app.core.dependencies import require_tree_access

# Every route here is under /trees/{tree_id}/..., so the access check is
# attached to the whole router: no route in this file can forget it.
router = APIRouter(dependencies=[Depends(require_tree_access)])


@router.get("/trees/{tree_id}/graph")
def get_graph(tree_id: str):
    """Fetch all people and PARENT_OF/MARRIED_TO edges in a tree, shaped
    for Cytoscape.js. Backend half of Task 2.7, pulled forward early so
    the demo page has a real tree-scoped graph endpoint to call."""
    nodes = run_query(
        "MATCH (p:Person {tree_id: $tree_id}) RETURN p.id AS id, p.name AS name",
        {"tree_id": tree_id},
    )
    edges = run_query(
        "MATCH (a:Person {tree_id: $tree_id})-[r]->(b:Person {tree_id: $tree_id}) "
        "RETURN a.id AS source, b.id AS target, type(r) AS type",
        {"tree_id": tree_id},
    )
    return {"nodes": nodes, "edges": edges}
