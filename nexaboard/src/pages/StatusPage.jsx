import { useState, useEffect, useRef } from "react";
import {
  Activity,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  AlertCircle,
  Power,
  Send,
  RefreshCw,
  Terminal,
  Box as BoxIcon,
  Cpu,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { SOCKET_CONFIG } from "../config/api.config.js";
import {
  connectBox,
  disconnectBox,
  getBoxStatus,
  sendBoxCommand,
  listBoxPorts,
} from "../api/boxApi";
import {
  connectSerial,
  disconnectSerial,
  getSerialStatus,
  listSerialPorts,
  sendSerialCommand,
} from "../api/serialApi";
import { captureImage } from "../api/cameraApi";

const StatusPage = () => {
  // CNC/Serial state
  const [cncStatus, setCncStatus] = useState({
    connected: false,
    port: null,
    isDrawing: false,
    position: { x: 0, y: 0, z: -2.3 },
    lastCommand: null,
  });
  const [cncActivityLog, setCncActivityLog] = useState([]);
  const [cncPorts, setCncPorts] = useState([]);
  const [selectedCncPort, setSelectedCncPort] = useState("/dev/ttyUSB0");
  const [isConnectingCnc, setIsConnectingCnc] = useState(false);
  const [cncCommand, setCncCommand] = useState("");
  const [cncCommandHistory, setCncCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showCncPortSelector, setShowCncPortSelector] = useState(false);

  // Box state
  const [boxStatus, setBoxStatus] = useState({
    connected: false,
    port: null,
    loggedIn: false,
    currentMode: "DISCONNECTED",
    lastMessage: null,
    lastActivity: null,
  });
  const [boxActivityLog, setBoxActivityLog] = useState([]);
  const [boxPorts, setBoxPorts] = useState([]);
  const [selectedBoxPort, setSelectedBoxPort] = useState("/dev/ttyACM0");
  const [isConnectingBox, setIsConnectingBox] = useState(false);
  const [boxCommand, setBoxCommand] = useState("");
  const [showBoxPortSelector, setShowBoxPortSelector] = useState(false);

  // System state
  const [systemLocked, setSystemLocked] = useState(false);
  const [socket, setSocket] = useState(null);

  // Refs for auto-scroll
  const cncLogRef = useRef(null);
  const boxLogRef = useRef(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (cncLogRef.current) {
      cncLogRef.current.scrollTop = cncLogRef.current.scrollHeight;
    }
  }, [cncActivityLog]);

  useEffect(() => {
    if (boxLogRef.current) {
      boxLogRef.current.scrollTop = boxLogRef.current.scrollHeight;
    }
  }, [boxActivityLog]);

  // ===== CNC Functions =====

  const fetchCncStatus = async () => {
    try {
      const data = await getSerialStatus();
      if (data) {
        setCncStatus({
          connected: data.connected || false,
          port: data.port || null,
          isDrawing: data.isDrawing || false,
          position: data.position || { x: 0, y: 0, z: -2.3 },
          lastCommand: data.lastCommand || null,
        });
      }
    } catch (error) {
      console.error("Error fetching CNC status:", error);
    }
  };

  const fetchCncPorts = async () => {
    try {
      const data = await listSerialPorts();
      if (data.success) {
        setCncPorts(data.ports || []);
      }
    } catch (error) {
      console.error("Error fetching CNC ports:", error);
    }
  };

  const handleCncConnect = async () => {
    setIsConnectingCnc(true);
    const toastId = toast.loading(`Connecting to CNC on ${selectedCncPort}...`);

    try {
      const result = await connectSerial(selectedCncPort);
      if (result.success) {
        toast.success("Connected to CNC successfully", { id: toastId });
        setShowCncPortSelector(false);
        addCncLog("success", `Connected to ${selectedCncPort}`);
        // Save connection state to localStorage for persistence
        localStorage.setItem("cncConnected", "true");
        localStorage.setItem("cncPort", selectedCncPort);
        await fetchCncStatus();
      } else {
        throw new Error(result.error || "Connection failed");
      }
    } catch (error) {
      toast.error(error.message || "Failed to connect to CNC", { id: toastId });
      addCncLog("error", `Failed to connect: ${error.message}`);
    } finally {
      setIsConnectingCnc(false);
    }
  };

  const handleCncDisconnect = async () => {
    const toastId = toast.loading("Disconnecting from CNC...");

    try {
      const result = await disconnectSerial();
      if (result.success) {
        toast.success("Disconnected from CNC successfully", { id: toastId });
        addCncLog("info", "Disconnected from CNC");
        // Clear connection state from localStorage
        localStorage.removeItem("cncConnected");
        localStorage.removeItem("cncPort");
        await fetchCncStatus();
      } else {
        throw new Error(result.error || "Disconnect failed");
      }
    } catch (error) {
      toast.error(error.message || "Failed to disconnect from CNC", {
        id: toastId,
      });
      addCncLog("error", `Failed to disconnect: ${error.message}`);
    }
  };

  const handleSendCncCommand = async (e) => {
    e?.preventDefault();
    if (!cncCommand.trim()) return;

    const cmd = cncCommand.trim();
    addCncLog("command", `> ${cmd}`);

    try {
      const result = await sendSerialCommand(cmd);
      if (result.success) {
        addCncLog("response", result.response || "OK");
        // Add to history
        setCncCommandHistory((prev) => [cmd, ...prev].slice(0, 50));
        setCncCommand("");
        setHistoryIndex(-1);
        toast.success("Command sent successfully");
      } else {
        throw new Error(result.error || "Command failed");
      }
    } catch (error) {
      toast.error(error.message || "Failed to send command");
      addCncLog("error", `Error: ${error.message}`);
    }
  };

  const handleCncCommandKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendCncCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < cncCommandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCncCommand(cncCommandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCncCommand(cncCommandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCncCommand("");
      }
    }
  };

  const addCncLog = (type, message) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type, // 'command', 'response', 'error', 'success', 'info'
      message,
    };
    setCncActivityLog((prev) => [...prev, logEntry].slice(-100));
  };

  // ===== Box Functions =====

  const fetchBoxStatus = async () => {
    try {
      const data = await getBoxStatus();
      if (data.success) {
        setBoxStatus(data.status);
        setBoxActivityLog(data.activityLog || []);
      }
    } catch (error) {
      console.error("Error fetching Box status:", error);
    }
  };

  const fetchBoxPorts = async () => {
    try {
      const data = await listBoxPorts();
      if (data.success) {
        setBoxPorts(data.ports || []);
      }
    } catch (error) {
      console.error("Error fetching Box ports:", error);
    }
  };

  const handleBoxConnect = async () => {
    setIsConnectingBox(true);
    const toastId = toast.loading(`Connecting to Box on ${selectedBoxPort}...`);

    try {
      await connectBox(selectedBoxPort);
      toast.success("Connected to Box successfully", { id: toastId });
      setShowBoxPortSelector(false);
      // Save connection state to localStorage for persistence
      localStorage.setItem("boxConnected", "true");
      localStorage.setItem("boxPort", selectedBoxPort);
    } catch (error) {
      toast.error(error.message || "Failed to connect to Box", { id: toastId });
    } finally {
      setIsConnectingBox(false);
    }
  };

  const handleBoxDisconnect = async () => {
    const toastId = toast.loading("Disconnecting from Box...");

    try {
      await disconnectBox();
      toast.success("Disconnected from Box successfully", { id: toastId });
      // Clear connection state from localStorage
      localStorage.removeItem("boxConnected");
      localStorage.removeItem("boxPort");
    } catch (error) {
      toast.error(error.message || "Failed to disconnect from Box", {
        id: toastId,
      });
    }
  };

  const handleSendBoxCommand = async (command) => {
    const toastId = toast.loading(`Sending command: ${command}...`);

    try {
      await sendBoxCommand(command);
      toast.success(`Command "${command}" sent successfully`, { id: toastId });
    } catch (error) {
      toast.error(error.message || `Failed to send command: ${command}`, {
        id: toastId,
      });
    }
  };

  const handleScreenshot = async (skipModeActivation = false) => {
    const toastId = toast.loading(
      skipModeActivation
        ? "Capturing screenshot from hardware..."
        : "Activating screenshot mode..."
    );

    let screenshotModeActivated = skipModeActivation;

    try {
      // Check if Box is connected before proceeding
      if (!boxStatus.connected) {
        toast.error("Box is not connected. Please connect to Box first.", {
          id: toastId,
        });
        return;
      }

      // Only send screenshot command if triggered from app (not hardware)
      if (!skipModeActivation) {
        try {
          await sendBoxCommand("screenshot");
          screenshotModeActivated = true;
          // Wait for the Box to show camera icon/flash animation (500ms)
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (cmdError) {
          console.error("Failed to activate screenshot mode:", cmdError);
          toast.error("Failed to activate screenshot mode on Box", {
            id: toastId,
          });
          return;
        }
      }

      // Try to capture the image from camera (non-blocking)
      try {
        const timestamp = new Date()
          .toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
          .replace(/[/:]/g, "-")
          .replace(", ", "_");

        const imageName = `Screenshot_${timestamp}`;

        await captureImage(imageName);
        toast.success("Screenshot captured successfully!", { id: toastId });
      } catch (captureError) {
        console.error("Camera capture failed (continuing):", captureError);
        toast.warning("Screenshot mode activated, but camera capture failed. Check camera connection.", {
          id: toastId,
        });
      }

      // Return to MENU mode after 500ms
      setTimeout(async () => {
        if (screenshotModeActivated) {
          try {
            await sendBoxCommand("ready");
          } catch (error) {
            console.error("Failed to return to menu:", error);
          }
        }
      }, 500);
    } catch (error) {
      console.error("Screenshot error:", error);
      toast.error(error.message || "Failed to process screenshot", {
        id: toastId,
      });

      // Try to return to menu on error
      if (screenshotModeActivated) {
        try {
          await sendBoxCommand("ready");
        } catch (exitError) {
          console.error(
            "Failed to return to menu after error:",
            exitError
          );
        }
      }
    }
  };

  const handleSendCustomBoxCommand = async (e) => {
    e?.preventDefault();
    if (!boxCommand.trim()) return;

    const cmd = boxCommand.trim();
    await handleSendBoxCommand(cmd);
    setBoxCommand("");
  };

  // ===== Initialize Socket.IO connection =====
  useEffect(() => {
    const newSocket = io(SOCKET_CONFIG.SERVER_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("[STATUS] Socket.IO connected");
    });

    newSocket.on("disconnect", () => {
      console.log("[STATUS] Socket.IO disconnected");
    });

    // Box events
    newSocket.on("box:status", (data) => {
      console.log("[STATUS] Box status update:", data);
      setBoxStatus(data);
    });

    newSocket.on("box:activity", (activity) => {
      console.log("[STATUS] Box activity:", activity);
      setBoxActivityLog((prev) => [activity, ...prev].slice(0, 100));
    });

    newSocket.on("box:connected", (data) => {
      console.log("[STATUS] Box connected:", data);
      toast.success(`Connected to Box on ${data.port}`);
    });

    newSocket.on("box:disconnected", () => {
      console.log("[STATUS] Box disconnected");
      toast.info("Box disconnected");
    });

    newSocket.on("box:error", (data) => {
      console.error("[STATUS] Box error:", data);
      toast.error(data.message);
    });

    // Box screenshot request from hardware keypad
    newSocket.on("box:screenshot-request", (data) => {
      console.log("[STATUS] Hardware screenshot request:", data);
      // Trigger automatic screenshot capture (skip mode activation since hardware already did it)
      handleScreenshot(true);
    });

    // CNC/Serial events (to be added in backend)
    newSocket.on("serial:status", (data) => {
      console.log("[STATUS] CNC status update:", data);
      setCncStatus({
        connected: data.connected || false,
        port: data.port || null,
        isDrawing: data.isDrawing || false,
        position: data.position || { x: 0, y: 0, z: -2.3 },
        lastCommand: data.lastCommand || null,
      });
    });

    newSocket.on("serial:connected", (data) => {
      console.log("[STATUS] CNC connected:", data);
      toast.success(`Connected to CNC on ${data.port}`);
      addCncLog("success", `Connected to ${data.port}`);
    });

    newSocket.on("serial:disconnected", () => {
      console.log("[STATUS] CNC disconnected");
      toast.info("CNC disconnected");
      addCncLog("info", "Disconnected from CNC");
    });

    newSocket.on("serial:response", (data) => {
      console.log("[STATUS] CNC response:", data);
      addCncLog("response", data.message || data.response);
    });

    newSocket.on("serial:error", (data) => {
      console.error("[STATUS] CNC error:", data);
      toast.error(data.message);
      addCncLog("error", data.message);
    });

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, []);

  // ===== Polling for status updates =====
  useEffect(() => {
    // Initial fetch
    fetchCncStatus();
    fetchBoxStatus();
    fetchCncPorts();
    fetchBoxPorts();

    // Poll every 2 seconds
    const interval = setInterval(() => {
      fetchCncStatus();
      fetchBoxStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // ===== Auto-reconnect on page load (only once on initial mount) =====
  useEffect(() => {
    let hasAttemptedReconnect = false;

    const autoReconnect = async () => {
      // Prevent multiple reconnection attempts
      if (hasAttemptedReconnect) {
        console.log("[STATUS] Skipping reconnect - already attempted");
        return;
      }
      hasAttemptedReconnect = true;

      // Wait for initial status fetch to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if CNC was previously connected
      const cncWasConnected = localStorage.getItem("cncConnected") === "true";
      const savedCncPort = localStorage.getItem("cncPort");

      // Only reconnect if not already connected
      if (cncWasConnected && savedCncPort && !cncStatus.connected) {
        console.log("[STATUS] Auto-reconnecting to CNC on", savedCncPort);
        setSelectedCncPort(savedCncPort);
        try {
          const result = await connectSerial(savedCncPort);
          if (result.success) {
            addCncLog("success", `Auto-reconnected to ${savedCncPort}`);
            toast.success(`Reconnected to CNC on ${savedCncPort}`);
          } else {
            // Connection failed, clear stored state
            localStorage.removeItem("cncConnected");
            localStorage.removeItem("cncPort");
          }
        } catch (error) {
          console.error("[STATUS] Auto-reconnect failed:", error);
          localStorage.removeItem("cncConnected");
          localStorage.removeItem("cncPort");
        }
      } else if (cncStatus.connected) {
        console.log("[STATUS] CNC already connected, skipping auto-reconnect");
      }

      // Check if Box was previously connected
      const boxWasConnected = localStorage.getItem("boxConnected") === "true";
      const savedBoxPort = localStorage.getItem("boxPort");

      // Only reconnect if not already connected
      if (boxWasConnected && savedBoxPort && !boxStatus.connected) {
        console.log("[STATUS] Auto-reconnecting to Box on", savedBoxPort);
        setSelectedBoxPort(savedBoxPort);
        try {
          await connectBox(savedBoxPort);
          toast.success(`Reconnected to Box on ${savedBoxPort}`);
        } catch (error) {
          console.error("[STATUS] Box auto-reconnect failed:", error);
          localStorage.removeItem("boxConnected");
          localStorage.removeItem("boxPort");
        }
      } else if (boxStatus.connected) {
        console.log("[STATUS] Box already connected, skipping auto-reconnect");
      }
    };

    // Delay auto-reconnect slightly to let the component fully mount and status fetch
    const timer = setTimeout(autoReconnect, 1000);
    return () => {
      clearTimeout(timer);
      hasAttemptedReconnect = false;
    };
  }, []);

  // ===== Helper functions =====

  const getStatusBadgeClass = (status) => {
    const statusLower = status?.toLowerCase() || "";

    if (statusLower.includes("ready") || statusLower.includes("idle")) {
      return "badge-success";
    }
    if (
      statusLower.includes("writing") ||
      statusLower.includes("erasing") ||
      statusLower.includes("processing")
    ) {
      return "badge-warning";
    }
    if (
      statusLower.includes("error") ||
      statusLower.includes("fail") ||
      statusLower.includes("locked")
    ) {
      return "badge-error";
    }
    if (statusLower.includes("sleep")) {
      return "badge-ghost";
    }
    return "badge-info";
  };

  const getModeIcon = (mode) => {
    const modeLower = mode?.toLowerCase() || "";

    if (modeLower.includes("writing")) return "✍️";
    if (modeLower.includes("erasing")) return "🧹";
    if (modeLower.includes("ready")) return "✅";
    if (modeLower.includes("sleep")) return "😴";
    if (modeLower.includes("logout") || modeLower.includes("disconnected"))
      return "🚪";
    return "ℹ️";
  };

  return (
    <div className="w-full h-full p-8 overflow-auto bg-base-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-primary/20">
          <div className="w-1 h-8 bg-primary rounded-full"></div>
          <h2 className="text-3xl font-bold">System Status & Connections</h2>
          <Activity className="w-6 h-6 text-primary ml-auto animate-pulse" />
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* CNC Status Card */}
          <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                CNC Controller
              </h3>
              {cncStatus.connected ? (
                <Wifi className="w-5 h-5 text-success animate-pulse" />
              ) : (
                <WifiOff className="w-5 h-5 text-error" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Port</span>
                <span className="font-medium font-mono text-xs">
                  {cncStatus.port || "Not connected"}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Status</span>
                <span
                  className={`badge badge-sm ${
                    cncStatus.connected ? "badge-success" : "badge-ghost"
                  }`}
                >
                  {cncStatus.connected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Drawing</span>
                <span
                  className={`badge badge-sm ${
                    cncStatus.isDrawing ? "badge-warning" : "badge-ghost"
                  }`}
                >
                  {cncStatus.isDrawing ? "Active" : "Idle"}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Position</span>
                <span className="font-mono text-xs">
                  X:{cncStatus.position.x.toFixed(1)} Y:
                  {cncStatus.position.y.toFixed(1)} Z:
                  {cncStatus.position.z.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Box Status Card */}
          <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BoxIcon className="w-5 h-5" />
                Box Controller
              </h3>
              {boxStatus.connected ? (
                <Wifi className="w-5 h-5 text-success animate-pulse" />
              ) : (
                <WifiOff className="w-5 h-5 text-error" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Port</span>
                <span className="font-medium font-mono text-xs">
                  {boxStatus.port || "Not connected"}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Connection</span>
                <span
                  className={`badge badge-sm ${
                    boxStatus.connected ? "badge-success" : "badge-ghost"
                  }`}
                >
                  {boxStatus.connected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">User Status</span>
                <span
                  className={`badge badge-sm ${
                    boxStatus.loggedIn ? "badge-success" : "badge-ghost"
                  }`}
                >
                  {boxStatus.loggedIn ? "Logged In" : "Logged Out"}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Current Mode</span>
                <span
                  className={`badge badge-sm ${getStatusBadgeClass(
                    boxStatus.currentMode
                  )}`}
                >
                  {getModeIcon(boxStatus.currentMode)} {boxStatus.currentMode}
                </span>
              </div>
            </div>
          </div>

          {/* System Lock Status Card */}
          <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-base-content">System Lock</span>
              </h3>
              {systemLocked ? (
                <Lock className="w-5 h-5 text-error" />
              ) : (
                <Unlock className="w-5 h-5 text-success" />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-base-content/70 text-sm">Status</span>
                <span
                  className={`badge ${
                    systemLocked ? "badge-error" : "badge-success"
                  } gap-2`}
                >
                  {systemLocked ? "🔒 Locked" : "🔓 Unlocked"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Connection Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ===== CNC CONNECTION PANEL ===== */}
          <div className="space-y-6">
            {/* CNC Connection Control */}
            <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Power className="w-5 h-5" />
                CNC Connection
              </h3>

              <div className="space-y-4">
                {/* Port Selector */}
                {!cncStatus.connected && (
                  <div className="space-y-2">
                    <label className="text-sm text-base-content/70">
                      Serial Port
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedCncPort}
                        onChange={(e) => setSelectedCncPort(e.target.value)}
                        className="input input-bordered flex-1 font-mono text-sm"
                        placeholder="COM3"
                      />
                      <button
                        onClick={() => {
                          setShowCncPortSelector(!showCncPortSelector);
                          if (!showCncPortSelector) fetchCncPorts();
                        }}
                        className="btn btn-ghost btn-sm"
                        title="Show available ports"
                      >
                        <Terminal className="w-4 h-4" />
                      </button>
                    </div>

                    {showCncPortSelector && (
                      <div className="bg-base-300 rounded-lg p-3 space-y-2 max-h-40 overflow-auto">
                        <p className="text-xs text-base-content/70 mb-2">
                          Available ports:
                        </p>
                        {cncPorts.length > 0 ? (
                          cncPorts.map((port) => (
                            <button
                              key={port.path}
                              onClick={() => {
                                setSelectedCncPort(port.path);
                                setShowCncPortSelector(false);
                              }}
                              className="btn btn-ghost btn-xs w-full justify-start font-mono text-xs"
                            >
                              {port.path}
                              {port.manufacturer && (
                                <span className="text-base-content/50 ml-2">
                                  ({port.manufacturer})
                                </span>
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-base-content/50">
                            No ports detected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Connection Buttons */}
                <div className="flex gap-2">
                  {!cncStatus.connected ? (
                    <button
                      onClick={handleCncConnect}
                      disabled={isConnectingCnc || !selectedCncPort}
                      className="btn btn-primary flex-1 gap-2"
                    >
                      {isConnectingCnc ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wifi className="w-4 h-4" />
                          Connect CNC
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleCncDisconnect}
                      className="btn btn-error flex-1 gap-2"
                    >
                      <WifiOff className="w-4 h-4" />
                      Disconnect CNC
                    </button>
                  )}

                  <button
                    onClick={fetchCncStatus}
                    className="btn btn-ghost gap-2"
                    title="Refresh status"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Baud Rate Info */}
                <div className="text-xs text-base-content/50 flex items-center justify-between">
                  <span>Baud Rate: 115200</span>
                  {cncStatus.connected && (
                    <span className="text-success">
                      ● Persistent Connection
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* CNC Command Panel */}
            <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5" />
                CNC Commands
              </h3>

              <form onSubmit={handleSendCncCommand} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cncCommand}
                    onChange={(e) => setCncCommand(e.target.value)}
                    onKeyDown={handleCncCommandKeyDown}
                    placeholder="Enter G-code command (e.g., G28)"
                    className="input input-bordered flex-1 font-mono text-sm"
                    disabled={!cncStatus.connected}
                  />
                  <button
                    type="submit"
                    disabled={!cncStatus.connected || !cncCommand.trim()}
                    className="btn btn-primary gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-base-content/50">
                  Press ↑/↓ for command history, Enter to send
                </div>

                {/* Quick Commands */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCncCommand("G28");
                      handleSendCncCommand();
                    }}
                    disabled={!cncStatus.connected}
                    className="btn btn-sm btn-ghost"
                  >
                    🏠 Home
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCncCommand("$H");
                      handleSendCncCommand();
                    }}
                    disabled={!cncStatus.connected}
                    className="btn btn-sm btn-ghost"
                  >
                    🎯 Homing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCncCommand("?");
                      handleSendCncCommand();
                    }}
                    disabled={!cncStatus.connected}
                    className="btn btn-sm btn-ghost"
                  >
                    ❓ Status
                  </button>
                </div>
              </form>

              {!cncStatus.connected && (
                <div className="alert alert-warning mt-4 py-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">
                    Connect to CNC to send commands
                  </span>
                </div>
              )}
            </div>

            {/* CNC Activity Log */}
            <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  CNC Activity Log
                </h3>
                <div className="flex gap-2 items-center">
                  <span className="badge badge-ghost text-xs">
                    {cncActivityLog.length} events
                  </span>
                  <button
                    onClick={() => setCncActivityLog([])}
                    className="btn btn-ghost btn-xs"
                    title="Clear log"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div
                ref={cncLogRef}
                className="bg-base-300 rounded-lg p-4 max-h-96 overflow-auto font-mono text-xs space-y-1"
              >
                {cncActivityLog.length > 0 ? (
                  cncActivityLog.map((log, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 ${
                        log.type === "error"
                          ? "text-error"
                          : log.type === "success"
                          ? "text-success"
                          : log.type === "command"
                          ? "text-primary"
                          : log.type === "response"
                          ? "text-info"
                          : "text-base-content"
                      }`}
                    >
                      <span className="text-base-content/50 shrink-0 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-base-content/50 py-8">
                    No activity yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== BOX CONNECTION PANEL ===== */}
          <div className="space-y-6">
            {/* Box Connection Control */}
            <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Power className="w-5 h-5" />
                Box Connection
              </h3>

              <div className="space-y-4">
                {/* Port Selector */}
                {!boxStatus.connected && (
                  <div className="space-y-2">
                    <label className="text-sm text-base-content/70">
                      Serial Port
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedBoxPort}
                        onChange={(e) => setSelectedBoxPort(e.target.value)}
                        className="input input-bordered flex-1 font-mono text-sm"
                        placeholder="COM4"
                      />
                      <button
                        onClick={() => {
                          setShowBoxPortSelector(!showBoxPortSelector);
                          if (!showBoxPortSelector) fetchBoxPorts();
                        }}
                        className="btn btn-ghost btn-sm"
                        title="Show available ports"
                      >
                        <Terminal className="w-4 h-4" />
                      </button>
                    </div>

                    {showBoxPortSelector && (
                      <div className="bg-base-300 rounded-lg p-3 space-y-2 max-h-40 overflow-auto">
                        <p className="text-xs text-base-content/70 mb-2">
                          Available ports:
                        </p>
                        {boxPorts.length > 0 ? (
                          boxPorts.map((port) => (
                            <button
                              key={port.path}
                              onClick={() => {
                                setSelectedBoxPort(port.path);
                                setShowBoxPortSelector(false);
                              }}
                              className="btn btn-ghost btn-xs w-full justify-start font-mono text-xs"
                            >
                              {port.path}
                              {port.manufacturer && (
                                <span className="text-base-content/50 ml-2">
                                  ({port.manufacturer})
                                </span>
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-base-content/50">
                            No ports detected
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Connection Buttons */}
                <div className="flex gap-2">
                  {!boxStatus.connected ? (
                    <button
                      onClick={handleBoxConnect}
                      disabled={isConnectingBox || !selectedBoxPort}
                      className="btn btn-primary flex-1 gap-2"
                    >
                      {isConnectingBox ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wifi className="w-4 h-4" />
                          Connect Box
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleBoxDisconnect}
                      className="btn btn-error flex-1 gap-2"
                    >
                      <WifiOff className="w-4 h-4" />
                      Disconnect Box
                    </button>
                  )}

                  <button
                    onClick={fetchBoxStatus}
                    className="btn btn-ghost gap-2"
                    title="Refresh status"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Baud Rate Info */}
                <div className="text-xs text-base-content/50 flex items-center justify-between">
                  <span>Baud Rate: 9600</span>
                  {boxStatus.connected && (
                    <span className="text-success">
                      ● Persistent Connection
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Box Command Panel */}
            <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Box Commands
              </h3>

              {/* Mode Commands */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-base-content/60 mb-2 font-semibold">
                    Mode Activation
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSendBoxCommand("pen1")}
                      disabled={!boxStatus.connected}
                      className="btn btn-sm btn-outline btn-primary gap-1"
                    >
                      🎨 Pen1
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("pen2")}
                      disabled={!boxStatus.connected}
                      className="btn btn-sm btn-outline btn-primary gap-1"
                    >
                      🌀 Pen2
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("erasing_pen")}
                      disabled={!boxStatus.connected}
                      className="btn btn-sm btn-outline btn-warning gap-1"
                    >
                      🧽 Erase Pen
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("writing")}
                      disabled={!boxStatus.connected}
                      className="btn btn-sm btn-outline btn-info gap-1"
                    >
                      ✍️ Writing
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("erasing")}
                      disabled={!boxStatus.connected}
                      className="btn btn-sm btn-outline btn-error gap-1"
                    >
                      🧹 Erasing
                    </button>
                    <button
                      onClick={handleScreenshot}
                      disabled={!boxStatus.connected}
                      className="btn btn-sm btn-outline btn-accent gap-1"
                    >
                      📷 Screenshot
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-base-content/60 mb-2 font-semibold">
                    Mode Exit
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSendBoxCommand("exit_pen1")}
                      disabled={
                        !boxStatus.connected || boxStatus.currentMode !== "PEN1"
                      }
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      ↩️ Exit Pen1
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("exit_pen2")}
                      disabled={
                        !boxStatus.connected || boxStatus.currentMode !== "PEN2"
                      }
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      ↩️ Exit Pen2
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("exit_erasing_pen")}
                      disabled={
                        !boxStatus.connected ||
                        boxStatus.currentMode !== "ERASING_PEN"
                      }
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      ↩️ Exit Erase Pen
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("exit_writing")}
                      disabled={
                        !boxStatus.connected ||
                        boxStatus.currentMode !== "WRITING"
                      }
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      ↩️ Exit Writing
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("exit_erasing")}
                      disabled={
                        !boxStatus.connected ||
                        boxStatus.currentMode !== "ERASING"
                      }
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      ↩️ Exit Erasing
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("exit_screenshot")}
                      disabled={
                        !boxStatus.connected ||
                        boxStatus.currentMode !== "SCREENSHOT"
                      }
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      ↩️ Exit Screenshot
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-base-content/60 mb-2 font-semibold">
                    System Control
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSendBoxCommand("ready")}
                      disabled={!boxStatus.connected}
                      className="btn btn-sm btn-success gap-1"
                    >
                      ✅ Ready
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("exiting")}
                      disabled={!boxStatus.connected}
                      className="btn btn-sm btn-warning gap-1"
                    >
                      🚪 Logout
                    </button>
                    <button
                      onClick={() => handleSendBoxCommand("locked")}
                      disabled={!boxStatus.connected}
                      className="btn btn-sm btn-error gap-1 col-span-2"
                    >
                      🔒 Force Lock
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Command Input */}
              <form
                onSubmit={handleSendCustomBoxCommand}
                className="mt-4 space-y-2"
              >
                <p className="text-xs text-base-content/60 font-semibold">
                  Custom Command
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={boxCommand}
                    onChange={(e) => setBoxCommand(e.target.value)}
                    placeholder="e.g., pen1, writing, ready"
                    className="input input-bordered flex-1 font-mono text-sm"
                    disabled={!boxStatus.connected}
                  />
                  <button
                    type="submit"
                    disabled={!boxStatus.connected || !boxCommand.trim()}
                    className="btn btn-primary gap-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-base-content/50">
                  Commands are case-sensitive (use lowercase)
                </p>
              </form>

              {!boxStatus.connected && (
                <div className="alert alert-warning mt-4 py-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">
                    Connect to Box to send commands
                  </span>
                </div>
              )}
            </div>

            {/* Box Activity Log */}
            <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Box Activity Log
                </h3>
                <div className="flex gap-2 items-center">
                  <span className="badge badge-ghost text-xs">
                    {boxActivityLog.length} events
                  </span>
                  <button
                    onClick={() => setBoxActivityLog([])}
                    className="btn btn-ghost btn-xs"
                    title="Clear log"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div
                ref={boxLogRef}
                className="bg-base-300 rounded-lg p-4 max-h-96 overflow-auto font-mono text-xs space-y-1"
              >
                {boxActivityLog.length > 0 ? (
                  boxActivityLog.map((activity, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 ${
                        activity.type === "error"
                          ? "text-error"
                          : activity.type === "success"
                          ? "text-success"
                          : activity.type === "command"
                          ? "text-primary"
                          : "text-base-content"
                      }`}
                    >
                      <span className="text-base-content/50 shrink-0 text-[10px]">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                      <span>
                        {activity.type === "error"
                          ? "❌"
                          : activity.type === "success"
                          ? "✅"
                          : activity.type === "command"
                          ? "📤"
                          : "📥"}{" "}
                        {activity.message}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-base-content/50 py-8">
                    No activity yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;
