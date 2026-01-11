import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to fonts directory
const FONTS_DIR = path.join(__dirname, "../../fonts/hershey");

/**
 * GET /api/fonts
 * List all available fonts
 */
router.get("/", async (req, res) => {
  try {
    const files = await fs.readdir(FONTS_DIR);
    const fontFiles = files.filter((file) => file.endsWith(".json"));

    const fonts = await Promise.all(
      fontFiles.map(async (file) => {
        const fontPath = path.join(FONTS_DIR, file);
        const content = await fs.readFile(fontPath, "utf-8");
        const fontData = JSON.parse(content);

        return {
          id: path.basename(file, ".json"),
          name: fontData.name,
          description: fontData.description,
          characterCount: Object.keys(fontData.chars).length,
        };
      })
    );

    res.json({ success: true, fonts });
  } catch (error) {
    console.error("Error listing fonts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/fonts/:name
 * Get specific font data
 */
router.get("/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const fontPath = path.join(FONTS_DIR, `${name}.json`);

    // Check if font exists
    try {
      await fs.access(fontPath);
    } catch {
      return res.status(404).json({ success: false, error: "Font not found" });
    }

    const content = await fs.readFile(fontPath, "utf-8");
    const fontData = JSON.parse(content);

    res.json({ success: true, font: fontData });
  } catch (error) {
    console.error("Error loading font:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
