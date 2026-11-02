from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.db import close_driver
from app.analysis import router as analysis_router
from app.auth import ensure_user_constraints
from app.auth import router as auth_router
from app.demo.routes import router as demo_router
from app.people import ensure_person_indexes
from app.people import router as people_router
from app.relationships import router as relationships_router
from app.trees import router as trees_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_person_indexes()
    ensure_user_constraints()
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
