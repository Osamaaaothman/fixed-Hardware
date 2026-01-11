import express from "express";
import { fabricPathsToPoints } from "../utils/canvasToPoints.js";
import { pointsToGcode, optimizePathOrder } from "../utils/pointsToGcode.js";

const router = express.Router();

/**
 * Convert Fabric.js canvas data to G-code
 * POST /api/draw/convert
 * Body: { canvasData: { objects: [], width, height } }
 */
router.post("/convert", async (req, res) => {
  try {
    const { canvasData } = req.body;

    if (!canvasData || !canvasData.objects) {
      return res.status(400).json({
        success: false,
        error: "Invalid canvas data. Expected canvasData.objects array.",
      });
    }

    // Log all objects to debug
    console.log(
      `[DrawController] Received ${canvasData.objects.length} objects:`
    );
    canvasData.objects.forEach((obj, i) => {
      console.log(
        `  Object ${i}: type="${obj.type}", hasPath=${!!obj.path}, pathLength=${
          obj.path?.length || 0
        }`
      );
    });

    // Extract path objects from canvas
    const pathObjects = canvasData.objects.filter(
      (obj) =>
        obj.type?.toLowerCase() === "path" && obj.path && obj.path.length > 0
    );

    if (pathObjects.length === 0) {
      return res.status(400).json({
        success: false,
        error:
          "No drawable paths found in canvas. Please draw something first.",
      });
    }

    console.log(
      `[DrawController] Converting ${pathObjects.length} paths to G-code`
    );

    // Convert Fabric.js paths to coordinate arrays
    const canvasSize = {
      width: canvasData.width || 800,
      height: canvasData.height || 600,
    };

    const points = fabricPathsToPoints(pathObjects, canvasSize);

    if (points.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Failed to extract valid points from canvas paths.",
      });
    }

    console.log(
      `[DrawController] Extracted ${points.length} paths with points`
    );

    // Optimize path order to minimize pen travel
    const optimizedPoints = optimizePathOrder(points);
    console.log(`[DrawController] Optimized path order for minimal travel`);

    // Convert points to G-code
    const options = {
      feedRate: 1500,
      penUp: -2.3,
      penDown: 0,
    };

    const result = pointsToGcode(optimizedPoints, options);

    console.log(
      `[DrawController] Generated G-code: ${result.stats.lineCount} lines, ` +
        `${result.stats.pathCount} paths, ${result.stats.totalDistance}mm total distance`
    );

    res.json({
      success: true,
      gcode: result.gcode,
      stats: result.stats,
    });
  } catch (error) {
    console.error("[DrawController] Error converting canvas to G-code:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

export default router;
