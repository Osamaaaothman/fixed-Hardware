import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import initControllers from "./src/init/controllers.js";
import { loadQueue } from "./src/services/queuePersistence.js";
import { nexaboard } from "./Data.js";
import { lockMiddleware } from "./src/middleware/lockMiddleware.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  },
});

const PORT = 3000;

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
    console.log(`Queue initialized with ${items.length} items`);
  } catch (error) {
    console.error("Failed to initialize queue:", error);
  }
}

// Initialize controllers
initControllers(app);

// Basic route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
httpServer.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);

  // Initialize queue after server starts
  await initializeQueue();
});
