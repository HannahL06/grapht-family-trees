from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    email: str  # TODO: see Task 1.9.x — switch to pydantic.EmailStr for real validation
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    # Deliberately no password/password_hash field — this is what the API is
    # allowed to send back, so leaving it out here makes it structurally
    # impossible to accidentally return a user's hash in a response.
