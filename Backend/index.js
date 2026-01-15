import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import initControllers from "./src/init/controllers.js";
import { loadQueue } from "./src/services/queuePersistence.js";
import { nexaboard } from "./Data.js";
import { lockMiddleware } from "./src/middleware/lockMiddleware.js";
import connectionManager from "./src/services/connectionManager.js";
import HardwareConfig from "./src/config/hardware.config.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  },
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lock middleware - must be after body parsers but before routes
app.use(lockMiddleware);

// Make io available to controllers
app.set("io", io);

// Initialize queue from persistent storage
async function initializeQueue() {
  try {
    const items = await loadQueue();
    nexaboard.queue.clear();
    items.forEach((item) => nexaboard.queue.enqueue(item));
    console.log(`✅ Queue initialized with ${items.length} items`);
  } catch (error) {
    console.error("❌ Failed to initialize queue:", error);
  }
}

// Initialize controllers
initControllers(app);

// Serve static files for uploads
app.use("/uploads", express.static("uploads"));

// Basic route
app.get("/", (req, res) => {
  res.send("Nexaboard Server is running!");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  const status = connectionManager.getAllStatus();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    connections: status,
    config: {
      autoConnect: HardwareConfig.SYSTEM.AUTO_CONNECT.ENABLED,
      platform: HardwareConfig.SYSTEM.PLATFORM.OS,
    },
  });
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Send current connection status
  socket.emit("connection:status", connectionManager.getAllStatus());

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Register connection manager event handlers to broadcast via Socket.IO
connectionManager.on("onConnect", "socket-broadcast", (deviceType, data) => {
  io.emit("connection:connected", { deviceType, ...data });
});

connectionManager.on("onDisconnect", "socket-broadcast", (deviceType, data) => {
  io.emit("connection:disconnected", { deviceType, ...data });
});

connectionManager.on("onError", "socket-broadcast", (deviceType, data) => {
  io.emit("connection:error", { deviceType, ...data });
});

// Start server
httpServer.listen(PORT, HOST, async () => {
  console.log("=".repeat(60));
  console.log("🚀 NEXABOARD SERVER STARTED");
  console.log("=".repeat(60));
  console.log(`📍 Local:  http://${HOST}:${PORT}`);
  console.log(`🌐 Network: http://<raspberry-pi-ip>:${PORT}`);
  console.log(`⚙️  Platform: ${HardwareConfig.SYSTEM.PLATFORM.OS}`);
  console.log(
    `🔌 Auto-connect: ${
      HardwareConfig.SYSTEM.AUTO_CONNECT.ENABLED ? "Enabled" : "Disabled"
    }`
  );
  console.log("=".repeat(60));

  // Initialize queue after server starts
  await initializeQueue();

  // Start auto-connect for hardware devices
  if (HardwareConfig.SYSTEM.AUTO_CONNECT.ENABLED) {
    console.log("🔄 Starting auto-connect for hardware devices...");
    connectionManager.startAutoConnect();
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⚠️  Shutting down gracefully...");

  // Stop connection manager
  connectionManager.stop();

  // Close HTTP server
  httpServer.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("❌ Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
});
