import { useState, useEffect, useRef } from "react";
import { Send, Terminal, Power, PowerOff, Trash2, Copy, ChevronUp, History } from "lucide-react";
import { API_CONFIG, SERIAL_CONFIG } from "../../config/api.config.js";

const ManualControl = () => {
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [port, setPort] = useState(SERIAL_CONFIG.DEFAULT_PORT);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const logsEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Check connection status
  const checkStatus = async () => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.SERIAL}/status`);
      const data = await response.json();
      setIsConnected(data.connected && data.isOpen);
    } catch (error) {
      console.error("Error checking status:", error);
      setIsConnected(false);
    }
  };

  // Check status on mount and periodically
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Open COM port - persistent connection
  const handleOpenPort = async () => {
    setIsConnecting(true);
    addLog("🔌 Opening persistent connection...", "info");
    
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.SERIAL}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          port: port,
          baudRate: SERIAL_CONFIG.DEFAULT_BAUD_RATE,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        addLog("✅ Persistent connection established", "success");
        addLog("📍 Arduino position is now preserved between commands", "info");
        setIsConnected(true);
        
        // Send status query to verify
        setTimeout(() => {
          handleSendCommand("?", true);
        }, 500);
      } else {
        addLog(`❌ Failed to open port: ${data.error}`, "error");
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, "error");
    } finally {
      setIsConnecting(false);
    }
  };

  // Close COM port
  const handleClosePort = async () => {
    addLog("🔌 Closing persistent connection...", "info");
    
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.SERIAL}/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      
      if (data.success) {
        addLog("✅ Connection closed", "success");
        setIsConnected(false);
      } else {
        addLog(`❌ Error: ${data.error}`, "error");
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, "error");
    }
  };

  // Send command (with optional command parameter for programmatic use)
  const handleSendCommand = async (cmdOverride = null, silent = false) => {
    const cmd = cmdOverride || command.trim();
    if (!cmd) return;

    // Add to history if not a duplicate of the last command
    if (!cmdOverride && cmd !== commandHistory[0]) {
      setCommandHistory((prev) => [cmd, ...prev.slice(0, 49)]); // Keep last 50 commands
      setHistoryIndex(-1);
    }

    if (!silent) {
      addLog(`> ${cmd}`, "command");
    }

    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.SERIAL}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: cmd,
          port: port,
          baudRate: SERIAL_CONFIG.DEFAULT_BAUD_RATE,
          usePersistent: true, // Use persistent connection if available
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Log all responses
        if (data.responses && data.responses.length > 0) {
          data.responses.forEach((resp) => {
            if (resp && resp.trim()) {
              addLog(`< ${resp}`, "response");
            }
          });
        } else if (data.response) {
          addLog(`< ${data.response}`, "response");
        }
        
        // Indicate if using persistent connection
        if (!silent && data.persistent) {
          console.log("✓ Using persistent connection");
        }
      } else {
        addLog(`❌ Error: ${data.error}`, "error");
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, "error");
    }

    if (!cmdOverride) {
      setCommand("");
    }
  };

  // Add log entry
  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { message, type, timestamp }]);
  };

  // Clear logs
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Copy logs
  const handleCopyLogs = () => {
    const logText = logs.map((log) => `[${log.timestamp}] ${log.message}`).join("\n");
    navigator.clipboard.writeText(logText);
    addLog("📋 Logs copied to clipboard", "success");
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand("");
      }
    }
  };

  // Get log color based on type
  const getLogColor = (type) => {
    switch (type) {
      case "command":
        return "text-primary font-semibold";
      case "response":
        return "text-success";
      case "error":
        return "text-error";
      case "success":
        return "text-success font-semibold";
      default:
        return "text-base-content/70";
    }
  };

  return (
    <div className="bg-base-200 rounded-xl p-5 border border-base-300 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base-content">Manual Control</h3>
        </div>
        
        {/* Connection Status */}
        <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
          isConnected 
            ? "bg-success/20 text-success" 
            : "bg-base-300 text-base-content/50"
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-success animate-pulse" : "bg-base-content/30"
          }`}></div>
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* Port Controls */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          placeholder="Serial Port"
          className="input input-bordered input-sm flex-1 font-mono text-xs"
          disabled={isConnected}
        />
        
        {!isConnected ? (
          <button
            onClick={handleOpenPort}
            disabled={isConnecting}
            className="btn btn-success btn-sm gap-1 px-4"
          >
            {isConnecting ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <>
                <Power className="w-4 h-4" />
                <span className="hidden sm:inline">Connect</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleClosePort}
            className="btn btn-error btn-sm gap-1 px-4"
          >
            <PowerOff className="w-4 h-4" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        )}
      </div>

      {/* Command Input */}
      <div className="relative mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter G-code command... (↑↓ for history)"
              className="input input-bordered w-full font-mono text-sm pr-10"
            />
            {commandHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
                title="Command History"
              >
                <History className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => handleSendCommand()}
            disabled={!command.trim()}
            className="btn btn-primary gap-2 px-6"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>

        {/* History Dropdown */}
        {showHistory && commandHistory.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {commandHistory.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCommand(cmd);
                  setShowHistory(false);
                  inputRef.current?.focus();
                }}
                className="w-full text-left px-3 py-2 hover:bg-base-200 font-mono text-xs border-b border-base-300 last:border-b-0"
              >
                {cmd}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Commands */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => handleSendCommand("?", false)}
          className="btn btn-outline btn-sm gap-1 justify-start"
          title="Query Status"
        >
          <span className="font-mono font-bold">?</span>
          <span className="text-xs">Status</span>
        </button>
        <button
          onClick={() => handleSendCommand("$X", false)}
          className="btn btn-outline btn-sm gap-1 justify-start"
          title="Unlock GRBL"
        >
          <span className="font-mono font-bold">$X</span>
          <span className="text-xs">Unlock</span>
        </button>
        <button
          onClick={() => handleSendCommand("$$", false)}
          className="btn btn-outline btn-sm gap-1 justify-start"
          title="View Settings"
        >
          <span className="font-mono font-bold">$$</span>
          <span className="text-xs">Settings</span>
        </button>
        <button
          onClick={() => handleSendCommand("G0 X0 Y0", false)}
          className="btn btn-outline btn-sm gap-1 justify-start"
          title="Return to Origin"
        >
          <span className="font-mono font-bold">G0</span>
          <span className="text-xs">Origin</span>
        </button>
      </div>

      {/* Logs Section */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-base-content/70 flex items-center gap-1">
            <Terminal className="w-3 h-3" />
            Console Log ({logs.length})
          </span>
          <div className="flex gap-1">
            <button
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
              className="btn btn-ghost btn-xs gap-1"
              title="Copy all logs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px]">Copy</span>
            </button>
            <button
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="btn btn-ghost btn-xs gap-1"
              title="Clear console"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[10px]">Clear</span>
            </button>
          </div>
        </div>
        
        <div className="bg-base-100 rounded-lg p-4 h-80 overflow-y-auto font-mono text-xs border-2 border-base-300 shadow-inner">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-base-content/30">
              <div className="text-center">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">Console is empty</p>
                <p className="text-[10px] mt-1">Send commands to see Arduino responses</p>
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-2 items-start py-0.5">
                  <span className="text-base-content/30 shrink-0 text-[10px] font-normal mt-0.5">
                    {log.timestamp}
                  </span>
                  <span className={`${getLogColor(log.type)} break-all`}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualControl;
