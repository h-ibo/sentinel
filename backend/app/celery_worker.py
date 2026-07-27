from celery import Celery
import time
import os
import requests  # OSV.dev'e istek atmak için bunu ekledik
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

# İlk Arka Plan Görevimiz (Test için)
@celery_app.task
def test_background_task(message: str):
    """
    Bu fonksiyon FastAPI'yi meşgul etmeden arka planda çalışacak.
    Sanki internetten devasa bir CVE verisi çekiyormuşuz gibi 5 saniye bekleteceğiz.
    """
    print(f"📥 [CELERY] Görev alındı: {message}")
    time.sleep(5) 
    print(f"✅ [CELERY] Görev başarıyla tamamlandı: {message}")
    return {"status": "success", "message": message}

# ASIL GÖREVİMİZ: OSV.dev Tarayıcısı
@celery_app.task
def scan_packages_with_osv(packages_list: list):
    """
    FastAPI'den gelen paket listesini alır ve OSV.dev API'sine sorarak 
    bilinen zafiyetleri (vulnerabilities) tespit eder.
    """
    print(f"🚀 [CELERY] OSV taraması başlıyor! Toplam {len(packages_list)} paket incelenecek.")
    results = []
    osv_url = "https://api.osv.dev/v1/query"

    for pkg in packages_list:
        package_name = pkg.get("package_name")
        version = pkg.get("version")
        
        # OSV.dev'in bizden beklediği sorgu formatı
        query_payload = {
            "version": version,
            "package": {
                "name": package_name,
                "ecosystem": "PyPI" # Şimdilik Python paketleri için PyPI
            }
        }
        
        try:
            response = requests.post(osv_url, json=query_payload)
            response.raise_for_status()
            data = response.json()
            
            # Eğer 'vulns' anahtarı varsa, bu pakette zafiyet bulunmuş demektir!
            if "vulns" in data:
                print(f"🚨 DİKKAT: {package_name} (v{version}) paketinde zafiyet bulundu!")
                results.append({
                    "package": package_name,
                    "version": version,
                    "vulnerabilities_found": len(data["vulns"]),
                    "details": data["vulns"]
                })
            else:
                print(f"✅ {package_name} (v{version}) temiz.")
                results.append({
                    "package": package_name,
                    "version": version,
                    "vulnerabilities_found": 0,
                    "status": "Temiz"
                })
                
        except Exception as e:
            print(f"❌ {package_name} taranırken hata oluştu: {str(e)}")
            results.append({
                "package": package_name,
                "error": str(e)
            })

    print("🏁 [CELERY] OSV taraması tamamlandı!")
    return results