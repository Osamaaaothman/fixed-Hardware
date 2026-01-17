import { Router } from "express";
import { nexaboard } from "../../Data.js";
import servoController from "./servoController.js";

const router = Router();

// ⚠️ USER: Fill these arrays with your pen track G-code
const PEN_CONFIGS = {
  pen1: {
    name: "Pen 1",
    gcode: [
      // TODO: Add your Pen 1 track G-code here
      // Example: "G1 X10 Y10",
      "G1 X1 Y1",
      "M3 S0",
      "M3 S180"
    ],
  },
  pen2: {
    name: "Pen 2",
    gcode: [
      // TODO: Add your Pen 2 track G-code here
      "G1 X10",
      "M3 S0",
      "G1 X14",

      "M3 S180"
    ],
  },
  erasing_pen: {
    name: "Erasing Pen",
    gcode: [
      // TODO: Add your Erasing Pen track G-code here
      "G1 Y10",
      "M3 S0",
      "M3 S180"
    ],
  },
};

const CNC_CONFIG = {
  PEN_UP: -2.3,
  PEN_DOWN: 0,
  FEED_RATE: 8000,
};

function generatePenGcode(penType) {
  const config = PEN_CONFIGS[penType];
  if (!config) throw new Error(`Unknown pen type: ${penType}`);

  const gcode = [];
  gcode.push(
    "G21",
    "G90",
    `F${CNC_CONFIG.FEED_RATE}`,
    `G1 Z${CNC_CONFIG.PEN_UP}`,
    "G0 X0 Y0",
    `G1 Z${CNC_CONFIG.PEN_DOWN}`,
  );
  gcode.push(...config.gcode);
  gcode.push(`G1 Z${CNC_CONFIG.PEN_UP}`, "G0 X0 Y0", "M2");

  return gcode.join("\n");
}

router.post("/execute/:penType", async (req, res) => {
  const { penType } = req.params;
  const io = req.app.get("io");

  try {
    if (!PEN_CONFIGS[penType]) {
      return res
        .status(400)
        .json({ success: false, error: `Invalid pen type: ${penType}` });
    }

    if (PEN_CONFIGS[penType].gcode.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Pen ${penType} has no G-code configured`,
      });
    }

    const serialModule = await import("./serialController.js");
    const boxModule = await import("./boxController.js");
    const serialPort = serialModule.getPersistentPort();
    const serialParser = serialModule.getPersistentParser();
    const boxPort = boxModule.getBoxPort();

    if (!serialPort || !serialPort.isOpen) {
      return res
        .status(400)
        .json({ success: false, error: "CNC is not connected" });
    }

    // Send command to box to enter pen mode
    if (boxPort && boxPort.isOpen) {
      console.log(`[PEN] Sending ${penType} command to box`);
      boxPort.write(`${penType}\n`);
    }

    const gcode = generatePenGcode(penType);
    const lines = gcode.split("\n").filter((line) => line.trim());

    console.log(`[PEN] Executing ${penType} with ${lines.length} lines`);

    let currentLine = 0;
    let waitingForResponse = false;

    let isComplete = false;

    const sendNextLine = () => {
      if (isComplete) return; // Prevent multiple executions

      if (currentLine >= lines.length) {
        console.log(`[PEN] ${penType} execution complete`);
        isComplete = true;
        serialParser.removeListener("data", responseHandler);
        if (boxPort && boxPort.isOpen) boxPort.write(`exit_${penType}\n`);
        if (io)
          io.emit("pen:complete", {
            penType,
            timestamp: new Date().toISOString(),
          });
        return;
      }

      if (!waitingForResponse) {
        const line = lines[currentLine];

        // INTERCEPT M3 COMMANDS FOR SERVO CONTROL
        const m3Match = line
          .trim()
          .toUpperCase()
          .match(/^M3\s+S(\d+)/);
        if (m3Match) {
          const angle = parseInt(m3Match[1]);
          console.log(
            `[PEN] Intercepted M3 command for servo: ${line} -> ${angle}°`,
          );

          try {
            // Send to Raspberry Pi servo instead of CNC
            const servoResult = servoController.setAngle("pen_servo", angle);

            if (servoResult.success) {
              console.log(`[PEN] ✅ Servo set to ${angle}°`);
            } else {
              console.warn(
                `[PEN] ⚠️ Servo command failed: ${servoResult.message}`,
              );
            }
          } catch (error) {
            console.error(`[PEN] Error controlling servo:`, error);
          }

          // Move to next line after servo delay
          if (io) {
            io.emit("pen:progress", {
              penType,
              currentLine: currentLine + 1,
              totalLines: lines.length,
              progress: ((currentLine + 1) / lines.length) * 100,
            });
          }
          currentLine++;
          setTimeout(() => sendNextLine(), 100); // 100ms delay for servo movement
          return;
        }

        // Regular G-code - send to CNC
        waitingForResponse = true;
        serialPort.write(line + "\n", (err) => {
          if (err) console.error(`[PEN] Error writing to CNC:`, err);
        });
        console.log(`[PEN] ${currentLine + 1}/${lines.length} - ${line}`);
        if (io) {
          io.emit("pen:progress", {
            penType,
            currentLine: currentLine + 1,
            totalLines: lines.length,
            progress: ((currentLine + 1) / lines.length) * 100,
          });
        }
        currentLine++;
      }
    };

    const responseHandler = (data) => {
      if (isComplete) return; // Ignore responses after completion

      const response = data.trim();
      if (response === "ok" || response.startsWith("ok")) {
        waitingForResponse = false;
        sendNextLine();
      } else if (response.startsWith("error")) {
        console.error(`[PEN] GRBL error:`, response);
        waitingForResponse = false;
        sendNextLine();
      }
    };

    // Remove all previous listeners to prevent duplicate execution
    serialParser.removeAllListeners("data");
    serialParser.on("data", responseHandler);
    sendNextLine();

    // Cleanup after 2 minutes
    setTimeout(() => {
      if (!isComplete) {
        serialParser.removeListener("data", responseHandler);
        isComplete = true;
      }
    }, 120000);

    res.json({
      success: true,
      message: `${PEN_CONFIGS[penType].name} execution started`,
      lines: lines.length,
    });
  } catch (error) {
    console.error(`[PEN] Error executing ${penType}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/queue/:penType", async (req, res) => {
  const { penType } = req.params;
  const io = req.app.get("io");

  try {
    if (!PEN_CONFIGS[penType]) {
      return res
        .status(400)
        .json({ success: false, error: `Invalid pen type: ${penType}` });
    }

    if (PEN_CONFIGS[penType].gcode.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Pen ${penType} has no G-code configured`,
      });
    }

    const gcode = generatePenGcode(penType);
    const { v4: uuidv4 } = await import("uuid");
    const { saveQueue } = await import("../services/queuePersistence.js");

    const queueItem = {
      id: uuidv4(),
      type: "pen",
      penType: penType,
      name: PEN_CONFIGS[penType].name,
      status: "pending",
      gcode,
      stats: { lines: gcode.split("\n").filter((l) => l.trim()).length },
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    };

    nexaboard.queue.enqueue(queueItem);
    const allItems = nexaboard.queue.getAll();
    await saveQueue(allItems);

    if (io) {
      io.emit("queue:updated", {
        action: "add",
        item: queueItem,
        count: allItems.length,
      });
    }

    res.json({
      success: true,
      message: `${PEN_CONFIGS[penType].name} added to queue`,
      item: queueItem,
      queueLength: allItems.length,
    });
  } catch (error) {
    console.error(`[PEN] Error adding ${penType} to queue:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/configs", (req, res) => {
  const configs = Object.keys(PEN_CONFIGS).map((key) => ({
    type: key,
    name: PEN_CONFIGS[key].name,
    hasGcode: PEN_CONFIGS[key].gcode.length > 0,
    lines: PEN_CONFIGS[key].gcode.length,
  }));
  res.json({ success: true, pens: configs });
});

// Export PEN_CONFIGS for use in other controllers (like boxController)
export { PEN_CONFIGS, CNC_CONFIG, generatePenGcode };

export default router;
