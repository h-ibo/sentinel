from fastapi import FastAPI
from app.api import vulnerabilities, ws, auth
from app.celery_worker import test_background_task

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

@app.post("/test-task")
def run_background_task(message: str):
    # .delay() komutu görevi Celery'ye havale eder
    task = test_background_task.delay(message)
    
    return {
        "task_id": task.id, 
        "status": "İşlem başarıyla arka plana gönderildi, Celery halledecek!"
    }