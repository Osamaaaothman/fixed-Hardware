import express from "express";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

const router = express.Router();

// Store active serial connections
let activePort = null;
let parser = null;
let isConnected = false;

/**
 * POST /api/serial/send
 * Send G-code to Arduino via serial port with real-time updates via SSE
 */
router.post("/send", async (req, res) => {
  const { gcode, port = "COM4", baudRate = 115200 } = req.body;

  if (!gcode) {
    return res.status(400).json({ error: "No G-code provided" });
  }

  // Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Close existing connection if any
    if (activePort && activePort.isOpen) {
      activePort.close();
      activePort = null;
      parser = null;
      isConnected = false;
    }

    // Create new serial port connection
    activePort = new SerialPort({
      path: port,
      baudRate: baudRate,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      flowControl: false,
    });

    parser = activePort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

    const startTime = Date.now();

    // Setup event listeners
    activePort.on("open", () => {
      console.log(`Serial port ${port} opened successfully`);
      isConnected = true;
      sendEvent("status", {
        message: "Connected to Arduino",
        timestamp: Date.now() - startTime,
      });

      // Wait for Arduino to initialize
      setTimeout(() => {
        sendEvent("status", {
          message: "Starting to send G-code...",
          timestamp: Date.now() - startTime,
        });
        sendGcodeLinesSSE(gcode, activePort, parser, startTime, res, sendEvent);
      }, 2000);
    });

    activePort.on("error", (err) => {
      console.error("Serial port error:", err);
      isConnected = false;
      sendEvent("error", {
        message: err.message,
        timestamp: Date.now() - startTime,
      });
      res.end();
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
function sendGcodeLinesSSE(gcode, port, parser, startTime, res, sendEvent) {
  const lines = gcode
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(";"));

  let currentLine = 0;
  let waitingForResponse = false;

  parser.on("data", (data) => {
    const response = data.trim();
    console.log(`Arduino: ${response}`);

    // Send real-time log to frontend
    sendEvent("log", {
      timestamp: Date.now() - startTime,
      message: response,
      line: currentLine,
    });

    // Arduino is ready for next command
    if (
      response.toLowerCase().includes("ok") ||
      response.toLowerCase().includes("done")
    ) {
      waitingForResponse = false;
      sendNextLine();
    }
  });

  function sendNextLine() {
    if (currentLine >= lines.length) {
      // All lines sent
      const endTime = Date.now();
      const totalTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`G-code transmission complete in ${totalTime} seconds`);

      sendEvent("complete", {
        totalLines: lines.length,
        totalTime: totalTime + " seconds",
        timestamp: endTime - startTime,
      });

      // Close port after completion
      setTimeout(() => {
        if (port && port.isOpen) {
          port.close();
        }
        res.end();
      }, 1000);

      return;
    }

    if (!waitingForResponse) {
      const line = lines[currentLine];
      console.log(`Sending [${currentLine + 1}/${lines.length}]: ${line}`);

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
          sendEvent("error", {
            message: err.message,
            timestamp: Date.now() - startTime,
          });
          res.end();
        }
      });

      waitingForResponse = true;
      currentLine++;
    }
  }

  // Start sending
  sendNextLine();
}

/**
 * GET /api/serial/ports
 * List available serial ports
 */
router.get("/ports", async (req, res) => {
  try {
    const { SerialPort } = await import("serialport");
    const ports = await SerialPort.list();
    res.json({
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
    connected: isConnected,
    port: activePort ? activePort.path : null,
    isOpen: activePort ? activePort.isOpen : false,
  });
});

export default router;
