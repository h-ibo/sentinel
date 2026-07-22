from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.connection_manager import manager

router = APIRouter()

@router.websocket("/alerts")
async def websocket_endpoint(websocket: WebSocket):
    # [TR] 1. Yeni bir cihaz bağlandığında onu aktif listemize ekliyoruz.
    # [EN] 1. When a new device connects, we add it to our active list.
    await manager.connect(websocket)
    
    try:
        while True:
            # [TR] 2. Bağlantıyı açık tutmak için sonsuz bir döngüde bekliyoruz.
            # [EN] 2. We wait in an infinite loop to keep the connection open.
            data = await websocket.receive_text()
            
    except WebSocketDisconnect:
        # [TR] 3. Cihazın interneti koptuğunda, onu sessizce aktif listemizden siliyoruz.
        # [EN] 3. If the device disconnects, we silently remove it from our active list.
        manager.disconnect(websocket)