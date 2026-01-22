from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
from pydantic import BaseModel # 데이터 구조 정의를 위해 추가

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. 채팅 메시지 데이터 모델 정의
class ChatMessage(BaseModel):
    sender: str    # 보내는 사람 ID
    receiver: str  # 받는 사람 ID
    message: str   # 메시지 내용

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"🟢 연결됨: {user_id}")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"🔴 연결해제: {user_id}")

    # 특정 사용자에게 메시지 전송
    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_text(message)
        else:
            print(f"⚠️ {user_id}님은 접속중이 아닙니다.")

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # 여기서는 클라이언트의 연결 유지(Heartbeat)만 담당합니다.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# 2. 실제 채팅 전송 API (HTTP POST)
@app.post("/send-message")
async def send_chat_message(chat: ChatMessage):
    print(f"📩 메시지 요청: {chat.sender} -> {chat.receiver} : {chat.message}")
    
    # 받는 사람(receiver)에게 소켓 메시지 전송
    await manager.send_personal_message(
        f"[{chat.sender}]: {chat.message}", # 메시지 포맷: [보낸사람]: 내용
        chat.receiver
    )
    return {"status": "Message sent"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)