/**
 * Text to G-code Converter Service
 * Converts text strings to G-code using Hershey single-line fonts
 */

/**
 * Convert text to G-code
 * @param {string} text - Text to convert
 * @param {Object} fontData - Font data from JSON file
 * @param {Object} settings - Conversion settings
 * @returns {Object} - { gcode, stats }
 */
export function textToGcode(text, fontData, settings = {}) {
  const {
    size = 10, // Font size in mm
    spacing = 2, // Character spacing in mm
    lineSpacing = 1.5, // Line spacing multiplier
    feedRate = 1500, // Feed rate in mm/min
    penUp = -2.3, // Z height for pen up
    penDown = 0, // Z height for pen down
    alignment = "left", // left, center, right
  } = settings;

  // CNC working area limits
  const MAX_WIDTH = 95; // mm
  const MAX_HEIGHT = 130; // mm

  // Convert text to uppercase since Hershey fonts only have uppercase letters
  text = text.toUpperCase();

  // Check bounds before generating
  const bounds = calculateTextBounds(text, fontData, size, spacing);
  if (bounds.exceedsLimits) {
    throw new Error(
      `Text dimensions (${bounds.width.toFixed(1)}mm × ${bounds.height.toFixed(
        1
      )}mm) exceed CNC limits (${MAX_WIDTH}mm × ${MAX_HEIGHT}mm). Please reduce font size or text length.`
    );
  }

  const lines = text.split("\n");
  let gcode = [];
  let totalDistance = 0;
  let pathCount = 0;

  // Header
  gcode.push("; G-code generated for text plotter");
  gcode.push(`; Generated on: ${new Date().toISOString()}`);
  gcode.push(
    `; Settings: Size=${size}mm, Spacing=${spacing}mm, Feed Rate=${feedRate}`
  );
  gcode.push(
    `; Text dimensions: ${bounds.width.toFixed(1)}mm × ${bounds.height.toFixed(
      1
    )}mm`
  );
  gcode.push("G21 ; Set units to millimeters");
  gcode.push("G90 ; Use absolute positioning");
  gcode.push(`G1 Z${penUp} F${feedRate} ; Pen up`);
  gcode.push("");

  const scaleX = size / fontData.lineHeight;
  const scaleY = size / fontData.lineHeight;

  let currentY = 0;

  // Process each line of text
  lines.forEach((line, lineIndex) => {
    if (!line.trim()) {
      currentY += fontData.lineHeight * scaleY * lineSpacing;
      return;
    }

    // Calculate line width for alignment
    let lineWidth = 0;
    for (let char of line) {
      const charData = fontData.chars[char];
      if (charData) {
        lineWidth += charData.width * scaleX + spacing;
      }
    }
    // Remove last spacing
    if (lineWidth > 0) {
      lineWidth -= spacing;
    }

    // Calculate starting X based on alignment
    let startX = 0;
    if (alignment === "center") {
      startX = -lineWidth / 2;
    } else if (alignment === "right") {
      startX = -lineWidth;
    }

    let currentX = startX;

    gcode.push(`; Line ${lineIndex + 1}: "${line}"`);

    // Process each character
    for (let char of line) {
      const charData = fontData.chars[char];

      if (!charData) {
        // Unknown character - skip
        currentX += spacing * scaleX;
        continue;
      }

      if (charData.paths.length === 0) {
        // Space character
        currentX += charData.width * scaleX + spacing * scaleX;
        continue;
      }

      gcode.push(`; Character: '${char}'`);
      pathCount++;

      // Draw each path of the character
      charData.paths.forEach((path, pathIndex) => {
        if (path.length < 2) return;

        // Move to start of path (pen up)
        const startPoint = path[0];
        const startPosX = currentX + startPoint[0] * scaleX;
        // Flip Y coordinate: subtract from lineHeight to invert
        const startPosY =
          currentY + (fontData.lineHeight - startPoint[1]) * scaleY;

        gcode.push(`G1 Z${penUp} F${feedRate} ; Pen up`);
        gcode.push(
          `G0 X${startPosX.toFixed(3)} Y${startPosY.toFixed(3)} ; Move to start`
        );
        gcode.push(`G1 Z${penDown} F${feedRate} ; Pen down`);

        // Draw the path
        for (let i = 1; i < path.length; i++) {
          const point = path[i];
          const posX = currentX + point[0] * scaleX;
          // Flip Y coordinate: subtract from lineHeight to invert
          const posY = currentY + (fontData.lineHeight - point[1]) * scaleY;

          gcode.push(`G1 X${posX.toFixed(3)} Y${posY.toFixed(3)} F${feedRate}`);

          // Calculate distance
          if (i > 0) {
            const prevPoint = path[i - 1];
            const prevPosX = currentX + prevPoint[0] * scaleX;
            const prevPosY =
              currentY + (fontData.lineHeight - prevPoint[1]) * scaleY;
            const dx = posX - prevPosX;
            const dy = posY - prevPosY;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
          }
        }
      });

      // Move to next character position
      currentX += charData.width * scaleX + spacing;
    }

    gcode.push(""); // Empty line between text lines

    // Move to next line
    currentY += fontData.lineHeight * scaleY * lineSpacing;
  });

  // Footer
  gcode.push(`G1 Z${penUp} F${feedRate} ; Pen up`);
  gcode.push("G0 X0 Y0 ; Return to origin");
  gcode.push("; End of G-code");

  const gcodeString = gcode.join("\n");

  // Calculate stats
  const commandLines = gcode.filter(
    (line) => line.trim() && !line.trim().startsWith(";")
  ).length;

  const estimatedTime = totalDistance / feedRate; // in minutes

  const stats = {
    lines: commandLines,
    paths: pathCount,
    characters: text.replace(/\s/g, "").length,
    distance: totalDistance.toFixed(2),
    estimatedTime: estimatedTime.toFixed(2),
    size: new Blob([gcodeString]).size,
  };

  return {
    gcode: gcodeString,
    stats,
  };
}

/**
 * Calculate text bounds
 * @param {string} text - Text to calculate bounds for
 * @param {Object} fontData - Font data
 * @param {number} size - Font size
 * @param {number} spacing - Character spacing
 * @returns {Object} - { width, height }
 */
export function calculateTextBounds(text, fontData, size, spacing) {
  // CNC working area limits
  const MAX_WIDTH = 95; // mm
  const MAX_HEIGHT = 130; // mm

  // Convert text to uppercase since Hershey fonts only have uppercase letters
  text = text.toUpperCase();

  const lines = text.split("\n");
  const scaleX = size / fontData.lineHeight;
  const scaleY = size / fontData.lineHeight;

  let maxWidth = 0;

  lines.forEach((line) => {
    let lineWidth = 0;
    for (let char of line) {
      const charData = fontData.chars[char];
      if (charData) {
        // Width is in font units, spacing is already in mm
        lineWidth += charData.width * scaleX + spacing;
      }
    }
    // Remove last spacing
    if (lineWidth > 0) {
      lineWidth -= spacing;
    }
    maxWidth = Math.max(maxWidth, lineWidth);
  });

  const height = lines.length * fontData.lineHeight * scaleY * 1.5; // Include line spacing

  return {
    width: maxWidth,
    height: height,
    exceedsLimits: maxWidth > MAX_WIDTH || height > MAX_HEIGHT,
    maxWidth: MAX_WIDTH,
    maxHeight: MAX_HEIGHT,
  };
}
