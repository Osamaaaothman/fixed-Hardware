import { useState, useEffect, useRef } from "react";
import {
  X,
  Terminal,
  Play,
  Pause,
  Trash2,
  Wifi,
  WifiOff,
  Unplug,
} from "lucide-react";
import { API_CONFIG, SERIAL_CONFIG } from "../config/api.config.js";

const SerialLogModal = ({ isOpen, onClose, gcode, port = SERIAL_CONFIG.DEFAULT_PORT }) => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("idle"); // idle, connecting, sending, complete, error, disconnected
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [portStatus, setPortStatus] = useState({
    connected: false,
    isOpen: false,
  }); // حالة الـ Port
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  const portCheckInterval = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Start sending when modal opens
  useEffect(() => {
    if (isOpen && gcode) {
      startSending();
      // بدء مراقبة حالة الـ Port
      startPortMonitoring();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      // إيقاف مراقبة الـ Port
      if (portCheckInterval.current) {
        clearInterval(portCheckInterval.current);
      }
    };
  }, [isOpen, gcode]);

  // مراقبة حالة الـ Port كل ثانية
  const startPortMonitoring = () => {
    // فحص فوري
    checkPortStatus();

    // فحص دوري كل ثانية
    portCheckInterval.current = setInterval(() => {
      checkPortStatus();
    }, 1000);
  };

  const checkPortStatus = async () => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.SERIAL}/status`);
      const data = await response.json();

      const wasConnected = portStatus.connected;
      setPortStatus({
        connected: data.connected,
        isOpen: data.isOpen,
        port: data.port,
      });

      // إذا كان متصل وانفصل فجأة
      if (wasConnected && !data.connected && status === "sending") {
        setStatus("disconnected");
        addLog("⚠️ Port disconnected! Drawing stopped.", "error");

        // إيقاف الإرسال
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      }
    } catch (error) {
      console.error("Error checking port status:", error);
      setPortStatus({ connected: false, isOpen: false });
    }
  };

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  const startSending = async () => {
    setLogs([]);
    setStatus("connecting");
    setProgress({ current: 0, total: 0 });

    try {
      // Create EventSource for SSE
      const url = `${API_CONFIG.ENDPOINTS.SERIAL}/send`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gcode, port }),
      });

      if (!response.ok) {
        throw new Error("Failed to start serial communication");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      const readStream = async () => {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            const eventMatch = line.match(/^event: (.+)$/m);
            const dataMatch = line.match(/^data: (.+)$/m);

            if (eventMatch && dataMatch) {
              const event = eventMatch[1];
              const data = JSON.parse(dataMatch[1]);

              handleEvent(event, data);
            }
          }
        }
      };

      readStream().catch((error) => {
        console.error("Stream error:", error);
        addLog(`Error: ${error.message}`, "error");
        setStatus("error");
      });
    } catch (error) {
      console.error("Error starting serial:", error);
      addLog(`Error: ${error.message}`, "error");
      setStatus("error");
    }
  };

  const handleEvent = (event, data) => {
    switch (event) {
      case "status":
        setStatus("sending");
        addLog(data.message, "status");
        break;

      case "progress":
        setProgress({ current: data.current, total: data.total });
        addLog(`[${data.current}/${data.total}] ${data.line}`, "command");
        break;

      case "log":
        addLog(`← ${data.message}`, "response");
        break;

      case "complete":
        setStatus("complete");
        addLog(
          `✓ Complete! ${data.totalLines} lines sent in ${data.totalTime}`,
          "success"
        );
        break;

      case "error":
        setStatus("error");
        addLog(`✗ Error: ${data.message}`, "error");
        break;

      default:
        console.log("Unknown event:", event, data);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const handleClose = () => {
    // Force stop any ongoing communication
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    if (portCheckInterval.current) {
      clearInterval(portCheckInterval.current);
    }
    // Reset state
    setLogs([]);
    setStatus("idle");
    setProgress({ current: 0, total: 0 });
    // Call parent close
    onClose();
  };

  if (!isOpen) return null;

  const getLogColor = (type) => {
    switch (type) {
      case "error":
        return "text-error";
      case "success":
        return "text-success";
      case "command":
        return "text-primary";
      case "response":
        return "text-accent";
      case "status":
        return "text-info";
      default:
        return "text-base-content";
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "connecting":
        return (
          <span className="badge badge-warning gap-2">
            <Play className="w-3 h-3" /> Connecting...
          </span>
        );
      case "sending":
        return (
          <span className="badge badge-info gap-2">
            <Play className="w-3 h-3 animate-pulse" /> Sending...
          </span>
        );
      case "complete":
        return <span className="badge badge-success gap-2">✓ Complete</span>;
      case "disconnected":
        return (
          <span className="badge badge-error gap-2">
            <Unplug className="w-3 h-3" /> Disconnected
          </span>
        );
      case "error":
        return <span className="badge badge-error gap-2">✗ Error</span>;
      default:
        return <span className="badge badge-ghost">Idle</span>;
    }
  };

  const getPortStatusBadge = () => {
    if (portStatus.connected && portStatus.isOpen) {
      return (
        <div className="flex items-center gap-2 text-success">
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-semibold">Port Connected</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-error">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-semibold">Port Disconnected</span>
        </div>
      );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={
          status === "complete" || status === "error" ? onClose : undefined
        }
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-base-200 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-primary/20">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-base-300">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full"></div>
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Terminal className="w-6 h-6" />
                  Serial Communication Logs
                </h3>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-base-content/60">Port: {port}</p>
                  {getPortStatusBadge()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <button
                onClick={handleClose}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {status === "sending" && progress.total > 0 && (
            <div className="px-6 py-3 bg-base-300 border-b border-base-300">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>
                  Progress: {progress.current} / {progress.total} lines
                </span>
                <span>
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={progress.current}
                max={progress.total}
              ></progress>
            </div>
          )}

          {/* Port Disconnection Warning */}
          {status === "disconnected" && (
            <div className="px-6 py-3 bg-error/10 border-b border-error/30">
              <div className="flex items-center gap-3 text-error">
                <Unplug className="w-5 h-5 animate-pulse" />
                <div>
                  <p className="font-semibold">Port Disconnected!</p>
                  <p className="text-sm">
                    The Arduino connection was lost. Please check the cable and
                    reconnect.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Logs Container */}
          <div className="flex-1 overflow-auto p-6 bg-base-300 font-mono text-sm">
            <div className="space-y-1">
              {logs.length === 0 && (
                <div className="text-center text-base-content/50 py-8">
                  <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Waiting for logs...</p>
                </div>
              )}
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`${getLogColor(log.type)} flex gap-2`}
                >
                  <span className="text-base-content/50">
                    [{log.timestamp}]
                  </span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 p-6 border-t border-base-300">
            <button
              onClick={clearLogs}
              className="btn btn-outline btn-sm gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Logs
            </button>
            <div className="flex-1"></div>
            <button
              onClick={onClose}
              className="btn btn-primary"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending..." : "Close"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SerialLogModal;
