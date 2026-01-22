# 💬 Real-time 1:1 Chat Application

FastAPI(Backend)와 React(Frontend)를 활용하여 구현한 실시간 1:1 채팅 애플리케이션입니다.
WebSocket을 이용하여 실시간 양방향 통신을 지원하며, 사용자가 지정한 상대방에게 메시지를 전송할 수 있습니다.

## 🛠 Tech Stack

- **Backend:** Python, FastAPI, WebSockets
- **Frontend:** React.js
- **Server:** Uvicorn

## 📂 Project Structure

```bash
.
├── server.py           # FastAPI 백엔드 서버 코드
├── requirements.txt    # 파이썬 의존성 패키지 목록
└── frontend/           # React 프런트엔드 프로젝트
    ├── public/
    ├── src/
    └── package.json

```

## 🚀 How to Run

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

## 🧪 How to Test

1. 백엔드와 프런트엔드 서버가 모두 켜져 있는지 확인합니다.
2. 브라우저 탭을 2개 엽니다 (`http://localhost:3000`).
3. **User A (왼쪽 탭):**
* 내 ID: `user1` -> [접속] 클릭
* 상대방 ID: `user2` 입력


4. **User B (오른쪽 탭):**
* 내 ID: `user2` -> [접속] 클릭
* 상대방 ID: `user1` 입력


5. 메시지를 입력하고 전송하면 상대방 화면에 실시간으로 표시됩니다.

## 📝 Features

* **WebSocket 연결:** 사용자 ID 기반의 소켓 연결 관리
* **실시간 알림:** 연결된 소켓을 통해 즉각적인 메시지 Push
* **REST API Trigger:** HTTP 요청을 통해 소켓 메시지 전송 (Hybrid 방식)
