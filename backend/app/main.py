from fastapi import FastAPI
from app.api import vulnerabilities

# FastAPI uygulamamızı (Restoranın kendisini) başlatıyoruz
app = FastAPI(
    title="Sentinel API",
    description="Vulnerability Management System Backend",
    version="1.0.0"
)

# Az önce hazırladığımız menüyü (router), "/vulnerabilities" adresi altında sisteme dahil ediyoruz
app.include_router(
    vulnerabilities.router,
    prefix="/vulnerabilities",
    tags=["Vulnerabilities"]
)

# İnsanlar sitemizin ana sayfasına (Kök URL) girdiğinde onları karşılayacak basit bir mesaj
@app.get("/")
def root():
    return {"message": "Welcome to Sentinel API! Go to /docs to see the UI."}