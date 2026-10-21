from pydantic import BaseModel


class TreeCreate(BaseModel):
    name: str


class TreeUpdate(BaseModel):
    name: str | None = None


class TreeResponse(BaseModel):
    id: str
    name: str
    owner_id: str
