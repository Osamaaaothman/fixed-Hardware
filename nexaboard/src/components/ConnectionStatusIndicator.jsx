import { useState, useEffect } from "react";
import { Wifi, WifiOff, Activity, AlertCircle } from "lucide-react";
import { API_CONFIG } from "../config/api.config.js";
import { io } from "socket.io-client";
import { SOCKET_CONFIG } from "../config/api.config.js";

/**
 * Connection Status Indicator Component
 * Shows real-time connection status for CNC and Box in the UI
 */
const ConnectionStatusIndicator = () => {
  const [cncConnected, setCncConnected] = useState(false);
  const [boxConnected, setBoxConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cncPort, setCncPort] = useState(null);
  const [boxPort, setBoxPort] = useState(null);
  const [currentPen, setCurrentPen] = useState("none");

  // Check connection status on mount and periodically
  useEffect(() => {
    let socket = null;

    const checkStatus = async () => {
      try {
        // Check CNC/Serial connection with timeout
        const serialController = new AbortController();
        const serialTimeout = setTimeout(() => serialController.abort(), 3000);

        const serialResponse = await fetch(
          `${API_CONFIG.ENDPOINTS.SERIAL}/status`,
          { signal: serialController.signal }
        );
        clearTimeout(serialTimeout);

        if (serialResponse.ok) {
          const serialData = await serialResponse.json();
          const isConnected = serialData.connected === true && serialData.port;
          setCncConnected(isConnected);
          setCncPort(serialData.port);
        } else {
          setCncConnected(false);
          setCncPort(null);
        }

        // Check Box connection with timeout
        const boxController = new AbortController();
        const boxTimeout = setTimeout(() => boxController.abort(), 3000);

        const boxResponse = await fetch(`${API_CONFIG.ENDPOINTS.BOX}/status`, {
          signal: boxController.signal,
        });
        clearTimeout(boxTimeout);

        if (boxResponse.ok) {
          const boxData = await boxResponse.json();
          const isConnected =
            boxData.status?.connected === true && boxData.status?.port;
          setBoxConnected(isConnected);
          setBoxPort(boxData.status?.port);
          setCurrentPen(boxData.status?.currentPen || "none");
        } else {
          setBoxConnected(false);
          setBoxPort(null);
          setCurrentPen("none");
        }
      } catch (error) {
        // Timeout or network error
        if (error.name !== "AbortError") {
          console.error("[ConnectionStatus] Error checking status:", error);
        }
        setCncConnected(false);
        setBoxConnected(false);
        setCncPort(null);
        setBoxPort(null);
        setCurrentPen("none");
      } finally {
        setIsLoading(false);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 3 seconds
    const interval = setInterval(checkStatus, 3000);

    // Setup Socket.IO for real-time updates
    try {
      socket = io(SOCKET_CONFIG.SERVER_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
      });

      // Listen for CNC connection events
      socket.on("serial:connected", (data) => {
        setCncConnected(true);
        setCncPort(data.port);
      });

      socket.on("serial:disconnected", () => {
        setCncConnected(false);
        setCncPort(null);
      });

      // Listen for Box connection events
      socket.on("box:connected", (data) => {
        setBoxConnected(true);
        setBoxPort(data.port);
      });

      socket.on("box:disconnected", () => {
        setBoxConnected(false);
        setBoxPort(null);
      });

      socket.on("box:status", (status) => {
        setBoxConnected(status.connected === true && status.port);
        setBoxPort(status.port);
        setCurrentPen(status.currentPen || "none");
      });
    } catch (socketError) {
      console.error("[ConnectionStatus] Socket.IO error:", socketError);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  const allConnected = cncConnected && boxConnected;
  const someConnected = cncConnected || boxConnected;

  return (
    <div
      className={`fixed top-4 right-4 z-40 px-4 py-2 rounded-lg shadow-lg border transition-all duration-300 ${
        allConnected
          ? "bg-success/10 border-success text-success"
          : someConnected
          ? "bg-warning/10 border-warning text-warning"
          : "bg-error/10 border-error text-error"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Overall Status Icon */}
        {allConnected ? (
          <Activity className="w-5 h-5 animate-pulse" />
        ) : someConnected ? (
          <AlertCircle className="w-5 h-5" />
        ) : (
          <WifiOff className="w-5 h-5" />
        )}

        {/* Status Details */}
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-1.5">
            {cncConnected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4 opacity-50" />
            )}
            <span className={!cncConnected ? "opacity-50" : ""}>CNC</span>
          </div>

          <div className="w-px h-4 bg-current opacity-30"></div>

          <div className="flex items-center gap-1.5">
            {boxConnected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4 opacity-50" />
            )}
            <span className={!boxConnected ? "opacity-50" : ""}>Box</span>
          </div>

          {/* Current Pen Indicator */}
          {boxConnected && (
            <>
              <div className="w-px h-4 bg-current opacity-30"></div>
              <div className="flex items-center gap-1.5">
                <span className="capitalize">
                  {currentPen === "none"
                    ? "No Pen"
                    : currentPen.replace("_", " ")}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Tooltip on hover */}
        <div className="hidden group-hover:block absolute top-full right-0 mt-2 p-2 bg-base-300 text-base-content rounded shadow-lg text-xs whitespace-nowrap">
          {allConnected
            ? `All systems ready - CNC: ${cncPort}, Box: ${boxPort}, Pen: ${
                currentPen === "none" ? "None" : currentPen.replace("_", " ")
              }`
            : someConnected
            ? `Partial connection - CNC: ${
                cncConnected ? cncPort : "Not connected"
              }, Box: ${boxConnected ? boxPort : "Not connected"}, Pen: ${
                currentPen === "none" ? "None" : currentPen.replace("_", " ")
              }`
            : "No connections - please connect CNC and Box from Status page"}
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatusIndicator;
