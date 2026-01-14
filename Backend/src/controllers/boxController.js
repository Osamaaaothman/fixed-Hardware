import express from "express";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { exec } from "child_process";
import { promisify } from "util";

const router = express.Router();
const execAsync = promisify(exec);

// Box Serial Configuration
const BOX_CONFIG = {
  DEFAULT_PORT: "/dev/ttyACM0", // Linux port for Box (Arduino device)
  BAUD_RATE: 9600, // Box uses 9600 baud
  MAX_RECONNECT_ATTEMPTS: 10,
};

// Box State
let boxPort = null;
let boxParser = null;
let isBoxConnected = false;
let boxStatus = {
  connected: false,
  port: null,
  loggedIn: false,
  currentMode: "IDLE",
  lastMessage: null,
  lastActivity: null,
  reconnectAttempts: 0,
  error: null,
};

// Track last software command to differentiate hardware vs software triggers
let lastSoftwareCommand = null;
let lastSoftwareCommandTime = 0;
const COMMAND_TIMEOUT = 2000; // 2 seconds window

// Activity log (keep last 100 messages)
let activityLog = [];
const MAX_LOG_SIZE = 100;

/**
 * Disable HUPCL on serial port to prevent Arduino reset
 * This must be done BEFORE opening the port
 */
const disableHUPCL = async (portPath) => {
  try {
    await execAsync(`stty -F ${portPath} 9600 -hupcl`);
    console.log(`[BOX] HUPCL disabled on ${portPath}`);
    return true;
  } catch (error) {
    console.warn(`[BOX] Warning: Could not disable HUPCL: ${error.message}`);
    return false;
  }
};

/**
 * Add message to activity log
 */
const addToActivityLog = (message, type = "info") => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    type, // info, success, error, command
  };

  activityLog.unshift(logEntry);
  if (activityLog.length > MAX_LOG_SIZE) {
    activityLog = activityLog.slice(0, MAX_LOG_SIZE);
  }

  return logEntry;
};

/**
 * Update box status and emit Socket.IO event
 */
const updateBoxStatus = (updates, io) => {
  boxStatus = {
    ...boxStatus,
    ...updates,
    lastActivity: new Date().toISOString(),
  };

  if (io) {
    io.emit("box:status", boxStatus);
  }

  return boxStatus;
};

/**
 * Parse Box status messages and update state
 */
const parseBoxMessage = (message, io) => {
  const msg = message.trim();

  console.log(`[BOX] Received: ${msg}`);

  const logEntry = addToActivityLog(msg, "info");

  // Emit activity event
  if (io) {
    io.emit("box:activity", logEntry);
  }

  // Update box status based on message
  switch (msg) {
    case "LOGIN_OK":
      updateBoxStatus(
        {
          loggedIn: true,
          currentMode: "MENU",
          lastMessage: msg,
          error: null,
        },
        io
      );
      break;

    case "LOGIN_FAIL":
      updateBoxStatus(
        {
          loggedIn: false,
          currentMode: "LOGIN_FAILED",
          lastMessage: msg,
          error: "Login failed - incorrect password",
        },
        io
      );
      break;

    case "MODE_WRITING":
      const now = Date.now();
      const isHardwareTriggered =
        lastSoftwareCommand !== "writing" ||
        now - lastSoftwareCommandTime > COMMAND_TIMEOUT;

      // If hardware button pressed, check queue BEFORE entering writing mode
      if (isHardwareTriggered && io) {
        console.log("[BOX] Hardware draw button pressed - checking queue");

        // Emit event for frontend notification
        io.emit("box:hardware-draw-triggered", {
          timestamp: new Date().toISOString(),
          mode: "WRITING",
        });

        // Check queue IMMEDIATELY - don't enter writing mode if empty
        (async () => {
          try {
            // Import required modules
            const { nexaboard } = await import("../../Data.js");

            // Check if queue has pending items
            const items = nexaboard.queue.getAll();
            const hasPending = items.some((item) => item.status === "pending");

            if (!hasPending) {
              console.log(
                "[BOX] Queue is empty - showing queue_empty animation directly"
              );

              // Update status to QUEUE_EMPTY mode
              updateBoxStatus(
                {
                  currentMode: "QUEUE_EMPTY",
                  lastMessage: "queue_empty",
                },
                io
              );

              io.emit("box:hardware-draw-error", {
                error: "No pending items in queue",
                timestamp: new Date().toISOString(),
              });
              // Don't enter writing mode - show queue_empty directly
              if (boxPort && boxPort.isOpen) {
                boxPort.write("queue_empty\n");
              }
              return;
            }

            // Queue has items - NOW update to writing mode and proceed
            updateBoxStatus(
              {
                currentMode: "WRITING",
                lastMessage: msg,
              },
              io
            );

            console.log(
              "[BOX] Queue has pending items - starting queue processing"
            );

            const { startQueueProcessing } = await import(
              "../services/queueProcessor.js"
            );
            const { getPersistentPort, getPersistentParser } = await import(
              "./serialController.js"
            );

            // Get persistent connections
            const persistentPort = getPersistentPort();
            const persistentParser = getPersistentParser();

            // Check CNC connection
            if (!persistentPort || !persistentPort.isOpen) {
              console.log("[BOX] CNC not connected for hardware draw");
              io.emit("box:hardware-draw-error", {
                error: "CNC is not connected",
                timestamp: new Date().toISOString(),
              });
              // Return box to ready mode
              if (boxPort && boxPort.isOpen) {
                boxPort.write("exit_writing\n");
              }
              return;
            }

            console.log("[BOX] Starting queue processing via hardware button");

            // Start queue processing with connections (await to handle properly)
            await startQueueProcessing(
              io,
              persistentPort.path || "COM4",
              115200,
              persistentPort,
              persistentParser,
              boxPort
            );
          } catch (error) {
            console.error("[BOX] Error in hardware draw auto-start:", error);
            io.emit("box:hardware-draw-error", {
              error: error.message,
              timestamp: new Date().toISOString(),
            });
          }
        })();
      } else {
        // Software triggered - update mode normally
        updateBoxStatus(
          {
            currentMode: "WRITING",
            lastMessage: msg,
          },
          io
        );
      }
      break;

    case "MODE_ERASING":
      updateBoxStatus(
        {
          currentMode: "ERASING",
          lastMessage: msg,
        },
        io
      );
      // Auto-trigger erasing when hardware button is pressed
      {
        const erasingNow = Date.now();
        const erasingIsHardwareTriggered =
          lastSoftwareCommand !== "erasing" ||
          erasingNow - lastSoftwareCommandTime > COMMAND_TIMEOUT;

        if (erasingIsHardwareTriggered && io) {
          console.log(
            "[BOX] Hardware erasing button pressed - auto-executing erasing"
          );

          // Emit event for frontend notification
          io.emit("box:hardware-erase-triggered", {
            timestamp: new Date().toISOString(),
            mode: "ERASING",
          });

          // Auto-execute erasing
          setTimeout(async () => {
            try {
              // Import required modules
              const erasingModule = await import("./erasingController.js");
              const { getPersistentPort, getPersistentParser } = await import(
                "./serialController.js"
              );

              // Get serial port
              const serialPort = getPersistentPort();
              const serialParser = getPersistentParser();

              if (!serialPort || !serialPort.isOpen) {
                console.error("[BOX] Serial port not available for erasing");
                io.emit("box:hardware-erase-error", {
                  error: "CNC not connected",
                  timestamp: new Date().toISOString(),
                });
                // Return box to ready mode
                if (boxPort && boxPort.isOpen) {
                  boxPort.write("exit_erasing\n");
                }
                return;
              }

              // Generate erasing G-code by calling the internal function
              // We need to recreate the G-code generation logic here
              const CNC_WIDTH = 95;
              const CNC_HEIGHT = 130;
              const PEN_UP = -2.3;
              const PEN_DOWN = 0;
              const FEED_RATE = 8000;
              const X_POSITION = CNC_WIDTH - 4;
              const Y_START = 0;
              const Y_END = CNC_HEIGHT - 20;
              const Y_STEP = 5;

              const gcode = [];
              gcode.push("G21");
              gcode.push("G90");
              gcode.push(`F${FEED_RATE}`);
              gcode.push(`G1 Z${PEN_UP}`);
              gcode.push(`G0 X0 Y${Y_START}`);
              gcode.push(`G1 Z${PEN_DOWN}`);

              // Horizontal zigzag pattern
              let direction = 1;
              for (let y = Y_START; y <= Y_END; y += Y_STEP) {
                if (direction === 1) {
                  gcode.push(`G1 X${X_POSITION} Y${y.toFixed(2)}`);
                } else {
                  gcode.push(`G1 X0 Y${y.toFixed(2)}`);
                }
                direction *= -1;
              }

              gcode.push(`G1 Z${PEN_UP}`);
              gcode.push(`G0 X0 Y0`);
              gcode.push("M2");

              const gcodeText = gcode.join("\n");

              console.log(`[BOX] Generated erasing G-code, sending to CNC...`);

              // Send G-code via serial (simplified version without SSE)
              const lines = gcodeText
                .split("\n")
                .filter((line) => line.trim() && !line.startsWith(";"));

              let currentLine = 0;
              let waitingForResponse = false;

              const sendNextLine = () => {
                if (currentLine >= lines.length) {
                  console.log("[BOX] Erasing complete!");
                  io.emit("box:hardware-erase-complete", {
                    timestamp: new Date().toISOString(),
                  });
                  // Wait 1 second then exit erasing mode
                  setTimeout(() => {
                    if (boxPort && boxPort.isOpen) {
                      boxPort.write("exit_erasing\n");
                    }
                  }, 1000);
                  return;
                }

                if (!waitingForResponse) {
                  const line = lines[currentLine];
                  waitingForResponse = true;

                  serialPort.write(line + "\n", (err) => {
                    if (err) {
                      console.error("[BOX] Error writing to serial:", err);
                      io.emit("box:hardware-erase-error", {
                        error: err.message,
                        timestamp: new Date().toISOString(),
                      });
                      if (boxPort && boxPort.isOpen) {
                        boxPort.write("exit_erasing\n");
                      }
                    }
                  });

                  console.log(
                    `[BOX] Erasing: ${currentLine + 1}/${
                      lines.length
                    } - ${line}`
                  );
                  currentLine++;
                }
              };

              // Listen for responses
              const responseHandler = (data) => {
                const response = data.trim();
                if (response === "ok" || response.startsWith("ok")) {
                  waitingForResponse = false;
                  sendNextLine();
                } else if (response.startsWith("error")) {
                  console.error("[BOX] GRBL error:", response);
                  waitingForResponse = false;
                  sendNextLine(); // Continue despite error
                }
              };

              serialParser.on("data", responseHandler);

              // Start sending
              sendNextLine();

              // Cleanup listener after completion (timeout safety)
              setTimeout(() => {
                serialParser.removeListener("data", responseHandler);
              }, 120000); // 2 minutes max
            } catch (error) {
              console.error(
                "[BOX] Error handling hardware erasing trigger:",
                error
              );
              io.emit("box:hardware-erase-error", {
                error: error.message,
                timestamp: new Date().toISOString(),
              });
              // Return box to ready mode
              if (boxPort && boxPort.isOpen) {
                boxPort.write("exit_erasing\n");
              }
            }
          }, 500);
        }
      }
      break;

    case "MODE_READY":
      updateBoxStatus(
        {
          currentMode: "READY",
          lastMessage: msg,
        },
        io
      );
      break;

    case "LOGOUT":
      updateBoxStatus(
        {
          loggedIn: false,
          currentMode: "LOGGED_OUT",
          lastMessage: msg,
        },
        io
      );
      break;

    case "SLEEP":
      updateBoxStatus(
        {
          currentMode: "SLEEP",
          lastMessage: msg,
        },
        io
      );
      break;

    case "IDLE":
      updateBoxStatus(
        {
          currentMode: "IDLE",
          lastMessage: msg,
        },
        io
      );
      break;

    case "SCREENSHOT_REQUEST":
      updateBoxStatus(
        {
          currentMode: "SCREENSHOT",
          lastMessage: msg,
        },
        io
      );
      // Emit special event to trigger automatic camera capture
      if (io) {
        console.log("[BOX] Emitting box:screenshot-request event");
        io.emit("box:screenshot-request", {
          timestamp: new Date().toISOString(),
          source: "hardware_keypad",
        });
      }
      break;

    case "MODE_PEN1":
      updateBoxStatus(
        {
          currentMode: "PEN1",
          lastMessage: msg,
        },
        io
      );
      break;

    case "MODE_PEN2":
      updateBoxStatus(
        {
          currentMode: "PEN2",
          lastMessage: msg,
        },
        io
      );
      break;

    case "MODE_ERASING_PEN":
      updateBoxStatus(
        {
          currentMode: "ERASING_PEN",
          lastMessage: msg,
        },
        io
      );
      break;

    case "MaxAttemptAccessed":
      updateBoxStatus(
        {
          loggedIn: false,
          currentMode: "LOCKED",
          lastMessage: msg,
          error: "Max login attempts reached - system locked",
        },
        io
      );
      break;

    default:
      // Unknown message
      updateBoxStatus({ lastMessage: msg }, io);
  }
};

/**
 * Connect to Box serial port
 */
const connectToBox = async (portPath, io, attemptNumber = 1) => {
  return new Promise(async (resolve, reject) => {
    console.log(
      `[BOX] Connection attempt ${attemptNumber}/${BOX_CONFIG.MAX_RECONNECT_ATTEMPTS} to ${portPath}`
    );

    try {
      // Close existing connection if any
      if (boxPort && boxPort.isOpen) {
        boxPort.close();
      }

      // CRITICAL: Disable HUPCL BEFORE opening port
      await disableHUPCL(portPath);

      // Create new serial port connection
      // Disable DTR/RTS to prevent Arduino auto-reset
      boxPort = new SerialPort({
        path: portPath,
        baudRate: BOX_CONFIG.BAUD_RATE,
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

      boxParser = boxPort.pipe(new ReadlineParser({ delimiter: "\n" }));

      // Setup event listeners
      boxPort.on("open", () => {
        console.log(`[BOX] Serial port ${portPath} opened successfully`);
        isBoxConnected = true;

        // Ensure DTR/RTS remain low after opening
        boxPort.set({ dtr: false, rts: false }, (err) => {
          if (err) {
            console.log("[BOX] Note: Could not set DTR/RTS:", err.message);
          } else {
            console.log("[BOX] DTR/RTS disabled - Arduino will NOT reset");
          }
        });

        updateBoxStatus(
          {
            connected: true,
            port: portPath,
            reconnectAttempts: 0,
            error: null,
          },
          io
        );

        addToActivityLog(`Connected to Box on ${portPath}`, "success");

        if (io) {
          io.emit("box:connected", { port: portPath });
        }

        // Request current status from Box after connection
        setTimeout(() => {
          if (boxPort && boxPort.isOpen) {
            console.log("[BOX] Requesting current status from Box...");
            boxPort.write("sync\n");
          }
        }, 1500); // Wait 1.5s for Arduino to be ready

        resolve({ success: true, port: portPath });
      });

      boxPort.on("error", async (err) => {
        console.error(`[BOX] Serial port error:`, err.message);

        const errorMsg = `Connection error: ${err.message}`;
        addToActivityLog(errorMsg, "error");

        updateBoxStatus(
          {
            connected: false,
            error: errorMsg,
            reconnectAttempts: attemptNumber,
          },
          io
        );

        // Auto-reconnect if attempts remain
        if (attemptNumber < BOX_CONFIG.MAX_RECONNECT_ATTEMPTS) {
          console.log(`[BOX] Retrying in 2 seconds...`);
          setTimeout(async () => {
            try {
              await connectToBox(portPath, io, attemptNumber + 1);
            } catch (retryErr) {
              // Will be handled by final rejection
            }
          }, 2000);
        } else {
          const finalError = `Failed to connect after ${BOX_CONFIG.MAX_RECONNECT_ATTEMPTS} attempts. Error: ${err.message}`;
          updateBoxStatus(
            {
              connected: false,
              error: finalError,
              reconnectAttempts: attemptNumber,
            },
            io
          );

          if (io) {
            io.emit("box:error", { message: finalError, canRetry: true });
          }

          reject(new Error(finalError));
        }
      });

      boxPort.on("close", () => {
        console.log("[BOX] Serial port closed");
        isBoxConnected = false;

        updateBoxStatus(
          {
            connected: false,
            loggedIn: false,
            currentMode: "DISCONNECTED",
          },
          io
        );

        addToActivityLog("Box disconnected", "info");

        if (io) {
          io.emit("box:disconnected");
        }
      });

      // Setup parser to receive Box messages
      boxParser.on("data", (data) => {
        parseBoxMessage(data, io);
      });

      // Open the port
      boxPort.open((err) => {
        if (err) {
          console.error(`[BOX] Failed to open port:`, err.message);

          const errorMsg = `Failed to open port: ${err.message}`;
          updateBoxStatus(
            {
              connected: false,
              error: errorMsg,
              reconnectAttempts: attemptNumber,
            },
            io
          );

          // Auto-reconnect if attempts remain
          if (attemptNumber < BOX_CONFIG.MAX_RECONNECT_ATTEMPTS) {
            console.log(`[BOX] Retrying in 2 seconds...`);
            setTimeout(async () => {
              try {
                await connectToBox(portPath, io, attemptNumber + 1);
              } catch (retryErr) {
                // Will be handled by final rejection
              }
            }, 2000);
          } else {
            const finalError = `Failed to connect after ${BOX_CONFIG.MAX_RECONNECT_ATTEMPTS} attempts. Error: ${err.message}`;
            updateBoxStatus(
              {
                connected: false,
                error: finalError,
                reconnectAttempts: attemptNumber,
              },
              io
            );

            if (io) {
              io.emit("box:error", { message: finalError, canRetry: true });
            }

            reject(new Error(finalError));
          }
        }
      });
    } catch (err) {
      console.error(`[BOX] Exception during connection:`, err);

      const errorMsg = `Connection exception: ${err.message}`;
      updateBoxStatus(
        {
          connected: false,
          error: errorMsg,
          reconnectAttempts: attemptNumber,
        },
        io
      );

      reject(err);
    }
  });
};

/**
 * POST /api/box/connect
 * Connect to Box serial port
 */
router.post("/connect", async (req, res) => {
  const { port = BOX_CONFIG.DEFAULT_PORT } = req.body;
  const io = req.app.get("io");

  if (isBoxConnected) {
    return res.status(400).json({
      error: "Box is already connected",
      status: boxStatus,
    });
  }

  try {
    await connectToBox(port, io);
    res.json({
      success: true,
      message: "Connected to Box successfully",
      status: boxStatus,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      status: boxStatus,
      canRetry: true,
    });
  }
});

/**
 * POST /api/box/disconnect
 * Disconnect from Box serial port
 */
router.post("/disconnect", async (req, res) => {
  const io = req.app.get("io");

  if (!isBoxConnected) {
    return res.status(400).json({
      error: "Box is not connected",
      status: boxStatus,
    });
  }

  try {
    if (boxPort && boxPort.isOpen) {
      await new Promise((resolve, reject) => {
        boxPort.close((err) => {
          if (err) {
            console.error("[BOX] Error closing port:", err);
            reject(err);
          } else {
            console.log("[BOX] Port closed successfully");
            isBoxConnected = false;

            updateBoxStatus(
              {
                connected: false,
                loggedIn: false,
                currentMode: "DISCONNECTED",
                error: null,
              },
              io
            );

            addToActivityLog("Box disconnected manually", "info");

            if (io) {
              io.emit("box:disconnected");
            }

            resolve();
          }
        });
      });
    }

    res.json({
      success: true,
      message: "Disconnected from Box successfully",
      status: boxStatus,
    });
  } catch (err) {
    res.status(500).json({
      error: `Failed to disconnect: ${err.message}`,
      status: boxStatus,
    });
  }
});

/**
 * GET /api/box/status
 * Get current Box status
 */
router.get("/status", (req, res) => {
  res.json({
    success: true,
    status: boxStatus,
    activityLog: activityLog.slice(0, 20), // Return last 20 activities
  });
});

/**
 * POST /api/box/command
 * Send command to Box
 */
router.post("/command", (req, res) => {
  const { command } = req.body;
  const io = req.app.get("io");

  if (!command) {
    return res.status(400).json({ error: "No command provided" });
  }

  // Validate command - All valid Box commands from documentation
  const validCommands = [
    // Mode Activation
    "pen1",
    "pen2",
    "erasing_pen",
    "writing",
    "erasing",
    "screenshot",
    // Mode Exit
    "exit_pen1",
    "exit_pen2",
    "exit_erasing_pen",
    "exit_writing",
    "exit_erasing",
    "exit_screenshot",
    // System Control
    "ready",
    "exiting",
    "locked",
  ];

  if (!validCommands.includes(command)) {
    return res.status(400).json({
      error: `Invalid command. Valid commands: ${validCommands.join(", ")}`,
      validCommands,
    });
  }

  if (!isBoxConnected || !boxPort || !boxPort.isOpen) {
    return res.status(400).json({
      error: "Box is not connected",
      status: boxStatus,
    });
  }

  try {
    // Send command to Box
    boxPort.write(`${command}\n`, (err) => {
      if (err) {
        console.error(`[BOX] Error sending command "${command}":`, err);

        const errorMsg = `Failed to send command: ${err.message}`;
        addToActivityLog(errorMsg, "error");

        return res.status(500).json({
          error: errorMsg,
          status: boxStatus,
        });
      }

      console.log(`[BOX] Command sent: ${command}`);

      // Track software command to differentiate from hardware triggers
      lastSoftwareCommand = command;
      lastSoftwareCommandTime = Date.now();

      const logEntry = addToActivityLog(`Command sent: ${command}`, "command");

      if (io) {
        io.emit("box:activity", logEntry);
      }

      res.json({
        success: true,
        message: `Command "${command}" sent successfully`,
        status: boxStatus,
      });
    });
  } catch (err) {
    const errorMsg = `Exception sending command: ${err.message}`;
    addToActivityLog(errorMsg, "error");

    res.status(500).json({
      error: errorMsg,
      status: boxStatus,
    });
  }
});

/**
 * GET /api/box/stream
 * Server-Sent Events stream for Box status updates
 */
router.get("/stream", (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send current status immediately
  sendEvent("status", boxStatus);

  // Setup interval to send periodic updates
  const intervalId = setInterval(() => {
    sendEvent("status", boxStatus);
  }, 1000);

  // Cleanup on client disconnect
  req.on("close", () => {
    clearInterval(intervalId);
    console.log("[BOX] SSE client disconnected");
  });
});

/**
 * GET /api/box/activity
 * Get activity log
 */
router.get("/activity", (req, res) => {
  const { limit = 50 } = req.query;

  res.json({
    success: true,
    activities: activityLog.slice(0, parseInt(limit)),
    total: activityLog.length,
  });
});

/**
 * GET /api/box/ports
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
        locationId: port.locationId,
        productId: port.productId,
        vendorId: port.vendorId,
      })),
      defaultPort: BOX_CONFIG.DEFAULT_PORT,
    });
  } catch (err) {
    res.status(500).json({
      error: `Failed to list ports: ${err.message}`,
    });
  }
});

/**
 * Helper functions to expose Box connection state for queue processor
 */
export function getBoxConnectionStatus() {
  return {
    connected: isBoxConnected,
    port: boxPort ? boxPort.path : null,
    isOpen: boxPort ? boxPort.isOpen : false,
    currentMode: boxStatus.currentMode,
  };
}

export function getBoxPort() {
  return boxPort;
}

export default router;
