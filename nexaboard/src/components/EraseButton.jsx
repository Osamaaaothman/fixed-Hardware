import { Eraser } from "lucide-react";
import { useState } from "react";
import PropTypes from "prop-types";
import { executeErasing, sendEraseGcode } from "../api/erasingApi";

const EraseButton = ({ disabled = false }) => {
  const [isErasing, setIsErasing] = useState(false);
  const [progress, setProgress] = useState("");

  const handleErase = async () => {
    if (isErasing || disabled) return;

    setIsErasing(true);
    setProgress("Preparing...");

    try {
      // Execute erasing mode (switches Box to ERASING mode and gets G-code)
      const result = await executeErasing();

      if (!result.success) {
        throw new Error(result.error || "Failed to prepare erasing mode");
      }

      setProgress("Erasing board...");

      // Send G-code to CNC
      await sendEraseGcode(
        result.gcode,
        (eventType, data) => {
          // Progress updates
          if (eventType === "progress") {
            setProgress(`Erasing... ${data.percentage}%`);
          } else if (eventType === "log") {
            console.log("[ERASE]", data.message);
          }
        },
        (data) => {
          // Complete
          console.log("[ERASE] Complete:", data);
          setProgress("Complete!");
          setTimeout(() => {
            setProgress("");
            setIsErasing(false);
          }, 2000);
        },
        (error) => {
          // Error
          console.error("[ERASE] Error:", error);
          alert(`Erasing failed: ${error.message || "Unknown error"}`);
          setProgress("");
          setIsErasing(false);
        }
      );
    } catch (error) {
      console.error("[ERASE] Error:", error);
      alert(`Failed to start erasing: ${error.message || "Unknown error"}`);
      setProgress("");
      setIsErasing(false);
    }
  };

  return (
    <button
      onClick={handleErase}
      disabled={disabled || isErasing}
      className="btn btn-warning btn-lg gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
      title="Clear the entire whiteboard"
    >
      <Eraser size={20} />
      {isErasing ? progress || "Erasing..." : "Erase Board"}
    </button>
  );
};

EraseButton.propTypes = {
  disabled: PropTypes.bool,
};

export default EraseButton;
