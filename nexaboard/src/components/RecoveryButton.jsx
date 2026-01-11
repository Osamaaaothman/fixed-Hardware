import { useState } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { API_CONFIG } from "../config/api.config";

const RecoveryButton = () => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastPosition, setLastPosition] = useState(null);

  const checkLastPosition = async () => {
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.SERIAL}/last-position`);
      const data = await response.json();
      if (data.success) {
        setLastPosition(data);
      }
    } catch (error) {
      console.error("Error checking position:", error);
    }
  };

  const handleRecover = async () => {
    setIsRecovering(true);
    
    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.SERIAL}/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          port: "/dev/ttyUSB0",
          baudRate: 115200,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert("✅ Recovery complete!\nSystem reset to origin (0,0) with pen up.\nYou can now resume operations.");
        setLastPosition(null);
      } else {
        alert(`❌ Recovery failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error during recovery: ${error.message}`);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="bg-warning/10 border-2 border-warning rounded-lg p-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">Arduino Disconnected?</h4>
          <p className="text-xs text-base-content/70 mb-3">
            If Arduino disconnected during drawing, GRBL position was reset to (0,0,0).
            Click recover to safely return to origin.
          </p>
          <div className="flex gap-2">
            <button
              onClick={checkLastPosition}
              className="btn btn-xs btn-outline btn-warning"
            >
              Check Position
            </button>
            <button
              onClick={handleRecover}
              disabled={isRecovering}
              className="btn btn-xs btn-warning gap-1"
            >
              {isRecovering ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Recovering...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3 h-3" />
                  Recover to Origin
                </>
              )}
            </button>
          </div>
          
          {lastPosition && (
            <div className="mt-2 p-2 bg-base-200 rounded text-xs font-mono">
              <div>Last Position: X{lastPosition.position.x.toFixed(2)} Y{lastPosition.position.y.toFixed(2)} Z{lastPosition.position.z.toFixed(2)}</div>
              <div>Last Line: {lastPosition.lastSuccessfulLine}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecoveryButton;
