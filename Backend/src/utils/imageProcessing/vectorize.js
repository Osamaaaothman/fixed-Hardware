import sharp from "sharp";
import potrace from "potrace";
import { promisify } from "util";

const trace = promisify(potrace.trace);

/**
 * Convert an image to SVG using vectorization
 * @param {string} imagePath - Path to the input image
 * @param {object} options - Processing options
 * @returns {Promise<{svg: string, processedImage: string}>}
 */
export async function vectorizeImage(imagePath, options = {}) {
  const imageSize = options.imageSize || 300;
  const detailLevel = options.detailLevel || 2;

  // Map detail level to potrace settings
  const detailSettings = {
    1: { turdSize: 8, optTolerance: 0.6 }, // Low detail
    2: { turdSize: 4, optTolerance: 0.4 }, // Medium detail
    3: { turdSize: 2, optTolerance: 0.2 }, // High detail
  };

  const settings = detailSettings[detailLevel] || detailSettings[2];

  try {
    // Step 1: Process image with Sharp
    const processedBuffer = await sharp(imagePath)
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
    const svg = await trace(processedBuffer, {
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

    return {
      svg: svg,
      processedImage: processedImageBase64,
    };
  } catch (error) {
    console.error("Vectorization error:", error);
    throw new Error(`Failed to vectorize image: ${error.message}`);
  }
}
