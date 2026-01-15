import express from "express";
import HardwareConfig from "../config/hardware.config.js";

const router = express.Router();

// Use centralized configuration
const {
  DIMENSIONS: { WIDTH: CNC_WIDTH, HEIGHT: CNC_HEIGHT },
  PEN: { UP: PEN_UP, DOWN: PEN_DOWN },
  ERASING: { Y_STEP, FEED_RATE },
} = HardwareConfig.CNC;

/**
 * Generate G-code for erasing the entire board
 * Sweeps vertically at X position to clear the board
 * Pattern: X=91mm (max-4), Y=0 to Y=110mm (max-20) in 5mm steps
 */
function generateEraseGcode() {
  const X_POSITION = CNC_WIDTH - 4; // 91mm
  const Y_START = 0;
  const Y_END = CNC_HEIGHT - 20; // 110mm
  const Y_STEP = 5; // Move 5mm each step

  const gcode = [];

  // Header
  gcode.push("; Erasing Mode G-code");
  gcode.push("; Generated: " + new Date().toISOString());
  gcode.push("; Pattern: Horizontal zigzag from X=0 to X=91, Y=0 to Y=110");
  gcode.push("G21 ; Set units to millimeters");
  gcode.push("G90 ; Use absolute positioning");
  gcode.push(`F${FEED_RATE} ; Set feed rate`);
  gcode.push(`G1 Z${PEN_UP} ; Pen up`);
  gcode.push("");

  // Move to starting position
  gcode.push("; Move to start position");
  gcode.push(`G0 X0 Y${Y_START} ; Move to origin`);
  gcode.push(`G1 Z${PEN_DOWN} ; Pen down (eraser touches board)`);
  gcode.push("");

  // Horizontal zigzag pattern - erase entire board
  gcode.push("; Erasing sweep - horizontal zigzag");
  let lineCount = 0;
  let direction = 1; // 1 = move right, -1 = move left

  for (let y = Y_START; y <= Y_END; y += Y_STEP) {
    if (direction === 1) {
      // Move right
      gcode.push(
        `G1 X${X_POSITION} Y${y.toFixed(2)} ; Erase right at Y=${y.toFixed(2)}`
      );
    } else {
      // Move left
      gcode.push(`G1 X0 Y${y.toFixed(2)} ; Erase left at Y=${y.toFixed(2)}`);
    }
    direction *= -1; // Alternate direction
    lineCount++;
  }

  gcode.push("");

  // Lift pen and return to origin
  gcode.push("; Return to origin");
  gcode.push(`G1 Z${PEN_UP} ; Pen up`);
  gcode.push(`G0 X0 Y0 ; Return to origin`);
  gcode.push("M2 ; End program");
  gcode.push("");

  // Footer stats
  gcode.push(`; Total erasing lines: ${lineCount}`);
  gcode.push(`; Y range: ${Y_START} to ${Y_END}mm`);
  gcode.push(`; Step size: ${Y_STEP}mm`);

  const gcodeText = gcode.join("\n");
  const distance = Y_END - Y_START;
  const estimatedSeconds = Math.ceil((distance / FEED_RATE) * 60 + 5);

  return {
    gcode: gcodeText,
    stats: {
      lineCount: gcode.filter((line) => line && !line.startsWith(";")).length,
      erasingLines: lineCount,
      distance: distance.toFixed(2) + "mm",
      estimatedTime: estimatedSeconds + "s",
      pattern: `Vertical sweep at X=${X_POSITION}mm`,
    },
  };
}

/**
 * Generate erasing G-code without executing
 * POST /api/erasing/generate
 */
router.post("/generate", async (req, res) => {
  try {
    console.log("[ERASING] Generating erasing G-code");
    const result = generateEraseGcode();

    console.log(
      `[ERASING] Generated ${result.stats.lineCount} G-code lines (${result.stats.erasingLines} erasing movements)`
    );

    res.json({
      success: true,
      gcode: result.gcode,
      stats: result.stats,
    });
  } catch (error) {
    console.error("[ERASING] Error generating erasing G-code:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * Execute erasing mode: switch Box to ERASING mode and return G-code
 * The frontend will then send the G-code via /api/serial/send
 * POST /api/erasing/execute
 */
router.post("/execute", async (req, res) => {
  try {
    console.log("[ERASING] Executing erasing mode");

    // Import box controller to access Box port
    let boxModule;
    try {
      boxModule = await import("./boxController.js");
    } catch (err) {
      console.error("[ERASING] Failed to import boxController:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to initialize Box controller",
      });
    }

    const boxPort = boxModule?.getBoxPort?.() || null;
    const boxConnected =
      boxModule?.getBoxConnectionStatus?.()?.connected || false;

    if (!boxConnected) {
      return res.status(400).json({
        success: false,
        error: "Box must be connected to execute erasing mode",
      });
    }

    // Switch Box to ERASING mode
    if (boxPort && boxPort.isOpen) {
      try {
        console.log("[ERASING] Switching Box to ERASING mode");
        boxPort.write("erasing\n");
        // Wait for Box to switch modes
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (boxError) {
        console.error("[ERASING] Failed to switch Box mode:", boxError);
        return res.status(500).json({
          success: false,
          error: "Failed to switch Box to ERASING mode",
        });
      }
    }

    // Generate erasing G-code
    const result = generateEraseGcode();

    console.log(
      `[ERASING] Box switched to ERASING mode, G-code generated (${result.stats.erasingLines} movements)`
    );

    res.json({
      success: true,
      message: "Erasing G-code generated and Box mode set to ERASING",
      gcode: result.gcode,
      stats: result.stats,
      autoSend: true, // Signal to frontend to auto-send to CNC
    });
  } catch (error) {
    console.error("[ERASING] Error executing erasing mode:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

export default router;
