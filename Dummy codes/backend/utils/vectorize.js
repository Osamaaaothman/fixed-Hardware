import sharp from "sharp";
import potrace from "potrace";
import { promisify } from "util";

const potraceTrace = promisify(potrace.trace);

/**
 * Converts an image to a black-and-white bitmap and vectorizes it using Potrace
 * @param {Buffer} imageBuffer - The uploaded image buffer
 * @param {Object} options - Processing options
 * @param {number} options.imageSize - Target width in pixels (default: 300)
 * @param {number} options.detailLevel - Detail level 1-3 (default: 2)
 * @returns {Promise<{svg: string, processedImage: string}>} - SVG and base64 processed image
 */
export async function vectorizeImage(imageBuffer, options = {}) {
  const imageSize = options.imageSize || 300;
  const detailLevel = options.detailLevel || 2;

  // CNC working area dimensions in mm (GRBL limits: X=95, Y=130)
  const CNC_WIDTH = 95;
  const CNC_HEIGHT = 130;

  // Map detail level to potrace settings
  const detailSettings = {
    1: { turdSize: 8, optTolerance: 0.6 }, // Low detail
    2: { turdSize: 4, optTolerance: 0.4 }, // Medium detail
    3: { turdSize: 2, optTolerance: 0.2 }, // High detail
  };

  const settings = detailSettings[detailLevel] || detailSettings[2];

  try {
    // Step 1: Process image with Sharp
    const processedBuffer = await sharp(imageBuffer)
      .resize(imageSize, null, {
        fit: "inside",
        withoutEnlargement: false,
      })
      .greyscale()
      .normalise()
      .threshold(128)
      .toBuffer();

    // Convert processed image to base64 for preview
    const processedImageBase64 = `data:image/png;base64,${processedBuffer.toString(
      "base64"
    )}`;

    // Step 2: Vectorize with Potrace
    const svg = await potraceTrace(processedBuffer, {
      turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
      turdSize: settings.turdSize,
      optCurve: true,
      alphaMax: 1,
      optTolerance: settings.optTolerance,
      threshold: 128,
      blackOnWhite: true,
      color: "black",
      background: "transparent",
    });

    return { svg, processedImage: processedImageBase64 };
  } catch (error) {
    console.error("Error in vectorizeImage:", error);
    throw new Error(`Failed to vectorize image: ${error.message}`);
  }
}
