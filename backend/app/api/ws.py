from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import jwt, JWTError

from app.core.connection_manager import manager
from app.core.security import SECRET_KEY, ALGORITHM

router = APIRouter()

@router.websocket("/alerts")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")

    if not token:
        print("❌ WebSocket Hatası: URL'de Token bulunamadı!")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        # 1. Token'ı çözmeyi deniyoruz
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"✅ WebSocket Başarılı: Token doğrulandı! Kullanıcı: {payload.get('sub')}")
    except JWTError as e:
        # 2. Eğer hata varsa artık sessizce kapanmayacak, terminalde göreceğiz
        print(f"❌ WebSocket Hatası: Geçersiz veya Bozuk Token! Detay: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        # 3. Manager'a bağlanmayı deniyoruz
        await manager.connect(websocket)
        print("🤝 Manager bağlantısı kuruldu.")
        
        while True:
            data = await websocket.receive_text()
            print(f"📩 Gelen Mesaj: {data}")
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("🔌 WebSocket Bağlantısı Koptu.")
    except RuntimeError as e:
        print(f"⚠️ UYARI: RuntimeError! Büyük ihtimalle 'await websocket.accept()' komutu manager içinde unutulmuş. Detay: {e}")
    except Exception as e:
        print(f"🚨 Beklenmeyen Hata: {e}")