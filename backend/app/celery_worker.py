from celery import Celery
import time
import os
from dotenv import load_dotenv

load_dotenv()

# Eğer .env dosyasında REDIS_URL yoksa, varsayılan olarak yerel Redis adresini kullanır.
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Celery uygulamasını oluşturuyoruz. 
# broker: Görevlerin bırakıldığı bekleme odası
# backend: Görev sonuçlarının kaydedildiği yer
celery_app = Celery(
    "sentinel_worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

# İlk Arka Plan Görevimiz
@celery_app.task
def test_background_task(message: str):
    """
    Bu fonksiyon FastAPI'yi meşgul etmeden arka planda çalışacak.
    Sanki internetten devasa bir CVE verisi çekiyormuşuz gibi 5 saniye bekleteceğiz.
    """
    print(f"📥 [CELERY] Görev alındı: {message}")
    
    # Ağır bir işlemi simüle ediyoruz
    time.sleep(5) 
    
    print(f"✅ [CELERY] Görev başarıyla tamamlandı: {message}")
    return {"status": "success", "message": message}
    