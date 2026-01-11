import sharp from "sharp";

/**
 * Analyze colors in an image and return primary colors
 * @param {string} imagePath - Path to the image
 * @returns {Promise<Array<{name: string, rgb: {r: number, g: number, b: number}}>>}
 */
export async function analyzeColors(imagePath) {
  try {
    const { data, info } = await sharp(imagePath)
      .resize(300, 300, { fit: "inside" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const colorMap = new Map();
    const pixelCount = info.width * info.height;

    // Sample pixels
    for (let i = 0; i < data.length; i += info.channels * 10) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Skip white/near-white pixels
      if (r > 250 && g > 250 && b > 250) continue;

      const colorKey = `${Math.round(r / 50)}-${Math.round(
        g / 50
      )}-${Math.round(b / 50)}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    // Detect primary colors
    const colors = [];
    const threshold = pixelCount * 0.01; // At least 1% of pixels

    for (const [key, count] of colorMap.entries()) {
      if (count > threshold) {
        const [r, g, b] = key.split("-").map((v) => parseInt(v) * 50);

        let colorName = "black";
        if (r > 100 && r > g + 50 && r > b + 50) colorName = "red";
        else if (g > 100 && g > r + 50 && g > b + 50) colorName = "green";
        else if (b > 100 && b > r + 50 && b > g + 50) colorName = "blue";

        colors.push({
          name: colorName,
          rgb: { r, g, b },
        });
      }
    }

    return colors.length > 0
      ? colors
      : [{ name: "black", rgb: { r: 0, g: 0, b: 0 } }];
  } catch (error) {
    console.error("Color analysis error:", error);
    throw new Error(`Failed to analyze colors: ${error.message}`);
  }
}

/**
 * Filter paths by color (placeholder - requires color data in SVG)
 * @param {Array} paths - Array of paths
 * @param {string} color - Color to filter
 * @returns {Array}
 */
export function filterPathsByColor(paths, color) {
  // This is a simplified version - full implementation would require
  // color information to be embedded in the SVG during vectorization
  return paths;
}

/**
 * Create preview images for each color layer
 * @param {string} imagePath - Path to the image
 * @param {Array} colors - Array of colors
 * @returns {Promise<Object>}
 */
export async function createColorPreviews(imagePath, colors) {
  const previews = {};

  for (const color of colors) {
    const buffer = await sharp(imagePath)
      .resize(300, 300, { fit: "inside" })
      .grayscale()
      .toBuffer();

    previews[color.name] = `data:image/png;base64,${buffer.toString("base64")}`;
  }

  return previews;
}
