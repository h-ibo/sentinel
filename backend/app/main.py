from fastapi import FastAPI
from app.api import vulnerabilities, ws, auth

app = FastAPI(
    title="Sentinel API",
    description="Vulnerability Management System Backend",
    version="1.0.0"
)

app.include_router(
    vulnerabilities.router,
    prefix="/vulnerabilities",
    tags=["Vulnerabilities"]
)

app.include_router(
    ws.router,
    prefix="/ws",
    tags=["WebSocket"]
)
app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

@app.get("/")
def root():
    return {"message": "Welcome to Sentinel API! Go to /docs to see the UI."}