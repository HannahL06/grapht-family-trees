from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.db import close_driver
from app.analysis import router as analysis_router
from app.demo.routes import router as demo_router
from app.people import ensure_person_indexes
from app.people import router as people_router
from app.relationships import router as relationships_router
from app.trees import router as trees_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_person_indexes()
    yield
    close_driver()


app = FastAPI(title="Grapht API", lifespan=lifespan)
app.include_router(trees_router)
app.include_router(people_router)
app.include_router(relationships_router)
app.include_router(analysis_router)
app.include_router(demo_router)


@app.get("/")
def health_check():
    return {"status": "ok"}
