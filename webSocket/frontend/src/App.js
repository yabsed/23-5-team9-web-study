import React, { useState, useEffect, useRef } from "react";

function App() {
  // 내 정보
  const [myId, setMyId] = useState("user1"); 
  // 받을 사람 정보 (기본값 user2)
  const [targetId, setTargetId] = useState("user2");
  
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([]); 
  const [inputMessage, setInputMessage] = useState(""); // 입력한 메시지
  const socketRef = useRef(null);

  const connectSocket = () => {
    if (socketRef.current) return;
    const socket = new WebSocket(`ws://localhost:8000/ws/${myId}`);

    socket.onopen = () => {
      addLog(`✅ 시스템: ${myId}로 접속 완료`);
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      // 상대방이 보낸 메시지를 받음
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

  // 메시지 전송 함수 (HTTP POST)
  const sendMessage = async () => {
    if (!inputMessage) return;

    try {
      await fetch("http://localhost:8000/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: myId,      // 보내는 사람 (나)
          receiver: targetId, // 받는 사람 (상대)
          message: inputMessage
        }),
      });

      // 내 화면에도 내가 보낸 메시지 표시
      addLog(`📤 나: ${inputMessage}`);
      setInputMessage(""); // 입력창 비우기
    } catch (error) {
      console.error(error);
      addLog("⚠️ 전송 실패: 백엔드 확인 필요");
    }
  };

  const addLog = (msg) => {
    setLogs((prev) => [...prev, msg]);
  };

  useEffect(() => {
    return () => disconnectSocket();
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h2>💬 1:1 채팅 테스트</h2>

      {/* 설정 영역 */}
      <div style={{ background: "#eee", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label>내 ID: </label>
          <input value={myId} onChange={(e) => setMyId(e.target.value)} disabled={isConnected} style={{width: "80px"}} />
          {!isConnected ? (
            <button onClick={connectSocket} style={{ marginLeft: "10px", background: "green", color: "white", border: "none", padding: "5px 10px" }}>접속</button>
          ) : (
            <button onClick={disconnectSocket} style={{ marginLeft: "10px", background: "red", color: "white", border: "none", padding: "5px 10px" }}>종료</button>
          )}
        </div>
        
        <div>
          <label>상대방 ID: </label>
          <input value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{width: "80px"}} />
        </div>
      </div>

      {/* 채팅 로그 영역 */}
      <div style={{ height: "300px", border: "1px solid #ddd", overflowY: "auto", padding: "10px", marginBottom: "10px", background: "white" }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: "5px", fontSize: "14px" }}>{log}</div>
        ))}
      </div>

      {/* 메시지 입력 영역 */}
      <div style={{ display: "flex" }}>
        <input 
          value={inputMessage} 
          onChange={(e) => setInputMessage(e.target.value)} 
          placeholder="메시지 입력..."
          disabled={!isConnected}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          style={{ flex: 1, padding: "10px" }}
        />
        <button onClick={sendMessage} disabled={!isConnected} style={{ padding: "10px", width: "60px" }}>전송</button>
      </div>
    </div>
  );
}

export default App;