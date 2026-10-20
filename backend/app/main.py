from fastapi import FastAPI

app = FastAPI(title="Grapht API")


@app.get("/")
def health_check():
    return {"status": "ok"}
