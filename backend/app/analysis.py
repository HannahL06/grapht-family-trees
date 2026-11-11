from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.core.db import run_query
from app.core.dependencies import require_tree_access

# Every route here is under /trees/{tree_id}/..., so the access check is
# attached to the whole router: no route in this file can forget it.
router = APIRouter(dependencies=[Depends(require_tree_access)])


@router.get("/trees/{tree_id}/graph")
def get_graph(tree_id: str):
    """Fetch all people and PARENT_OF/MARRIED_TO edges in a tree, shaped
    for the graph renderer (Task 2.7). Each edge carries `divorced` (always
    false for PARENT_OF), `marriage_year` and `divorce_year`.

    Built for large trees (10,000+ people): nodes and edges come back as two
    lists in a single row (far less per-row overhead than 24,000 rows), and
    the response is built with JSONResponse, which skips FastAPI's slow
    per-item jsonable_encoder (~0.6 s per 10,000 people)."""
    rows = run_query(
        "CALL () { "
        "  MATCH (p:Person {tree_id: $tree_id}) "
        "  RETURN collect({id: p.id, name: p.name}) AS nodes "
        "} "
        "CALL () { "
        "  MATCH (a:Person {tree_id: $tree_id})-[r]->(b:Person {tree_id: $tree_id}) "
        "  RETURN collect({source: a.id, target: b.id, type: type(r), "
        "    divorced: coalesce(r.divorced, false), marriage_year: r.marriage_year, "
        "    divorce_year: r.divorce_year}) AS edges "
        "} "
        "RETURN nodes, edges",
        {"tree_id": tree_id},
    )
    return JSONResponse({"nodes": rows[0]["nodes"], "edges": rows[0]["edges"]})
