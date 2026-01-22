import React, { useState, useEffect, useRef } from "react";

interface SendMessageRequest {
  sender: string;
  receiver: string;
  message: string;
}

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

  // ------------------ Render ------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans">
      {/* 메인 카드 컨테이너 */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          💬 1:1 채팅
        </h2>

        {/* 설정 영역 (회색 박스) */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6">
          {/* 내 ID + 접속 버튼 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-600">내 ID</span>
              <input
                className="border border-gray-300 rounded-lg px-3 py-1.5 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-200 disabled:text-gray-500"
                value={myId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMyId(e.target.value)}
                disabled={isConnected}
              />
            </div>
            <button
              onClick={isConnected ? disconnectSocket : connectSocket}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors duration-200 ${
                isConnected
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              {isConnected ? "종료" : "접속"}
            </button>
          </div>

          {/* 상대방 ID */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-600">상대방 ID</span>
            <input
              className="border border-gray-300 rounded-lg px-3 py-1.5 w-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={targetId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetId(e.target.value)}
            />
          </div>
        </div>

        {/* 채팅 로그 영역 */}
        <div className="h-80 overflow-y-auto bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 shadow-inner custom-scrollbar">
          {logs.length === 0 ? (
            <p className="text-gray-400 text-center text-sm mt-10">대화 내용이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-sm max-w-[85%] break-words shadow-sm ${
                    log.startsWith("📤 나:")
                      ? "bg-blue-100 self-end text-blue-900 border border-blue-200" // 내가 보낸 메시지 스타일
                      : log.startsWith("✅") || log.startsWith("⚠️")
                      ? "bg-gray-200 self-center text-xs text-gray-600 rounded-full px-4" // 시스템 메시지 스타일
                      : "bg-white self-start text-gray-800 border border-gray-200" // 받은 메시지 스타일
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 입력 영역 */}
        <div className="flex items-center gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-100"
            value={inputMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            disabled={!isConnected}
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-3 rounded-xl font-bold transition-colors shadow-md flex-shrink-0"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;