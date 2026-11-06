from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter()

INDEX_HTML = Path(__file__).resolve().parent / "index.html"


@router.get("/demo")
def demo_page():
    return FileResponse(INDEX_HTML)
