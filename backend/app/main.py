from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

from app.core.db import close_driver
from app.analysis import router as analysis_router
from app.auth import ensure_user_constraints
from app.auth import router as auth_router
from app.demo.routes import router as demo_router
from app.people import ensure_person_indexes
from app.people import router as people_router
from app.relationships import ensure_relationship_ids
from app.relationships import router as relationships_router
from app.trees import router as trees_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_person_indexes()
    ensure_user_constraints()
    ensure_relationship_ids()
    yield
    close_driver()


# Every data route lives under /api, so the React app's dev proxy and any
# production reverse proxy can forward "/api/*" to the backend unchanged,
# with no path rewriting. The docs move under /api for the same reason.
API_PREFIX = "/api"

app = FastAPI(
    title="Grapht API",
    lifespan=lifespan,
    docs_url=f"{API_PREFIX}/docs",
    redoc_url=f"{API_PREFIX}/redoc",
    openapi_url=f"{API_PREFIX}/openapi.json",
)
# Compress responses over 1 KB. The graph of a 10,000-person tree is ~2.5 MB of
# repetitive JSON, which gzip shrinks several times over.
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.include_router(trees_router, prefix=API_PREFIX)
app.include_router(people_router, prefix=API_PREFIX)
app.include_router(relationships_router, prefix=API_PREFIX)
app.include_router(analysis_router, prefix=API_PREFIX)
app.include_router(auth_router, prefix=API_PREFIX)
# The demo page is a plain page, not a data route, so it stays at /demo.
app.include_router(demo_router)


@app.get("/")
def health_check():
    return {"status": "ok"}
