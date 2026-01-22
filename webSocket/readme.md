# 📑 기술 상세 레포트: WebSocket & HTTP 하이브리드 채팅 시스템

## 1. 시스템 개요 (Architecture Overview)

이 시스템은 WebSocket을 양방향 통신 전체에 사용하지 않고, **수신(Push)**에만 집중적으로 사용하는 구조입니다.

* **Sender (보내는 사람):** REST API (`POST /send-message`)를 사용합니다.
* **Server (서버):** 메모리 내의 소켓 연결 목록을 참조하여 수신자에게 메시지를 전달합니다.
* **Receiver (받는 사람):** WebSocket을 통해 서버로부터 메시지를 실시간으로 전달받습니다.


## 2. Backend 분석 (FastAPI)

백엔드 코드는 **"연결 관리(Connection Management)"**가 핵심입니다.

### A. ConnectionManager (소켓 교환원)

이 클래스는 누가 접속해 있는지 관리하고, 특정인에게 메시지를 보내는 역할을 합니다.

```python
class ConnectionManager:
    def __init__(self):
        # 1. 접속자 명부 (Memory Storage)
        # key: user_id (예: "user1"), value: WebSocket 객체
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        # 2. 핸드셰이크 승인
        # 클라이언트의 연결 요청을 수락합니다. 이 줄이 없으면 연결이 성립되지 않습니다.
        await websocket.accept()
        
        # 3. 명부 등록
        # 유저 ID와 소켓 객체를 매핑하여 저장합니다. 나중에 ID로 소켓을 찾기 위함입니다.
        self.active_connections[user_id] = websocket
        print(f"🟢 연결됨: {user_id}")
        print(self.active_connections)

    def disconnect(self, user_id: str):
        # 4. 명부 삭제
        # 연결이 끊어지면 딕셔너리에서 제거하여 에러를 방지합니다.
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"🔴 연결해제: {user_id}")

    # (Server) -> WebSocket -> (Receiver)
    async def send_personal_message(self, message: str, user_id: str):
        # 5. 타겟 메시지 전송 (핵심 로직)
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            # 실제 소켓 파이프라인을 통해 텍스트 데이터를 밀어 넣습니다.
            await websocket.send_text(message)
        else:
            print(f"⚠️ {user_id}님은 접속중이 아닙니다.")

manager = ConnectionManager()
```

### B. WebSocket Endpoint (수신 대기소)

클라이언트(React)가 처음 접속하여 **"연결을 유지"**하는 곳입니다.

```python
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    # 1. 연결 수립 요청
    await manager.connect(websocket, user_id)
    try:
        while True:
            # 2. 연결 유지 (Heartbeat)
            # 이 루프가 없으면 함수가 종료되고, 즉시 연결이 끊깁니다.
            # 클라이언트로부터 무언가 올 때까지 대기(await)하며 연결을 붙잡고 있습니다.
            await websocket.receive_text()
    except WebSocketDisconnect:
        # 3. 연결 종료 처리
        # 브라우저 탭을 닫거나 네트워크가 끊기면 이 예외가 발생합니다.
        manager.disconnect(user_id)
```

### C. Message Sender (HTTP API)

메시지를 보낼 때는 소켓이 아닌 일반 HTTP 요청을 사용합니다.

```python
@app.post("/send-message")
async def send_chat_message(chat: ChatMessage):
    print(f"📩 메시지 요청: {chat.sender} -> {chat.receiver} : {chat.message}")
    
    # 1. 서버 내부 로직: 매니저 호출
    # API 요청을 받아서, 백그라운드에 열려있는 WebSocket으로 데이터를 넘겨줍니다.
    await manager.send_personal_message(
        f"[{chat.sender}]: {chat.message}", # 보낼 내용
        chat.receiver                       # 받는 사람 ID
    )
    return {"status": "Message sent"}
```

## 3. Frontend 분석 (React)

프론트엔드는 **"소켓 객체의 유지"**와 **"이벤트 리스닝"**이 핵심입니다.

### A. 소켓 객체 관리 (useRef)

```typescript
// WebSocket 객체를 컴포넌트 리렌더링과 상관없이 유지하기 위해 useRef를 사용합니다.
// useState를 쓰면 소켓 연결이 매번 끊기거나 중복될 수 있습니다.
const socketRef = useRef<WebSocket | null>(null);
```

### B. 연결 로직 (Connection Logic)

서버와 연결 통로를 뚫고, "메시지가 오면 무엇을 할지" 정의합니다.

```typescript
  const connectSocket = () => {
    // 중복 연결 방지
    if (socketRef.current) return;
    
    // 1. 서버의 WebSocket Endpoint로 연결 시도
    const socket = new WebSocket(`ws://localhost:8000/ws/${senderId}`);
    
    // 2. 이벤트 리스너: 연결 성공 시
    socket.onopen = () => { 
        setIsConnected(true); 
        addLog(`✅ 시스템: ${senderId} 접속`); 
    };
    
    // 3. 이벤트 리스너: 메시지 수신 시 (가장 중요)
    // 서버가 'await websocket.send_text()'를 실행하면 이 함수가 발동됩니다.
    socket.onmessage = (e) => addLog(`📩 ${e.data}`);
    
    // 4. 이벤트 리스너: 연결 종료 시
    socket.onclose = () => { 
        setIsConnected(false); 
        socketRef.current = null; 
    };
    
    // ref에 저장하여 인스턴스 유지
    socketRef.current = socket;
  };
```

### C. 메시지 전송 로직 (Sending Logic)

소켓을 통하지 않고 `fetch`를 사용합니다.

```typescript
  const sendMessage = async () => {
    if (!inputMessage) return;
    try {
      // 1. API Payload 구성
      const payload: SendMessageRequest = { 
          sender: senderId, 
          receiver: receiverId, 
          message: inputMessage 
      };
      
      // 2. HTTP POST 요청 (WebSocket send가 아님)
      await fetch("http://localhost:8000/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      // 3. 내 화면에 로그 추가 (서버를 거치지 않고 바로 표시)
      addLog(`📤 나: ${inputMessage}`);
      setInputMessage("");
    } catch (e) { addLog("⚠️ 전송 실패"); }
  };
```

### D. 생명주기 관리 (useEffect)

```typescript
  // 컴포넌트가 화면에서 사라질 때(Unmount), 소켓 연결을 정리합니다.
  // 메모리 누수를 방지하는 필수적인 단계입니다.
  useEffect(() => { return () => disconnectSocket(); }, []);
```


## 4. 요약 및 핵심 포인트

1. **역할 분담:** * 보낼 때(`sendMessage`)는 안정적인 **HTTP 프로토콜**을 사용했습니다.
* 받을 때(`socket.onmessage`)는 실시간성이 보장되는 **WebSocket 프로토콜**을 사용했습니다.


2. **데이터 흐름의 완결:**
* User A (Send) → HTTP → Server (API Handler) → ConnectionManager (Lookup) → WebSocket → User B (Receive)


3. **코드의 중요 지점:**
* **Python:** `manager.active_connections` 딕셔너리가 모든 연결의 상태를 쥐고 있는 핵심 저장소입니다.
* **React:** `socket.onmessage`가 서버의 푸시 알림을 감지하는 귀(Ear) 역할을 합니다.



이 구조는 채팅뿐만 아니라 **실시간 알림(Notification)** 시스템을 구축할 때 가장 정석적으로 사용되는 패턴입니다.


## 5. How to Run

이 프로젝트를 실행하기 위해서는 두 개의 터미널이 필요합니다 (Backend, Frontend).

### 1. Backend (FastAPI)

루트 디렉토리에서 다음 명령어를 실행합니다.

```bash
# 1. 의존성 설치
pip install -r requirements.txt

# 2. 서버 실행 (Port: 8000)
python server.py
# 또는
uvicorn server:app --reload
```

### 2. Frontend (React)

`frontend` 디렉토리로 이동하여 실행합니다.

```bash
cd frontend

# 1. 의존성 설치 (최초 1회)
npm install

# 2. 리액트 앱 실행 (Port: 3000)
npm start
```
