from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.db import close_driver


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    close_driver()


app = FastAPI(title="Grapht API", lifespan=lifespan)


@app.get("/")
def health_check():
    return {"status": "ok"}
