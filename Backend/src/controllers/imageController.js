import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { vectorizeImage } from "../utils/imageProcessing/vectorize.js";
import { svgToPoints } from "../utils/imageProcessing/svgToPoints.js";
import { pointsToGcode } from "../utils/imageProcessing/pointsToGcode.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "image-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

/**
 * POST /api/image/convert
 * Convert uploaded image to G-code
 */
router.post("/convert", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const imagePath = req.file.path;

    // Parse options from request body
    const options = {
      imageSize: parseInt(req.body.imageSize) || 300,
      detailLevel: parseInt(req.body.detailLevel) || 2,
      feedRate: parseInt(req.body.feedRate) || 1500,
      penUp: parseFloat(req.body.penUp) || -2.3,
      penDown: parseFloat(req.body.penDown) || 0,
      tolerance: parseFloat(req.body.tolerance) || 0.5,
      removeNoise: req.body.removeNoise !== "false",
      minPathLength: parseFloat(req.body.minPathLength) || 2,
    };

    // Step 1: Vectorize the image
    const { svg, processedImage } = await vectorizeImage(imagePath, options);

    // Step 2: Convert SVG to points
    const paths = svgToPoints(svg, options);

    // Step 3: Generate G-code
    const { gcode, stats } = pointsToGcode(paths, options);

    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    // Send response
    res.json({
      gcode,
      stats,
      processedImage,
    });
  } catch (error) {
    console.error("Image conversion error:", error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "Failed to convert image",
      message: error.message,
    });
  }
});

/**
 * GET /api/image/health
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Image to G-code converter API is running",
  });
});

export default router;
