import {
  lockSystem,
  unlockSystem,
  getSystemStatus,
} from "../middleware/lockMiddleware.js";

export default function systemController(app) {
  // Lock the system
  app.post("/api/system/lock", (req, res) => {
    try {
      const result = lockSystem();
      console.log("System locked");
      res.json(result);
    } catch (error) {
      console.error("Error locking system:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Unlock the system with secret code
  app.post("/api/system/unlock", async (req, res) => {
    try {
      const { code } = req.body;
      const ip = req.ip || req.connection.remoteAddress || "unknown";
      const result = await unlockSystem(code, ip);

      if (result.success) {
        console.log(`System unlocked successfully by ${ip}`);
      } else {
        console.log(`Failed unlock attempt from ${ip}: ${result.error}`);
      }

      res.json(result);
    } catch (error) {
      console.error("Error unlocking system:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get system lock status
  app.get("/api/system/status", (req, res) => {
    try {
      const status = getSystemStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting system status:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
