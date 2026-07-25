from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import jwt, JWTError

from app.core.connection_manager import manager
from app.core.security import SECRET_KEY, ALGORITHM

router = APIRouter()


@router.websocket("/alerts")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket)

    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)