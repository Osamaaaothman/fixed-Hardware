import { useState, useEffect } from "react";
import {
  Activity,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Clock,
  AlertCircle,
  CheckCircle2,
  Power,
  Send,
  RefreshCw,
  Terminal,
  Monitor,
  Box as BoxIcon,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { SOCKET_CONFIG, API_CONFIG } from "../config/api.config.js";
import {
  connectBox,
  disconnectBox,
  getBoxStatus,
  sendBoxCommand,
  listBoxPorts,
} from "../api/boxApi";

const StatusPage = () => {
  // Box state
  const [boxStatus, setBoxStatus] = useState({
    connected: false,
    port: null,
    loggedIn: false,
    currentMode: "DISCONNECTED",
    lastMessage: null,
    lastActivity: null,
    reconnectAttempts: 0,
    error: null,
  });
  const [boxActivityLog, setBoxActivityLog] = useState([]);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState("/dev/ttyUSB1");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPortSelector, setShowPortSelector] = useState(false);

  // System state
  const [systemLocked, setSystemLocked] = useState(false);
  const [socket, setSocket] = useState(null);

  // CNC state (from serial controller)
  const [cncStatus, setCncStatus] = useState({
    connected: false,
    port: "/dev/ttyUSB0",
    isDrawing: false,
    position: { x: 0, y: 0, z: -2.3 },
  });

  // Fetch initial data
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

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.SYSTEM_STATUS);
      const data = await response.json();
      setSystemLocked(data.locked);
    } catch (error) {
      console.error("Error fetching system status:", error);
    }
  };

  const fetchAvailablePorts = async () => {
    try {
      const data = await listBoxPorts();
      if (data.success) {
        setAvailablePorts(data.ports);
      }
    } catch (error) {
      console.error("Error fetching ports:", error);
    }
  };

  // Initialize Socket.IO connection
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

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch initial data on mount
  useEffect(() => {
    fetchBoxStatus();
    fetchSystemStatus();
    fetchAvailablePorts();
  }, []);

  // Box connection handlers
  const handleBoxConnect = async () => {
    setIsConnecting(true);
    const toastId = toast.loading(`Connecting to Box on ${selectedPort}...`);

    try {
      await connectBox(selectedPort);
      toast.success("Connected to Box successfully", { id: toastId });
      setShowPortSelector(false);
    } catch (error) {
      toast.error(error.message || "Failed to connect to Box", { id: toastId });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBoxDisconnect = async () => {
    const toastId = toast.loading("Disconnecting from Box...");

    try {
      await disconnectBox();
      toast.success("Disconnected from Box successfully", { id: toastId });
    } catch (error) {
      toast.error(error.message || "Failed to disconnect from Box", {
        id: toastId,
      });
    }
  };

  // Send command to Box
  const handleSendCommand = async (command) => {
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

  // Lock/Unlock handlers
  const handleLockSystem = async () => {
    const toastId = toast.loading("Locking system...");

    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.SYSTEM_LOCK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        setSystemLocked(true);
        toast.success("System locked successfully", { id: toastId });

        // Send locked command to Box if connected
        if (boxStatus.connected) {
          await sendBoxCommand("locked");
        }
      } else {
        toast.error("Failed to lock system", { id: toastId });
      }
    } catch (error) {
      toast.error(error.message || "Failed to lock system", { id: toastId });
    }
  };

  // Get status badge color
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

  // Get mode icon
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
          <h2 className="text-3xl font-bold">System Status</h2>
          <Activity className="w-6 h-6 text-primary ml-auto animate-pulse" />
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

              {!systemLocked && (
                <button
                  onClick={handleLockSystem}
                  className="btn btn-error btn-sm w-full gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Lock System
                </button>
              )}
            </div>
          </div>

          {/* CNC Status Card */}
          <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                CNC Controller
              </h3>
              {cncStatus.connected ? (
                <Wifi className="w-5 h-5 text-success" />
              ) : (
                <WifiOff className="w-5 h-5 text-error" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Port</span>
                <span className="font-medium font-mono text-xs">
                  {cncStatus.port}
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
          <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300 md:col-span-2 lg:col-span-1">
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

              {boxStatus.lastMessage && (
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/70">Last Message</span>
                  <span className="font-mono text-xs">
                    {boxStatus.lastMessage}
                  </span>
                </div>
              )}

              {boxStatus.error && (
                <div className="alert alert-error py-2 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">{boxStatus.error}</span>
                </div>
              )}

              {boxStatus.reconnectAttempts > 0 && !boxStatus.connected && (
                <div className="text-xs text-warning flex items-center gap-1 mt-2">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Reconnect attempts: {boxStatus.reconnectAttempts}/10
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Box Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Connection Control */}
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
                      value={selectedPort}
                      onChange={(e) => setSelectedPort(e.target.value)}
                      className="input input-bordered flex-1 font-mono text-sm"
                      placeholder="/dev/ttyUSB1"
                    />
                    <button
                      onClick={() => setShowPortSelector(!showPortSelector)}
                      className="btn btn-ghost btn-sm"
                      title="Show available ports"
                    >
                      <Terminal className="w-4 h-4" />
                    </button>
                  </div>

                  {showPortSelector && (
                    <div className="bg-base-300 rounded-lg p-3 space-y-2 max-h-40 overflow-auto">
                      <p className="text-xs text-base-content/70 mb-2">
                        Available ports:
                      </p>
                      {availablePorts.length > 0 ? (
                        availablePorts.map((port) => (
                          <button
                            key={port.path}
                            onClick={() => {
                              setSelectedPort(port.path);
                              setShowPortSelector(false);
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
                    disabled={isConnecting || !selectedPort}
                    className="btn btn-primary flex-1 gap-2"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-4 h-4" />
                        Connect
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleBoxDisconnect}
                    className="btn btn-error flex-1 gap-2"
                  >
                    <WifiOff className="w-4 h-4" />
                    Disconnect
                  </button>
                )}

                <button
                  onClick={fetchBoxStatus}
                  className="btn btn-ghost gap-2"
                  title="Refresh status"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {boxStatus.error &&
                  boxStatus.reconnectAttempts >= 10 &&
                  !boxStatus.connected && (
                    <button
                      onClick={() => handleBoxConnect()}
                      className="btn btn-warning gap-2"
                      title="Retry connection"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry
                    </button>
                  )}
              </div>

              {/* Baud Rate Info */}
              <div className="text-xs text-base-content/50 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Baud Rate: 9600 (Box Controller)
              </div>
            </div>
          </div>

          {/* Command Panel */}
          <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5" />
              Box Commands
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSendCommand("writing")}
                disabled={!boxStatus.connected}
                className="btn btn-primary btn-sm gap-2"
              >
                ✍️ Writing Mode
              </button>

              <button
                onClick={() => handleSendCommand("erasing")}
                disabled={!boxStatus.connected}
                className="btn btn-warning btn-sm gap-2"
              >
                🧹 Erasing Mode
              </button>

              <button
                onClick={() => handleSendCommand("ready")}
                disabled={!boxStatus.connected}
                className="btn btn-info btn-sm gap-2"
              >
                ✅ Ready Check
              </button>

              <button
                onClick={() => handleSendCommand("exiting")}
                disabled={!boxStatus.connected}
                className="btn btn-ghost btn-sm gap-2"
              >
                🚪 Logout
              </button>

              <button
                onClick={() => handleSendCommand("locked")}
                disabled={!boxStatus.connected}
                className="btn btn-error btn-sm gap-2 col-span-2"
              >
                🔒 Force Lock
              </button>
            </div>

            {!boxStatus.connected && (
              <div className="alert alert-warning mt-4 py-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Connect to Box to send commands</span>
              </div>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Box Activity Log
            </h3>
            <span className="badge badge-ghost">
              {boxActivityLog.length} events
            </span>
          </div>

          <div className="bg-base-300 rounded-lg p-4 max-h-96 overflow-auto font-mono text-xs">
            {boxActivityLog.length > 0 ? (
              <div className="space-y-2">
                {boxActivityLog.map((activity, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-2 rounded ${
                      activity.type === "error"
                        ? "bg-error/10 text-error"
                        : activity.type === "success"
                        ? "bg-success/10 text-success"
                        : activity.type === "command"
                        ? "bg-primary/10 text-primary"
                        : "bg-base-100"
                    }`}
                  >
                    <span className="text-base-content/50 shrink-0">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="shrink-0">
                      {activity.type === "error"
                        ? "❌"
                        : activity.type === "success"
                        ? "✅"
                        : activity.type === "command"
                        ? "📤"
                        : "ℹ️"}
                    </span>
                    <span className="break-all">{activity.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-base-content/50 py-8">
                No activity yet. Connect to Box to see events.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;
