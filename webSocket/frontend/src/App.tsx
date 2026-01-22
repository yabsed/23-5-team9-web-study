import { useState, useEffect, useRef } from "react";

// ------------------ Message Schema ------------------

interface SendMessageRequest {
  sender: string;
  receiver: string;
  message: string;
}

// ------------------ Styles ------------------
const S = {
  // general
  container: "w-full max-w-md bg-white rounded-2xl shadow-xl p-6",
  panel: "bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6",
  inputSm: "border border-gray-300 p-1 w-24 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
  inputLg: "flex-1 border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500",
  btnBase: "px-4 py-1 text-sm font-bold text-white rounded transition-colors",
  btnSend: "bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl font-bold disabled:bg-gray-300",
  logBox: "h-80 overflow-y-auto bg-gray-50 border rounded-xl p-4 mb-4 shadow-inner",
  // message
  msg: (text: string) => {
    if (text.startsWith("📤")) return "bg-blue-100 self-end text-blue-900 border-blue-200";
    if (text.startsWith("✅") || text.startsWith("⚠️")) return "bg-gray-200 self-center text-xs text-gray-600";
    return "bg-white self-start text-gray-800 border-gray-200";
  }
};

function App() {
  // ------------------ Logic & State ------------------
  // sender, receiver
  const [senderId, setSenderId] = useState<string>("user1");
  const [receiverId, setReceiverId] = useState<string>("user2");
  // connection
  const [isConnected, setIsConnected] = useState<boolean>(false);
  // message information
  const [logs, setLogs] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  // webSocket
  const socketRef = useRef<WebSocket | null>(null);

  // ------------------ Helper ------------------
  // modify setLogs
  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  // ------------------ WebSocekt ------------------
  const connectSocket = () => {
    if (socketRef.current) return;
    // Receiver is connected via WebSocket
    const socket = new WebSocket(`ws://localhost:8000/ws/${senderId}`);
    // if new socket 
    // then (1) modify isConnected
    //      (2) update logs        
    socket.onopen = () => { setIsConnected(true); addLog(`✅ 시스템: ${senderId} 접속`); };
    // if new message
    // then (1) update logs
    socket.onmessage = (e) => addLog(`📩 ${e.data}`);
    // if close socket
    // then (1) modify isConnected 
    //      (2) nullify socketRef.current  
    socket.onclose = () => { setIsConnected(false); socketRef.current = null; };
    socketRef.current = socket;
  };

  const disconnectSocket = () => {
    socketRef.current?.close();
    socketRef.current = null;
    setIsConnected(false);
  };

  // disconnect socket 
  // when component unmounts
  useEffect(() => { return () => disconnectSocket(); }, []);

  // ------------------ API call ------------------

  const sendMessage = async () => {
    if (!inputMessage) return;
    try {
      // Sender Calls Server using API CALL
      const payload: SendMessageRequest = { sender: senderId, receiver: receiverId, message: inputMessage };
      await fetch("http://localhost:8000/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      addLog(`📤 나: ${inputMessage}`);
      setInputMessage("");
    } catch (e) { addLog("⚠️ 전송 실패"); }
  };

  // ------------------ UI Views ------------------
  // Setting Pannel
  const viewConnection = (
    <div className={S.panel}>
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-600">내 ID</span>
          <input className={S.inputSm} value={senderId} onChange={(e) => setSenderId(e.target.value)} disabled={isConnected} />
        </div>
        {/* connectSocket, disconnectSocket */}
        <button 
          onClick={isConnected ? disconnectSocket : connectSocket} 
          className={`${S.btnBase} ${isConnected ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
        >
          {isConnected ? "종료" : "접속"}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-600">상대방</span>
        <input className={S.inputSm} value={receiverId} onChange={(e) => setReceiverId(e.target.value)} />
      </div>
    </div>
  );
  // Log
  const viewLogs = (
    <div className={S.logBox}>
      {logs.map((log, i) => (
        <div key={i} className={`p-2 rounded-lg text-sm max-w-[85%] mb-2 shadow-sm border ${S.msg(log)}`}>
          {log}
        </div>
      ))}
    </div>
  );
  // Input
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
      {/* sendMessage */}
      <button onClick={sendMessage} disabled={!isConnected} className={S.btnSend}>
        전송
      </button>
    </div>
  );
  return (
    <div className="flex justify-center min-h-screen bg-gray-100 p-4 font-sans">
      <div className={S.container}>
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">💬 1:1 채팅</h2>
        {viewConnection}
        {viewLogs}
        {viewInput}
      </div>
    </div>
  );
}

export default App;