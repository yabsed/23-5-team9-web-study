import React, { useState, useEffect, useRef } from "react";

// 1. 백엔드로 보낼 데이터의 형태(Type)를 미리 정의합니다.
// 이렇게 하면 오타나 빠진 데이터를 바로 잡아낼 수 있습니다.
interface SendMessageRequest {
  sender: string;
  receiver: string;
  message: string;
}

function App() {
  // ------------------ State (상태) ------------------
  // TS는 초기값을 보고 타입을 추론하지만, 배열이나 null은 명시하는 게 좋습니다.
  
  const [myId, setMyId] = useState<string>("user1");
  const [targetId, setTargetId] = useState<string>("user2");
  
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]); // 문자열들의 배열
  const [inputMessage, setInputMessage] = useState<string>("");

  // WebSocket 객체를 담을 통입니다. 초기엔 없으므로 null을 허용합니다.
  const socketRef = useRef<WebSocket | null>(null);

  // ------------------ Logic (로직) ------------------

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  const connectSocket = () => {
    if (socketRef.current) return;

    // WebSocket 연결
    const socket = new WebSocket(`ws://localhost:8000/ws/${myId}`);

    socket.onopen = () => {
      addLog(`✅ 시스템: ${myId}로 접속 완료`);
      setIsConnected(true);
    };

    socket.onmessage = (event: MessageEvent) => {
      addLog(`📩 ${event.data}`);
    };

    socket.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;
    };

    socketRef.current = socket;
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage) return;

    // 인터페이스에 맞춰 데이터를 준비합니다.
    const payload: SendMessageRequest = {
      sender: myId,
      receiver: targetId,
      message: inputMessage,
    };

    try {
      await fetch("http://localhost:8000/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      addLog(`📤 나: ${inputMessage}`);
      setInputMessage("");
    } catch (error) {
      console.error(error);
      addLog("⚠️ 전송 실패: 백엔드 확인 필요");
    }
  };

  // ------------------ Effects & Render ------------------

  useEffect(() => {
    // 컴포넌트가 사라질 때 소켓을 정리합니다.
    return () => disconnectSocket();
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2>💬 1:1 채팅 테스트 (TS)</h2>

      {/* 설정 영역 */}
      <div style={{ background: "#eee", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label>내 ID: </label>
          <input
            value={myId}
            // 이벤트 타입: 입력창의 변경 이벤트
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMyId(e.target.value)}
            disabled={isConnected}
            style={{ width: "80px" }}
          />
          {!isConnected ? (
            <button onClick={connectSocket} style={{ marginLeft: "10px", background: "green", color: "white", border: "none", padding: "5px 10px" }}>접속</button>
          ) : (
            <button onClick={disconnectSocket} style={{ marginLeft: "10px", background: "red", color: "white", border: "none", padding: "5px 10px" }}>종료</button>
          )}
        </div>

        <div>
          <label>상대방 ID: </label>
          <input
            value={targetId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetId(e.target.value)}
            style={{ width: "80px" }}
          />
        </div>
      </div>

      {/* 로그 영역 */}
      <div style={{ height: "300px", border: "1px solid #ddd", overflowY: "auto", padding: "10px", marginBottom: "10px", background: "white" }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: "5px", fontSize: "14px" }}>
            {log}
          </div>
        ))}
      </div>

      {/* 입력 영역 */}
      <div style={{ display: "flex" }}>
        <input
          value={inputMessage}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
          placeholder="메시지 입력..."
          disabled={!isConnected}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && sendMessage()}
          style={{ flex: 1, padding: "10px" }}
        />
        <button onClick={sendMessage} disabled={!isConnected} style={{ padding: "10px", width: "60px" }}>
          전송
        </button>
      </div>
    </div>
  );
}

export default App;