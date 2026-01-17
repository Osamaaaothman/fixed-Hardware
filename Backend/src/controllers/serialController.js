import express from "express";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { exec } from "child_process";
import { promisify } from "util";
import { Mutex } from "async-mutex";
import HardwareConfig from "../config/hardware.config.js";
import listenerTracker from "../utils/listenerTracker.js";
import servoController from "./servoController.js";

const router = express.Router();
const execAsync = promisify(exec);

// Mutex to prevent concurrent G-code operations (CRITICAL: prevents race conditions)
const gcodeOperationMutex = new Mutex();
const connectionMutex = new Mutex();

let activePort = null;
let parser = null;
let isConnected = false;
let persistentPort = null; // For manual control persistent connection
let persistentParser = null;
let persistentConnected = false;
let lastCommand = null; // Track last command sent

// Track last successful position before disconnect
let lastKnownPosition = { x: 0, y: 0, z: -2.3 }; // Start at home with pen up
let isDrawing = false;
let lastSuccessfulLine = 0;

/**
 * Platform-aware serial port configuration
 * Removed stty command - not needed with proper SerialPort options
 */
const configureSerialPort = async (portPath, baudRate = 115200) => {
  try {
    // SerialPort options handle DTR/RTS without external commands
    console.log(
      `[SERIAL] Configuring port ${portPath} (platform: ${HardwareConfig.SYSTEM.PLATFORM.OS})`,
    );
    return true;
  } catch (error) {
    console.warn(
      `[SERIAL] Warning: Port configuration issue: ${error.message}`,
    );
    return false;
  }
};

// Helper function to emit Socket.IO events
let io = null;
const emitSerialEvent = (event, data) => {
  if (io) {
    io.emit(`serial:${event}`, data);
  }
};

// Middleware to capture io instance
router.use((req, res, next) => {
  if (!io && req.app.get("io")) {
    io = req.app.get("io");
    console.log("[SERIAL] Socket.IO instance captured");
  }
  next();
});

/**
 * POST /api/serial/send
 * Send G-code to Arduino via serial with real-time updates using SSE
 * Prefers persistent connection if available, falls back to temporary connection
 */
router.post("/send", async (req, res) => {
  const {
    gcode,
    port = HardwareConfig.CNC.SERIAL.DEFAULT_PORT,
    baudRate = HardwareConfig.CNC.SERIAL.BAUD_RATE,
    usePersistent = true,
    isErasingMode = false,
  } = req.body;

  if (!gcode) {
    console.log("[SERIAL/SEND] Error: No G-code provided");
    return res.status(400).json({ error: "No G-code provided" });
  }

  // CRITICAL FIX: Use mutex to prevent race conditions
  if (gcodeOperationMutex.isLocked()) {
    console.log(
      "[SERIAL/SEND] ⚠️ Rejecting request - G-code operation already in progress (mutex locked)",
    );
    return res.status(409).json({
      error:
        "A drawing operation is already in progress. Please wait for it to complete.",
      locked: true,
    });
  }

  console.log("[SERIAL/SEND] Received G-code transmission request");
  console.log("[SERIAL/SEND] Using persistent connection:", usePersistent);
  console.log("[SERIAL/SEND] Persistent port available:", !!persistentPort);
  console.log("[SERIAL/SEND] Persistent port open:", persistentPort?.isOpen);
  console.log("[SERIAL/SEND] Persistent connected:", persistentConnected);

  // Acquire mutex lock for entire operation
  const release = await gcodeOperationMutex.acquire();
  console.log("[SERIAL/SEND] 🔒 Mutex acquired - operation started");

  // Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Ensure mutex is released on cleanup
  const cleanup = () => {
    if (gcodeOperationMutex.isLocked()) {
      release();
      console.log("[SERIAL/SEND] 🔓 Mutex released");
    }
  };

  // Register cleanup on response close
  res.on("close", cleanup);
  res.on("error", cleanup);

  // Import box controller to handle Box mode
  let boxModule = null;
  let boxPort = null;
  let boxModeChanged = false;
  try {
    boxModule = await import("./boxController.js");
    boxPort = boxModule?.getBoxPort?.() || null;
  } catch (err) {
    console.warn("[SERIAL] Could not import box controller:", err.message);
  }

  try {
    // Switch Box to appropriate mode before starting
    if (boxPort && boxPort.isOpen) {
      try {
        const mode = isErasingMode ? "ERASING" : "WRITING";
        const command = isErasingMode ? "erasing" : "writing";
        console.log(`[SERIAL] Switching Box to ${mode} mode`);
        boxPort.write(`${command}\n`);
        boxModeChanged = true;

        const io = req.app.get("io");
        if (io) {
          io.emit("box:mode-changed", {
            mode: mode,
            reason: isErasingMode ? "erase-now" : "draw-now",
            timestamp: Date.now(),
          });
        }

        // Wait for Box to switch modes
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (boxError) {
        console.error(
          `[SERIAL] Warning: Failed to set Box to ${
            isErasingMode ? "erasing" : "writing"
          } mode:`,
          boxError,
        );
      }
    }

    // PREFER PERSISTENT CONNECTION IF AVAILABLE
    if (
      usePersistent &&
      persistentPort &&
      persistentPort.isOpen &&
      persistentConnected
    ) {
      console.log(
        "[SERIAL] Using persistent connection for G-code transmission",
      );
      const startTime = Date.now();

      sendEvent("status", {
        message: "Using persistent connection",
        timestamp: Date.now() - startTime,
      });

      isDrawing = true;

      // Emit Socket.IO event
      emitSerialEvent("status", {
        connected: true,
        port: persistentPort.path,
        isDrawing: true,
        position: lastKnownPosition,
        lastCommand: "Drawing...",
      });

      // Use persistent connection
      sendGcodeLinesSSE(
        gcode,
        persistentPort,
        persistentParser,
        startTime,
        res,
        sendEvent,
        boxPort,
        boxModeChanged,
        isErasingMode,
      );
      return; // Exit early
    }

    // FALLBACK TO TEMPORARY CONNECTION
    console.log(
      "[SERIAL] No persistent connection available, creating temporary connection",
    );

    // Close existing temporary connection if any
    if (activePort && activePort.isOpen) {
      console.log("Closing existing temporary port connection...");
      await new Promise((resolve) => {
        activePort.close((err) => {
          if (err) console.error("Error closing port:", err);
          resolve();
        });
      });
      activePort = null;
      parser = null;
      isConnected = false;

      // Wait a bit after closing before reopening
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Configure serial port (cross-platform)
    await configureSerialPort(port, baudRate);

    // Create new serial port connection
    // Disable DTR/RTS/HUPCL to prevent Arduino auto-reset
    activePort = new SerialPort({
      path: port,
      baudRate: baudRate,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      flowControl: false,
      autoOpen: false,
      // Prevent Arduino reset on serial open
      dtr: false,
      rts: false,
      hupcl: false,
    });

    parser = activePort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

    const startTime = Date.now();

    // Setup event listeners
    activePort.on("open", () => {
      console.log(`Serial port ${port} opened successfully`);
      isConnected = true;
      isDrawing = true;

      // Ensure DTR/RTS remain low after opening
      activePort.set({ dtr: false, rts: false }, (err) => {
        if (err) {
          console.log("Note: Could not set DTR/RTS:", err.message);
        } else {
          console.log("DTR/RTS disabled - Arduino will NOT reset");
        }
      });

      sendEvent("status", {
        message: "Connected to Arduino",
        timestamp: Date.now() - startTime,
      });

      // Wait for GRBL to initialize and settle
      // GRBL typically takes 1-2 seconds after power-on
      setTimeout(() => {
        sendEvent("status", {
          message: "GRBL ready, starting transmission...",
          timestamp: Date.now() - startTime,
        });
        sendGcodeLinesSSE(
          gcode,
          activePort,
          parser,
          startTime,
          res,
          sendEvent,
          boxPort,
          boxModeChanged,
          isErasingMode,
        );
      }, 3000); // Increased to 3 seconds for better stability
    });

    activePort.on("error", (err) => {
      console.error("Serial port error:", err);
      isDrawing = false;
      sendEvent("error", {
        message: err.message,
        timestamp: Date.now() - startTime,
      });
      res.end();
    });

    activePort.on("close", () => {
      console.log("Serial port closed");
      isConnected = false;
      isDrawing = false;

      // Log last known position for recovery
      console.log(
        `Last known position before disconnect: X${lastKnownPosition.x} Y${lastKnownPosition.y} Z${lastKnownPosition.z}`,
      );
      console.log(`Last successful line: ${lastSuccessfulLine}`);
    });

    // Open the port manually
    activePort.open((err) => {
      if (err) {
        console.error("Error opening port:", err);
        sendEvent("error", { message: err.message, timestamp: 0 });
        res.end();
      }
    });
  } catch (error) {
    console.error("Error opening serial port:", error);
    sendEvent("error", { message: error.message, timestamp: 0 });
    res.end();
  }
});

/**
 * Send G-code lines one by one with SSE updates
 */
function sendGcodeLinesSSE(
  gcode,
  port,
  parser,
  startTime,
  res,
  sendEvent,
  boxPort = null,
  boxModeChanged = false,
  isErasingMode = false,
) {
  const lines = gcode
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(";"));

  console.log(`[SERIAL] Starting to send ${lines.length} G-code lines`);

  let currentLine = 0;
  let waitingForResponse = false;
  let responseTimeout = null;
  const RESPONSE_TIMEOUT = 3000; // Reduced to 3 seconds (from 5) for faster recovery
  let grblInitialized = false; // Track if GRBL startup is complete
  let transmissionStarted = false; // Track if we've started sending G-code
  let consecutiveTimeouts = 0; // Track consecutive timeouts
  const MAX_CONSECUTIVE_TIMEOUTS = 5; // Stop after 5 consecutive timeouts
  let isCancelled = false; // Track if transmission was cancelled

  // Helper to return Box to ready mode
  const returnBoxToReady = async (isErasingMode = false) => {
    if (boxPort && boxPort.isOpen && boxModeChanged) {
      try {
        if (isErasingMode) {
          console.log(
            "[SERIAL] ⏳ Waiting 1 second before exiting ERASING mode...",
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log("[SERIAL] 📤 Sending exit_erasing command to Box");
          boxPort.write("exit_erasing\n");
          console.log("[SERIAL] ✅ exit_erasing command sent successfully");
        } else {
          console.log("[SERIAL] Exiting Box from WRITING mode to MENU");
          boxPort.write("exit_writing\n");
        }

        // Wait a moment for the command to be processed
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log("[SERIAL] Box should now be back in Menu mode");
      } catch (boxError) {
        console.error("[SERIAL] Warning: Failed to exit Box mode:", boxError);
      }
    }
  };

  // FIXED: Use listener tracker to prevent memory leaks
  const dataHandler = (data) => {
    if (isCancelled) return; // Ignore responses after cancellation

    const response = data.trim();

    // Detect corrupted data (contains non-printable characters or excessive special chars)
    const corruptionIndicators = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]|[\?]{3,}/;
    if (corruptionIndicators.test(response) && response.length > 20) {
      console.error(
        `⚠️ CORRUPTED DATA DETECTED: ${response.substring(0, 50)}...`,
      );
      sendEvent("log", {
        timestamp: Date.now() - startTime,
        message: "⚠️ WARNING: Data corruption detected - Check USB cable!",
        line: currentLine,
      });
      // Don't process this line, wait for next response
      return;
    }

    console.log(`Arduino: ${response}`);

    // Clear timeout since we got a response
    if (responseTimeout) {
      clearTimeout(responseTimeout);
      responseTimeout = null;
    }

    // Reset consecutive timeout counter on successful response
    consecutiveTimeouts = 0;

    // Send real-time log to frontend
    sendEvent("log", {
      timestamp: Date.now() - startTime,
      message: response,
      line: currentLine,
    });

    // Detect GRBL initialization (ignore first startup message)
    if (response.includes("Grbl") && response.includes("['$' for help]")) {
      if (!grblInitialized) {
        // This is the expected startup message
        console.log("GRBL initialized");
        grblInitialized = true;
        return; // Don't treat as error
      } else if (transmissionStarted) {
        // This is an unexpected reset during transmission
        console.error(
          "⚠️ GRBL RESET DETECTED - Continuing anyway (CHECK USB CABLE!)",
        );
        sendEvent("log", {
          message:
            "⚠️ WARNING: GRBL reset detected - Check USB cable! Attempting to continue...",
          timestamp: Date.now() - startTime,
        });
        // Reset state and try to continue
        grblInitialized = true;
        waitingForResponse = false;
        // Don't close port, try to recover
        return;
      }
    }

    // Check for GRBL errors
    if (response.toLowerCase().startsWith("error:")) {
      console.error(`GRBL Error: ${response}`);
      sendEvent("error", {
        message: `GRBL Error: ${response}`,
        timestamp: Date.now() - startTime,
      });
      // Continue anyway - some errors are non-fatal
    }

    // Arduino is ready for next command
    if (
      response.toLowerCase().includes("ok") ||
      response.toLowerCase().includes("done")
    ) {
      waitingForResponse = false;
      lastSuccessfulLine = currentLine; // Track last successful command
      sendNextLine();
    }
  };

  function sendNextLine() {
    if (isCancelled) {
      console.log(`[SERIAL] sendNextLine cancelled at line ${currentLine}`);
      return;
    }

    console.log(
      `[SERIAL] sendNextLine called - currentLine: ${currentLine}, total: ${lines.length}`,
    );

    if (currentLine >= lines.length) {
      // CRITICAL: Set cancelled flag IMMEDIATELY to prevent re-entry from parser
      isCancelled = true;
      console.log(`[SERIAL] ✓ All lines sent, completing...`);
      const endTime = Date.now();
      const totalTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log(
        `[SERIAL] G-code transmission complete in ${totalTime} seconds`,
      );

      isDrawing = false;

      sendEvent("complete", {
        totalLines: lines.length,
        totalTime: totalTime + " seconds",
        timestamp: endTime - startTime,
      });

      // Emit Socket.IO event
      emitSerialEvent("status", {
        connected: persistentPort ? persistentConnected : false,
        port: persistentPort ? persistentPort.path : null,
        isDrawing: false,
        position: lastKnownPosition,
        lastCommand: "Drawing complete",
      });

      // Clear any pending timeout
      if (responseTimeout) {
        clearTimeout(responseTimeout);
        responseTimeout = null;
      }

      // Return Box to ready mode
      returnBoxToReady(isErasingMode).then(() => {
        // Close port after completion ONLY if using temporary connection
        setTimeout(() => {
          if (port && port.isOpen && port !== persistentPort) {
            console.log("[SERIAL] Closing temporary connection after drawing");
            port.close();
          } else if (port === persistentPort) {
            console.log("[SERIAL] Keeping persistent connection open");
          }
          res.end();
        }, 1000);
      });

      return;
    }

    if (!waitingForResponse) {
      const line = lines[currentLine];
      console.log(`Sending [${currentLine + 1}/${lines.length}]: ${line}`);

      // Track position from G-code commands
      const xMatch = line.match(/X([-\d.]+)/);
      const yMatch = line.match(/Y([-\d.]+)/);
      const zMatch = line.match(/Z([-\d.]+)/);

      if (xMatch) lastKnownPosition.x = parseFloat(xMatch[1]);
      if (yMatch) lastKnownPosition.y = parseFloat(yMatch[1]);
      if (zMatch) lastKnownPosition.z = parseFloat(zMatch[1]);

      // INTERCEPT M3 COMMANDS FOR SERVO CONTROL
      // Check if command is M3 Sxxx (servo control)
      const m3Match = line
        .trim()
        .toUpperCase()
        .match(/^M3\s+S(\d+)/);
      if (m3Match) {
        const angle = parseInt(m3Match[1]);
        console.log(
          `[SERIAL] Intercepted M3 command for servo: ${line} -> ${angle}°`,
        );

        // Send to servo instead of CNC/Box
        const servoResult = servoController.setAngle("pen_servo", angle);

        // Send event to frontend
        sendEvent("log", {
          timestamp: Date.now() - startTime,
          message: `Servo: ${angle}°`,
          line: currentLine,
        });

        // Move to next line immediately (no need to wait for servo)
        currentLine++;
        setTimeout(() => sendNextLine(), 500); // 500ms delay for servo movement
        return;
      }

      // Mark that we've started transmission (for reset detection)
      if (!transmissionStarted) {
        transmissionStarted = true;
      }

      // Send progress update
      sendEvent("progress", {
        current: currentLine + 1,
        total: lines.length,
        line: line,
        timestamp: Date.now() - startTime,
      });

      port.write(line + "\n", (err) => {
        if (err) {
          console.error("Error writing to serial port:", err);
          isCancelled = true;
          isDrawing = false;
          sendEvent("error", {
            message: err.message,
            timestamp: Date.now() - startTime,
          });

          // Return Box to ready mode before ending
          returnBoxToReady(isErasingMode).then(() => {
            res.end();
          });
        } else {
          // Ensure data is actually transmitted before continuing
          port.drain((drainErr) => {
            if (drainErr) {
              console.error("Error draining port:", drainErr);
            }
          });
        }
      });

      waitingForResponse = true;
      currentLine++;

      // Set timeout for this command
      responseTimeout = setTimeout(() => {
        if (isCancelled) return; // Don't continue if cancelled

        consecutiveTimeouts++;
        console.error(
          `⚠️ Timeout ${consecutiveTimeouts}/${MAX_CONSECUTIVE_TIMEOUTS} waiting for response to line ${currentLine}`,
        );

        if (consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
          // Too many timeouts, likely Arduino is dead
          isCancelled = true;
          isDrawing = false;
          sendEvent("error", {
            message: `Critical: ${MAX_CONSECUTIVE_TIMEOUTS} consecutive timeouts - Arduino may be frozen. Check hardware!`,
            timestamp: Date.now() - startTime,
          });

          // Return Box to ready mode before closing
          returnBoxToReady(isErasingMode).then(() => {
            if (port && port.isOpen) {
              port.close();
            }
            res.end();
          });
          return;
        }

        sendEvent("log", {
          message: `⚠️ Timeout on line ${currentLine} - Continuing... (Check USB cable!)`,
          timestamp: Date.now() - startTime,
        });

        // Try to continue anyway
        waitingForResponse = false;
        sendNextLine();
      }, HardwareConfig.CNC.RESPONSE.TIMEOUT);
    }
  } // End of dataHandler

  // Register listener with tracker for automatic cleanup
  const listenerId = listenerTracker.register(parser, "data", dataHandler, {
    id: `gcode-send-${Date.now()}`,
    timeout: HardwareConfig.SYSTEM.LISTENERS.CLEANUP_TIMEOUT,
    once: false,
    emitterId: port === persistentPort ? "persistent-cnc" : "temp-cnc",
  });

  // Enhanced cleanup function to remove listener properly
  const enhancedCleanup = () => {
    // Remove tracked listener
    listenerTracker.remove(
      parser,
      "data",
      listenerId,
      port === persistentPort ? "persistent-cnc" : "temp-cnc",
    );

    // Clear any pending timeout
    if (responseTimeout) {
      clearTimeout(responseTimeout);
      responseTimeout = null;
    }

    // Release mutex if still locked
    cleanup();
  };

  // Update cleanup registration
  res.off("close", cleanup);
  res.off("error", cleanup);
  res.on("close", enhancedCleanup);
  res.on("error", enhancedCleanup);

  // Start sending
  sendNextLine();
}

/**
 * GET /api/serial/ports
 * List available serial ports
 */
router.get("/ports", async (req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json({
      success: true,
      ports: ports.map((port) => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        pnpId: port.pnpId,
        vendorId: port.vendorId,
        productId: port.productId,
      })),
    });
  } catch (error) {
    console.error("Error listing serial ports:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list serial ports",
      message: error.message,
    });
  }
});

/**
 * GET /api/serial/status
 * Get current serial connection status
 */
router.get("/status", (req, res) => {
  res.json({
    success: true,
    connected: persistentConnected || isConnected,
    port: persistentPort
      ? persistentPort.path
      : activePort
        ? activePort.path
        : null,
    isOpen: persistentPort
      ? persistentPort.isOpen
      : activePort
        ? activePort.isOpen
        : false,
    isDrawing: isDrawing,
    position: lastKnownPosition,
    lastCommand: lastCommand,
  });
});

/**
 * POST /api/serial/connect
 * Open a persistent serial connection for manual control
 */
router.post("/connect", async (req, res) => {
  try {
    const { port = "/dev/ttyUSB0", baudRate = 115200 } = req.body;

    // Close existing persistent connection if any
    if (persistentPort && persistentPort.isOpen) {
      console.log("Closing existing persistent connection...");
      await new Promise((resolve) => {
        persistentPort.close((err) => {
          if (err) console.error("Error closing port:", err);
          resolve();
        });
      });
      persistentPort = null;
      persistentParser = null;
      persistentConnected = false;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`Opening persistent connection to ${port}`);

    // Configure serial port (cross-platform)
    await configureSerialPort(port, baudRate);

    // Create persistent serial port
    // Disable DTR/RTS/HUPCL to prevent Arduino auto-reset
    persistentPort = new SerialPort({
      path: port,
      baudRate: baudRate,
      autoOpen: false,
      // Prevent Arduino reset on serial open
      dtr: false,
      rts: false,
      hupcl: false,
    });

    persistentParser = persistentPort.pipe(
      new ReadlineParser({ delimiter: "\r\n" }),
    );

    // Setup event listeners
    persistentPort.on("error", (err) => {
      console.error("Persistent port error:", err);
      persistentConnected = false;
    });

    // Open port
    await new Promise((resolve, reject) => {
      persistentPort.open((err) => {
        if (err) {
          reject(err);
        } else {
          // Ensure DTR/RTS remain low after opening
          persistentPort.set({ dtr: false, rts: false }, (setErr) => {
            if (setErr) {
              console.log("Note: Could not set DTR/RTS:", setErr.message);
            } else {
              console.log(
                "Persistent connection: DTR/RTS disabled - Arduino will NOT reset",
              );
            }
          });
          resolve();
        }
      });
    });

    console.log(`Persistent port ${port} opened successfully`);
    persistentConnected = true;

    // Wait for GRBL to initialize
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Emit Socket.IO event
    emitSerialEvent("connected", { port, connected: true });
    emitSerialEvent("status", {
      connected: true,
      port: port,
      isDrawing: false,
      position: lastKnownPosition,
      lastCommand: null,
    });

    res.json({
      success: true,
      message: "Persistent connection established",
      port: port,
    });
  } catch (error) {
    console.error("Error opening persistent connection:", error);
    persistentConnected = false;

    // Emit Socket.IO error event
    emitSerialEvent("error", { message: error.message });

    res.status(500).json({
      success: false,
      error: error.message || "Failed to open persistent connection",
    });
  }
});

/**
 * POST /api/serial/disconnect
 * Close the persistent serial connection
 */
router.post("/disconnect", async (req, res) => {
  try {
    if (persistentPort && persistentPort.isOpen) {
      await new Promise((resolve) => {
        persistentPort.close((err) => {
          if (err) console.error("Error closing port:", err);
          resolve();
        });
      });
      persistentPort = null;
      persistentParser = null;
      persistentConnected = false;

      // Emit Socket.IO event
      emitSerialEvent("disconnected", {});
      emitSerialEvent("status", {
        connected: false,
        port: null,
        isDrawing: false,
        position: lastKnownPosition,
        lastCommand: null,
      });

      res.json({
        success: true,
        message: "Persistent connection closed",
      });
    } else {
      res.json({
        success: true,
        message: "No active persistent connection",
      });
    }
  } catch (error) {
    console.error("Error closing persistent connection:", error);

    // Emit Socket.IO error event
    emitSerialEvent("error", { message: error.message });

    res.status(500).json({
      success: false,
      error: error.message || "Failed to close connection",
    });
  }
});

/**
 * POST /api/serial/command
 * Send a single command to Arduino (uses persistent connection if available)
 */
router.post("/command", async (req, res) => {
  try {
    const {
      command,
      port = "/dev/ttyUSB0",
      baudRate = 115200,
      usePersistent = true,
    } = req.body;

    if (!command) {
      return res.status(400).json({
        success: false,
        error: "Command is required",
      });
    }

    // ⚠️ CRITICAL: M3 commands control Raspberry Pi servo, NEVER go to CNC/BOX
    const m3Match = command
      .trim()
      .toUpperCase()
      .match(/^M3\s+S(\d+)/);

    if (m3Match) {
      const angle = parseInt(m3Match[1]);
      console.log(
        `[SERIAL/COMMAND] ⚠️ INTERCEPTING M3 command for Raspberry Pi servo: ${command}`,
      );
      console.log(`[SERIAL/COMMAND] 🎯 Setting servo to ${angle}°`);

      try {
        // Send to Raspberry Pi servo
        const servoResult = servoController.setAngle("pen_servo", angle);

        if (servoResult.success) {
          console.log(`[SERIAL/COMMAND] ✅ Servo set to ${angle}°`);

          emitSerialEvent("response", {
            command: command,
            response: `Servo set to ${angle}°`,
            servoControl: true,
          });

          return res.json({
            success: true,
            message: `Servo set to ${angle}°`,
            command: command,
            angle: angle,
            servoControl: true,
            info: "M3 commands control Raspberry Pi GPIO servo (never sent to CNC/BOX)",
          });
        } else {
          throw new Error(servoResult.message || "Servo control failed");
        }
      } catch (error) {
        console.error(`[SERIAL/COMMAND] ❌ Error controlling servo:`, error);
        return res.status(500).json({
          success: false,
          error: `Failed to control servo: ${error.message}`,
          servoControl: true,
        });
      }
    }

    // Try to use persistent connection first
    if (
      usePersistent &&
      persistentPort &&
      persistentPort.isOpen &&
      persistentConnected
    ) {
      console.log(`Sending command via persistent connection: ${command}`);

      const responses = [];
      let responseReceived = false;

      // Set up temporary listener for this command
      const dataHandler = (data) => {
        const trimmedData = data.trim();
        console.log(`Arduino response: ${trimmedData}`);
        responses.push(trimmedData);
        responseReceived = true;
      };

      persistentParser.on("data", dataHandler);

      // Send command
      await new Promise((resolve, reject) => {
        persistentPort.write(command + "\n", (err) => {
          if (err) {
            console.error("Write error:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Ensure data is transmitted
      await new Promise((resolve) => {
        persistentPort.drain((err) => {
          if (err) console.error("Drain error:", err);
          resolve();
        });
      });

      // Wait for response
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Remove listener
      persistentParser.off("data", dataHandler);

      const arduinoResponse = responses.join(" ");

      // Store last command
      lastCommand = command;

      // Emit Socket.IO event
      emitSerialEvent("response", {
        command,
        response: arduinoResponse || "ok",
      });

      return res.json({
        success: true,
        message: `Command sent: ${command}`,
        response: arduinoResponse || "ok",
        responses: responses.length > 0 ? responses : ["ok"],
        persistent: true,
      });
    }

    // Fall back to temporary connection if no persistent connection
    console.log(`Attempting to send command to ${port}: ${command}`);

    // Configure serial port (cross-platform)
    await configureSerialPort(port, baudRate);

    // Create temporary serial connection
    // Disable DTR/RTS/HUPCL to prevent Arduino auto-reset
    const serialPort = new SerialPort({
      path: port,
      baudRate: baudRate,
      autoOpen: false,
      // Prevent Arduino reset on serial open
      dtr: false,
      rts: false,
      hupcl: false,
      lock: false,
    });

    const parser = serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));

    let arduinoResponse = "";
    const responses = [];

    // Listen for Arduino response
    parser.on("data", (data) => {
      const trimmedData = data.trim();
      console.log(`Arduino response: ${trimmedData}`);
      responses.push(trimmedData);
      arduinoResponse += trimmedData + " ";
    });

    // Open port
    await new Promise((resolve, reject) => {
      serialPort.open((err) => {
        if (err) reject(err);
        else {
          // Ensure DTR/RTS remain low after opening
          serialPort.set({ dtr: false, rts: false }, (setErr) => {
            if (setErr) {
              console.error("Error setting DTR/RTS:", setErr);
            } else {
              console.log("DTR/RTS disabled - Arduino will NOT reset");
            }
          });
          resolve();
        }
      });
    });

    console.log(`Port ${port} opened successfully`);

    // Wait for Arduino to initialize (GRBL needs time after reset)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Send command
    console.log(`Writing command: ${command}`);
    await new Promise((resolve, reject) => {
      serialPort.write(command + "\n", (err) => {
        if (err) {
          console.error("Write error:", err);
          reject(err);
        } else {
          console.log("Command written successfully");
          resolve();
        }
      });
    });

    // Wait for response
    console.log("Waiting for response...");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Close port
    await new Promise((resolve) => {
      serialPort.close((err) => {
        if (err) console.error("Error closing port:", err);
        resolve();
      });
    });

    console.log(`Total responses received: ${responses.length}`);
    console.log(`Combined response: ${arduinoResponse}`);

    res.json({
      success: true,
      message: `Command sent: ${command}`,
      response: arduinoResponse.trim() || "No response received",
      responses: responses,
    });
  } catch (error) {
    console.error("Error sending command:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to send command",
    });
  }
});

/**
 * GET /api/serial/last-position
 * Get the last known position before disconnect
 */
router.get("/last-position", (req, res) => {
  res.json({
    success: true,
    position: lastKnownPosition,
    lastSuccessfulLine: lastSuccessfulLine,
    isDrawing: isDrawing,
  });
});

/**
 * POST /api/serial/recover
 * Recover from unexpected disconnect by moving to origin
 * Since GRBL resets position to (0,0,0) on restart, we need to physically move back to actual (0,0,0)
 */
router.post("/recover", async (req, res) => {
  const { port = "/dev/ttyUSB0", baudRate = 115200 } = req.body;

  try {
    console.log("=== Starting Recovery Process ===");
    console.log(
      `Last known position was: X${lastKnownPosition.x} Y${lastKnownPosition.y} Z${lastKnownPosition.z}`,
    );
    console.log(`GRBL has reset, so current position in GRBL is (0,0,0)`);
    console.log(`We need to move back to actual origin (0,0,0)`);

    // Open a temporary connection
    const serialPort = new SerialPort({
      path: port,
      baudRate: baudRate,
      autoOpen: false,
    });

    const recoveryParser = serialPort.pipe(
      new ReadlineParser({ delimiter: "\r\n" }),
    );
    const responses = [];

    recoveryParser.on("data", (data) => {
      const response = data.trim();
      console.log(`Recovery Response: ${response}`);
      responses.push(response);
    });

    // Open port
    await new Promise((resolve, reject) => {
      serialPort.open((err) => {
        if (err) reject(err);
        else {
          // Disable DTR to prevent reset
          serialPort.set({ dtr: false, rts: false }, (setErr) => {
            if (setErr) console.error("Error setting DTR/RTS:", setErr);
          });
          resolve();
        }
      });
    });

    console.log("Port opened, waiting for GRBL initialization...");
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Unlock GRBL in case it's in alarm state
    console.log("Sending $X to unlock GRBL...");
    serialPort.write("$X\n");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Move pen up first to avoid dragging
    console.log("Moving pen up (Z-2.3)...");
    serialPort.write("G1 Z-2.3 F1500\n");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Move to origin (0,0) - this is where GRBL thinks it already is, so no movement will occur
    // But we send it anyway for consistency
    console.log("Commanding move to origin G0 X0 Y0...");
    serialPort.write("G0 X0 Y0 F1500\n");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Close port
    await new Promise((resolve) => {
      serialPort.close((err) => {
        if (err) console.error("Error closing port:", err);
        resolve();
      });
    });

    // Reset tracking variables
    lastKnownPosition = { x: 0, y: 0, z: -2.3 };
    lastSuccessfulLine = 0;
    isDrawing = false;

    console.log("=== Recovery Complete ===");
    console.log("System is now at origin (0,0) with pen up (-2.3)");

    res.json({
      success: true,
      message: "Recovery complete - system reset to origin",
      position: lastKnownPosition,
      responses: responses,
    });
  } catch (error) {
    console.error("Error during recovery:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Recovery failed",
    });
  }
});

/**
 * Helper functions to expose connection state for queue processor
 */
export function getPersistentConnectionStatus() {
  return {
    connected: persistentConnected,
    port: persistentPort ? persistentPort.path : null,
    isOpen: persistentPort ? persistentPort.isOpen : false,
  };
}

export function getPersistentPort() {
  return persistentPort;
}

export function getPersistentParser() {
  return persistentParser;
}

export default router;
