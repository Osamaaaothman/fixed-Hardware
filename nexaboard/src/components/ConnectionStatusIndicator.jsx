import { useState, useEffect } from "react";
import { Wifi, WifiOff, Activity, AlertCircle } from "lucide-react";
import { API_CONFIG } from "../config/api.config.js";

/**
 * Connection Status Indicator Component
 * Shows real-time connection status for CNC and Box in the UI
 */
const ConnectionStatusIndicator = () => {
  const [cncConnected, setCncConnected] = useState(false);
  const [boxConnected, setBoxConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check connection status on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check CNC/Serial connection
        const serialResponse = await fetch(
          `${API_CONFIG.ENDPOINTS.SERIAL}/status`
        );
        const serialData = await serialResponse.json();
        setCncConnected(serialData.connected || false);

        // Check Box connection
        const boxResponse = await fetch(`${API_CONFIG.ENDPOINTS.BOX}/status`);
        const boxData = await boxResponse.json();
        setBoxConnected(boxData.connected || false);
      } catch (error) {
        console.error("[ConnectionStatus] Error checking status:", error);
        setCncConnected(false);
        setBoxConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();

    // Poll every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
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
        </div>

        {/* Tooltip on hover */}
        <div className="hidden group-hover:block absolute top-full right-0 mt-2 p-2 bg-base-300 text-base-content rounded shadow-lg text-xs whitespace-nowrap">
          {allConnected
            ? "All systems connected and ready"
            : someConnected
            ? "Partial connection - some features may not work"
            : "No connections - please connect CNC and Box"}
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatusIndicator;
