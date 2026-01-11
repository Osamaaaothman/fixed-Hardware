import sharp from "sharp";

/**
 * Analyzes an image and extracts color information
 * @param {Buffer} imageBuffer - The image buffer
 * @param {number} imageSize - Target image width in pixels
 * @returns {Promise<Object>} Object with {colors, pixelColorIndices, width, height}
 */
export async function analyzeColors(imageBuffer, imageSize = 300) {
  // Resize and get raw pixel data
  const { data, info } = await sharp(imageBuffer)
    .resize(imageSize, null, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  console.log(`Analyzing image: ${width}x${height}, ${channels} channels`);

  // Define the 4 target colors: Red, Green, Blue, Black
  const targetColors = [
    { name: "Red", r: 255, g: 0, b: 0 },
    { name: "Green", r: 0, g: 255, b: 0 },
    { name: "Blue", r: 0, g: 0, b: 255 },
    { name: "Black", r: 0, g: 0, b: 0 },
  ];

  const colorCounts = [0, 0, 0, 0]; // Count pixels for each color
  const pixelColorIndices = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const pixelIndex = Math.floor(i / channels);

    // Skip white/background pixels
    if (r > 250 && g > 250 && b > 250) {
      pixelColorIndices[pixelIndex] = 255;
      continue;
    }

    // Find which primary color this pixel is closest to
    let closestColorIndex = 3; // Default to Black
    let minDistance = Infinity;

    // Check Red (high R, low G and B)
    if (r > 100 && r > g + 50 && r > b + 50) {
      closestColorIndex = 0; // Red
    }
    // Check Green (high G, low R and B)
    else if (g > 100 && g > r + 50 && g > b + 50) {
      closestColorIndex = 1; // Green
    }
    // Check Blue (high B, low R and G)
    else if (b > 100 && b > r + 50 && b > g + 50) {
      closestColorIndex = 2; // Blue
    }
    // Everything else is Black
    else {
      closestColorIndex = 3; // Black
    }

    pixelColorIndices[pixelIndex] = closestColorIndex;
    colorCounts[closestColorIndex]++;
  }

  console.log(
    `Color distribution: Red=${colorCounts[0]}, Green=${colorCounts[1]}, Blue=${colorCounts[2]}, Black=${colorCounts[3]}`
  );

  // Build color array only for colors that exist
  const colors = [];
  targetColors.forEach((color, index) => {
    if (colorCounts[index] > 0) {
      colors.push({
        index: colors.length,
        r: color.r,
        g: color.g,
        b: color.b,
        hex: rgbToHex(color.r, color.g, color.b),
        name: color.name,
        count: colorCounts[index],
      });
    }
  });

  console.log(
    "Detected colors:",
    colors.map((c) => `${c.name} (${c.hex})`).join(", ")
  );

  return {
    colors,
    pixelColorIndices,
    width,
    height,
  };
}

/**
 * Filter paths by color - assigns each path to a color based on pixel analysis
 * @param {Array} paths - Array of path point arrays
 * @param {Object} colorAnalysis - Result from analyzeColors
 * @returns {Array} Array of {color, name, pixelCount, paths} objects
 */
export function filterPathsByColor(paths, colorAnalysis) {
  const { colors, pixelColorIndices, width, height } = colorAnalysis;

  const colorLayers = colors.map((color) => ({
    color: {
      r: color.r,
      g: color.g,
      b: color.b,
      hex: color.hex,
    },
    name: color.name,
    pixelCount: color.count,
    paths: [],
  }));

  paths.forEach((path) => {
    if (path.length === 0) return;

    // Sample points along the path
    const colorVotes = new Map();
    const samplePoints = [
      path[0],
      path[Math.floor(path.length * 0.25)],
      path[Math.floor(path.length * 0.5)],
      path[Math.floor(path.length * 0.75)],
      path[path.length - 1],
    ];

    samplePoints.forEach((point) => {
      const x = Math.round(point.x);
      const y = Math.round(point.y);

      if (x >= 0 && x < width && y >= 0 && y < height) {
        const pixelIndex = y * width + x;
        const colorIndex = pixelColorIndices[pixelIndex];

        if (colorIndex !== 255) {
          colorVotes.set(colorIndex, (colorVotes.get(colorIndex) || 0) + 1);
        }
      }
    });

    if (colorVotes.size > 0) {
      let maxVotes = 0;
      let winningColor = 0;

      for (const [colorIndex, votes] of colorVotes.entries()) {
        if (votes > maxVotes) {
          maxVotes = votes;
          winningColor = colorIndex;
        }
      }

      if (winningColor < colorLayers.length) {
        colorLayers[winningColor].paths.push(path);
      }
    }
  });

  return colorLayers.filter((layer) => layer.paths.length > 0);
}

/**
 * Create preview images for each color layer
 * @param {Object} colorAnalysis - Result from analyzeColors
 * @returns {Promise<Array>} Array of base64 preview images for each color
 */
export async function createColorPreviews(colorAnalysis) {
  const { colors, pixelColorIndices, width, height } = colorAnalysis;

  const previews = await Promise.all(
    colors.map(async (color) => {
      // Create a buffer for this color layer (RGB)
      const layerData = Buffer.alloc(width * height * 3, 255); // Fill with white

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixelIndex = y * width + x;
          const colorIndex = pixelColorIndices[pixelIndex];

          // If this pixel belongs to the current color, paint it with the color
          if (colorIndex === color.index) {
            const outIndex = pixelIndex * 3;
            layerData[outIndex] = color.r; // R
            layerData[outIndex + 1] = color.g; // G
            layerData[outIndex + 2] = color.b; // B
          }
        }
      }

      // Convert to PNG and base64
      const previewBuffer = await sharp(layerData, {
        raw: {
          width,
          height,
          channels: 3,
        },
      })
        .png()
        .toBuffer();

      return `data:image/png;base64,${previewBuffer.toString("base64")}`;
    })
  );

  return previews;
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Get a human-readable name for a color
 */
function getColorName(r, g, b) {
  const brightness = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  // Very dark colors
  if (brightness < 40) return "Black";

  // Very light colors
  if (brightness > 220) return "White";

  // Low saturation = grayscale
  if (saturation < 0.2) {
    if (brightness < 80) return "Dark Gray";
    if (brightness < 160) return "Gray";
    return "Light Gray";
  }

  // Red dominant
  if (r > g && r > b) {
    if (g > b + 30) return "Orange";
    if (b > g + 20) return "Pink";
    return "Red";
  }

  // Green dominant
  if (g > r && g > b) {
    if (r > b + 30) return "Yellow";
    if (b > r + 20) return "Cyan";
    return "Green";
  }

  // Blue dominant
  if (b > r && b > g) {
    if (r > g + 20) return "Purple";
    if (g > r + 20) return "Cyan";
    return "Blue";
  }

  // Mixed colors (similar RGB values but saturated)
  if (Math.abs(r - g) < 30 && Math.abs(r - b) < 30) {
    if (brightness < 100) return "Dark Gray";
    if (brightness > 180) return "Light Gray";
    return "Gray";
  }

  // Yellow range
  if (r > 150 && g > 150 && b < 100) return "Yellow";

  // Magenta/Purple range
  if (r > 150 && b > 150 && g < 100) return "Magenta";

  // Cyan range
  if (g > 150 && b > 150 && r < 100) return "Cyan";

  // Orange range
  if (r > 200 && g > 100 && g < 200 && b < 100) return "Orange";

  // Brown range
  if (r > 100 && g > 50 && g < r && b < 100 && brightness < 150) return "Brown";

  return "Mixed";
}
