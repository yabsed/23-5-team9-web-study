import React, { useState, useEffect, useRef } from "react";

// ------------------ Types ------------------

interface SendMessageRequest {
  sender: string;
  receiver: string;
  message: string;
}

// 2. Styles (여기로 스타일을 몰아넣어서 로직을 방해하지 않게 함)
const S = {
  container: "w-full max-w-md bg-white rounded-2xl shadow-xl p-6",
  panel: "bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6",
  inputSm: "border border-gray-300 p-1 w-24 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
  inputLg: "flex-1 border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500",
  btnBase: "px-4 py-1 text-sm font-bold text-white rounded transition-colors",
  btnSend: "bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl font-bold disabled:bg-gray-300",
  logBox: "h-80 overflow-y-auto bg-gray-50 border rounded-xl p-4 mb-4 shadow-inner",
  // 메시지 타입별 스타일 함수
  msg: (text: string) => {
    if (text.startsWith("📤")) return "bg-blue-100 self-end text-blue-900 border-blue-200";
    if (text.startsWith("✅") || text.startsWith("⚠️")) return "bg-gray-200 self-center text-xs text-gray-600";
    return "bg-white self-start text-gray-800 border-gray-200";
  }
};

function App() {

  // ------------------ Data ------------------
  
  // Sender, Receiver
  const [myId, setMyId] = useState<string>("user1");
  const [targetId, setTargetId] = useState<string>("user2");
  
  // Connection
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Message Contents
  const [logs, setLogs] = useState<string[]>([]); 
  const [inputMessage, setInputMessage] = useState<string>("");

  // WebSocket Object
  const socketRef = useRef<WebSocket | null>(null);

  // ------------------ Helper Function ------------------

  const addLog = (msg: string) => {
    setLogs((prev: string[]) => [...prev, msg]);
  };

  // ------------------ Socket Connect / Disconnect ------------------

  const connectSocket = () => {
    // Already Connected
    if (socketRef.current) return;

    // WebSocket
    const socket = new WebSocket(`ws://localhost:8000/ws/${myId}`);

    // 1. After Connected
    socket.onopen = () => {
      addLog(`✅ 시스템: ${myId}로 접속 완료`);
      setIsConnected(true);
    };

    // 2. Got Message
    socket.onmessage = (event: MessageEvent) => {
      addLog(`📩 ${event.data}`);
    };

    // 3. Close Socekt
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

  // ------------------ Send Message (API Call) ------------------

  const sendMessage = async () => {
    if (!inputMessage) return;

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

  // ------------------ Effects ------------------

  useEffect(() => {
    return () => disconnectSocket();
  }, []);

  // ------------------ 2. UI Views (Refactored) ------------------

  // (A) 설정 패널: 상태값(value)과 핸들러(onChange)가 눈에 잘 띔
  const viewConnection = (
    <div className={S.panel}>
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-600">내 ID</span>
          <input className={S.inputSm} value={myId} onChange={(e) => setMyId(e.target.value)} disabled={isConnected} />
        </div>
        <button 
          onClick={isConnected ? disconnectSocket : connectSocket} 
          className={`${S.btnBase} ${isConnected ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
        >
          {isConnected ? "종료" : "접속"}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-600">상대방</span>
        <input className={S.inputSm} value={targetId} onChange={(e) => setTargetId(e.target.value)} />
      </div>
    </div>
  );

  // (B) 로그 창: 복잡한 조건부 스타일 로직을 S.msg()로 숨김
  const viewLogs = (
    <div className={S.logBox}>
      {logs.map((log, i) => (
        <div key={i} className={`p-2 rounded-lg text-sm max-w-[85%] mb-2 shadow-sm border ${S.msg(log)}`}>
          {log}
        </div>
      ))}
    </div>
  );

  // (C) 입력 창: 클래스가 변수로 대체되어 구조 파악이 쉬움
  const viewInput = (
    <div className="flex gap-2">
      <input 
        className={S.inputLg} 
        value={inputMessage} 
        onChange={(e) => setInputMessage(e.target.value)} 
        onKeyPress={(e) => e.key === "Enter" && sendMessage()} 
        placeholder="메시지를 입력하세요..." 
        disabled={!isConnected} 
      />
      <button onClick={sendMessage} disabled={!isConnected} className={S.btnSend}>
        전송
      </button>
    </div>
  );

  // ------------------ 3. Final Render ------------------
  return (
    <div className="flex justify-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-2xl font-bold text-center mb-6">💬 1:1 채팅</h2>
        {viewConnection}
        {viewLogs}
        {viewInput}
      </div>
    </div>
  );
}

export default App;