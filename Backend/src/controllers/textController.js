import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { textToGcode, calculateTextBounds } from "../services/textConverter.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to fonts directory
const FONTS_DIR = path.join(__dirname, "../../fonts/hershey");

/**
 * POST /api/text/convert
 * Convert text to G-code
 * Body: { text, font, size, spacing, lineSpacing, feedRate, penUp, penDown, alignment }
 */
router.post("/convert", async (req, res) => {
  try {
    const {
      text,
      font = "simplex",
      size = 10,
      spacing = 2,
      lineSpacing = 1.5,
      feedRate = 1500,
      penUp = -2.3,
      penDown = 0,
      alignment = "left",
    } = req.body;

    // Validation
    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Text is required" });
    }

    // Load font
    const fontPath = path.join(FONTS_DIR, `${font}.json`);

    try {
      await fs.access(fontPath);
    } catch {
      return res
        .status(404)
        .json({ success: false, error: `Font '${font}' not found` });
    }

    const fontContent = await fs.readFile(fontPath, "utf-8");
    const fontData = JSON.parse(fontContent);

    // Convert text to G-code
    const settings = {
      size: parseFloat(size),
      spacing: parseFloat(spacing),
      lineSpacing: parseFloat(lineSpacing),
      feedRate: parseInt(feedRate),
      penUp: parseFloat(penUp),
      penDown: parseFloat(penDown),
      alignment,
    };

    const result = textToGcode(text, fontData, settings);

    // Calculate bounds
    const bounds = calculateTextBounds(
      text,
      fontData,
      settings.size,
      settings.spacing
    );

    res.json({
      success: true,
      gcode: result.gcode,
      stats: {
        ...result.stats,
        textLength: text.length,
        lineCount: text.split("\n").length,
        width: bounds.width.toFixed(2),
        height: bounds.height.toFixed(2),
      },
      settings,
      font: {
        name: fontData.name,
        id: font,
      },
    });
  } catch (error) {
    console.error("Error converting text:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/text/preview
 * Get text bounds without generating G-code
 * Body: { text, font, size, spacing }
 */
router.post("/preview", async (req, res) => {
  try {
    const { text, font = "simplex", size = 10, spacing = 2 } = req.body;

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Text is required" });
    }

    // Load font
    const fontPath = path.join(FONTS_DIR, `${font}.json`);

    try {
      await fs.access(fontPath);
    } catch {
      return res
        .status(404)
        .json({ success: false, error: `Font '${font}' not found` });
    }

    const fontContent = await fs.readFile(fontPath, "utf-8");
    const fontData = JSON.parse(fontContent);

    // Calculate bounds
    const bounds = calculateTextBounds(
      text,
      fontData,
      parseFloat(size),
      parseFloat(spacing)
    );

    res.json({
      success: true,
      bounds: {
        width: parseFloat(bounds.width.toFixed(2)),
        height: parseFloat(bounds.height.toFixed(2)),
        exceedsLimits: bounds.exceedsLimits,
        maxWidth: bounds.maxWidth,
        maxHeight: bounds.maxHeight,
      },
      characterCount: text.replace(/\s/g, "").length,
      lineCount: text.split("\n").length,
    });
  } catch (error) {
    console.error("Error previewing text:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
