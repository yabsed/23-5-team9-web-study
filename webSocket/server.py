from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ Message Schema ------------------

from pydantic import BaseModel
class ChatMessage(BaseModel):
    sender: str    
    receiver: str
    message: str   

# ------------------ Logic Explanation ------------------

# Step 0. Receiver is connected via WebSocket
# Step 1. Sender Calls Server using API CALL
# Step 2. Server Calls Receiver

# (Sender) -> API Call -> (Server) -> WebSocket -> (Receiver)

# ------------------ Connection ------------------

class ConnectionManager:
    def __init__(self):
        # Storage for Sockets
        # { 
        #   'user1': <starlette.websockets.WebSocket object at 0x7f8cd8df0910>, 
        #   'user2': <starlette.websockets.WebSocket object at 0x7f8cd8dce060>
        # }
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"🟢 연결됨: {user_id}")

        print(self.active_connections); 

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"🔴 연결해제: {user_id}")

    # (Server) -> WebSocket -> (Receiver)
    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_text(message)
        else:
            print(f"⚠️ {user_id}님은 접속중이 아닙니다.")

manager = ConnectionManager()

# ------------------ Receiver ------------------

# Step 0. Receiver is connected via WebSocket
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Heartbeat (Maintaining Connection)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# Note. Dependency Injection
#   uvicorn "automatically" assignes websocket variable,
#   knowing that this func requires [WebSocket type]

# ------------------ Sender ------------------

# Step 1. Sender Calls Server using API CALL
@app.post("/send-message")
async def send_chat_message(chat: ChatMessage):
    print(f"📩 메시지 요청: {chat.sender} -> {chat.receiver} : {chat.message}")
    
    # Step 2. Server Calls Receiver
    await manager.send_personal_message(
        f"[{chat.sender}]: {chat.message}", # message : str
        chat.receiver                       # user_id : str
    )
    return {"status": "Message sent"}


# ------------------ Run uvicorn ------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)