from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.core.db import close_driver
from app.people import (
    add_child,
    add_person,
    add_spouse,
    get_graph,
    link_child,
    link_parent,
    list_people,
)

TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates"


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    close_driver()


app = FastAPI(title="Grapht API", lifespan=lifespan)


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.get("/demo")
def demo_page():
    return FileResponse(TEMPLATES_DIR / "index.html")


class PersonIn(BaseModel):
    name: str
    birth_year: int | None = None


class SpouseIn(BaseModel):
    person_id: str
    name: str
    birth_year: int | None = None


class ChildIn(BaseModel):
    parent_id: str
    second_parent_id: str | None = None
    name: str
    birth_year: int | None = None


class LinkChildIn(BaseModel):
    parent_id: str
    child_id: str


class LinkParentIn(BaseModel):
    child_id: str
    parent_id: str


@app.get("/people")
def get_people():
    return list_people()


@app.post("/people")
def create_person(body: PersonIn):
    return add_person(body.name, body.birth_year)


@app.post("/spouse")
def create_spouse(body: SpouseIn):
    return add_spouse(body.person_id, body.name, body.birth_year)


@app.post("/child")
def create_child(body: ChildIn):
    return add_child(body.parent_id, body.name, body.second_parent_id, body.birth_year)


@app.post("/link-child")
def create_link_child(body: LinkChildIn):
    try:
        link_child(body.parent_id, body.child_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "linked"}


@app.post("/link-parent")
def create_link_parent(body: LinkParentIn):
    try:
        link_parent(body.child_id, body.parent_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"status": "linked"}


@app.get("/graph")
def graph():
    return get_graph()
