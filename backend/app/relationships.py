from enum import Enum

from pydantic import BaseModel


class RelationshipType(str, Enum):
    PARENT_OF = "PARENT_OF"
    MARRIED_TO = "MARRIED_TO"


class RelationshipCreate(BaseModel):
    person_a_id: str
    person_b_id: str
    type: RelationshipType


class RelationshipResponse(BaseModel):
    relationship_id: str
    person_a_id: str
    person_b_id: str
    type: RelationshipType
