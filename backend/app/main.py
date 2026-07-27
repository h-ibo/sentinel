from fastapi import FastAPI
from app.api import vulnerabilities, ws, auth
from app.celery_worker import test_background_task
from fastapi import FastAPI, File, UploadFile, HTTPException
from app.celery_worker import test_background_task, scan_packages_with_osv, celery_app
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

@app.post("/scan/upload")
async def upload_requirements(file: UploadFile = File(...)):
    """
    Kullanıcıdan requirements.txt dosyasını alır, içindeki paket isimlerini 
    ve versiyonlarını ayrıştırarak temiz bir liste haline getirir.
    """
    # 1. Dosya uzantısı kontrolü
    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Lütfen geçerli bir requirements.txt dosyası yükleyin.")
    
    # 2. Dosyanın içeriğini okuma
    content = await file.read()
    decoded_content = content.decode("utf-8")
    
    parsed_packages = []
    
    # 3. Satır satır okuyup paketleri ayrıştırma (Parsing)
    for line in decoded_content.splitlines():
        line = line.strip()
        
        # Boş satırları veya yorum satırlarını (#) atla
        if not line or line.startswith("#"):
            continue
            
        # Paket adı ve versiyonunu ayırma (Örn: fastapi==0.100.0)
        # Şimdilik sadece tam eşleşen (==) versiyonları alıyoruz
        if "==" in line:
            name, version = line.split("==", 1)
            parsed_packages.append({
                "package_name": name.strip(),
                "version": version.strip()
            })
    task = scan_packages_with_osv.delay(parsed_packages)        
    return {
        "filename": file.filename,
        "total_packages_found": len(parsed_packages),
        "task_id": task.id, # Artık 'task' tanımlı olduğu için .id değerini rahatça alabilir!
        "packages": parsed_packages,
        "message": "Dosya başarıyla ayrıştırıldı ve arka planda zafiyet taraması başlatıldı!"
    }

@app.get("/scan/status/{task_id}")
async def get_scan_status(task_id: str):
    """
    Kullanıcının elindeki task_id ile tarama durumunu ve sonuçlarını kontrol ettiği uç nokta.
    """
    # Celery'den görevin güncel durumunu Redis üzerinden çekiyoruz
    task_result = celery_app.AsyncResult(task_id)
    
    # task_result.state bize görevin durumunu döner: 
    # 'PENDING' (Bekliyor), 'STARTED' (Başladı), 'SUCCESS' (Bitti), 'FAILURE' (Hata)
    
    response = {
        "task_id": task_id,
        "status": task_result.state,
    }
    
    # Eğer görev başarıyla bittiyse, OSV.dev'den dönen o gerçek sonuçları da ekleyelim
    if task_result.state == "SUCCESS":
        response["results"] = task_result.result
    # Eğer görevde bir hata olduysa, hatayı döndürelim
    elif task_result.state == "FAILURE":
        response["error"] = str(task_result.info)
        
    return response