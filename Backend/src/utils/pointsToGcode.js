/**
 * Converts coordinate arrays to G-code commands for a pen plotter
 * @param {Array<Array<{x: number, y: number}>>} paths - Array of paths, each containing coordinate points
 * @param {Object} options - G-code generation options
 * @param {number} options.feedRate - Feed rate in mm/min (default: 1500)
 * @param {number} options.penUp - Z position for pen up (default: -2.3)
 * @param {number} options.penDown - Z position for pen down (default: 0)
 * @returns {Object} - Generated G-code text and statistics
 */
function pointsToGcode(paths, options = {}) {
  const feedRate = options.feedRate || 1500;
  const penUp = options.penUp || -2.3;
  const penDown = options.penDown || 0;

  const gcode = [];
  let totalDistance = 0;
  let drawingDistance = 0;
  let moveDistance = 0;
  let penUpCount = 0;

  // Initialize G-code with standard pen plotter settings
  gcode.push("; G-code generated for pen plotter");
  gcode.push("; Generated on: " + new Date().toISOString());
  gcode.push(
    `; Settings: Feed Rate=${feedRate}, Pen Up=${penUp}, Pen Down=${penDown}`
  );
  gcode.push("G21 ; Set units to millimeters");
  gcode.push("G90 ; Use absolute positioning");
  gcode.push(`G1 Z${penUp} F${feedRate} ; Pen up`);
  gcode.push("");

  let pathCount = 0;
  let lastX = 0;
  let lastY = 0;

  for (const path of paths) {
    if (path.length === 0) continue;

    pathCount++;
    gcode.push(`; Path ${pathCount} - ${path.length} points`);

    // Ensure pen is up before moving to new path
    gcode.push(`G1 Z${penUp} F${feedRate} ; Pen up`);
    penUpCount++;

    // Move to the starting point of the path with pen up
    const startPoint = path[0];
    const moveX = startPoint.x - lastX;
    const moveY = startPoint.y - lastY;
    const moveDist = Math.sqrt(moveX * moveX + moveY * moveY);
    moveDistance += moveDist;
    totalDistance += moveDist;

    gcode.push(
      `G0 X${startPoint.x.toFixed(2)} Y${startPoint.y.toFixed(
        2
      )} ; Move to start`
    );

    // Lower pen to draw
    gcode.push(`G1 Z${penDown} F${feedRate} ; Pen down`);

    // Draw each point in the path
    for (let i = 1; i < path.length; i++) {
      const point = path[i];
      const prevPoint = path[i - 1];
      const dx = point.x - prevPoint.x;
      const dy = point.y - prevPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      drawingDistance += dist;
      totalDistance += dist;

      gcode.push(
        `G1 X${point.x.toFixed(2)} Y${point.y.toFixed(2)} F${feedRate}`
      );
    }

    lastX = path[path.length - 1].x;
    lastY = path[path.length - 1].y;

    // Lift pen after completing the path
    gcode.push(`G1 Z${penUp} F${feedRate} ; Pen up`);
    gcode.push("");
  }

  // End program
  // End program
  gcode.push("; End of program");
  gcode.push(`; Total paths: ${pathCount}`);
  gcode.push(`; Total distance: ${totalDistance.toFixed(2)} mm`);
  gcode.push(`; Drawing distance: ${drawingDistance.toFixed(2)} mm`);
  gcode.push(`; Movement distance: ${moveDistance.toFixed(2)} mm`);
  gcode.push(`G1 Z${penUp} ; Ensure pen is up`);
  gcode.push("G0 X0 Y0 ; Return to origin");
  gcode.push("M2 ; End program");
  const gcodeText = gcode.join("\n");

  // Calculate estimated time (in minutes)
  const drawTime = drawingDistance / feedRate;
  const moveTime = moveDistance / feedRate;
  const penTime = (penUpCount * 2 * 1.5) / 60; // ~1.5 seconds per pen up/down
  const estimatedTime = drawTime + moveTime + penTime;

  return {
    gcode: gcodeText,
    stats: {
      pathCount,
      totalDistance: Math.round(totalDistance * 100) / 100,
      drawingDistance: Math.round(drawingDistance * 100) / 100,
      moveDistance: Math.round(moveDistance * 100) / 100,
      estimatedTime: Math.round(estimatedTime * 10) / 10,
      lineCount: gcode.length,
    },
  };
}

/**
 * Optimizes G-code by removing redundant commands
 * @param {string} gcode - Raw G-code string
 * @returns {string} - Optimized G-code
 */
function optimizeGcode(gcode) {
  const lines = gcode.split("\n");
  const optimized = [];
  let lastCommand = "";
  let lastZ = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines in the middle (keep them for readability at section breaks)
    if (trimmed === "" && lastCommand !== "") {
      optimized.push(line);
      lastCommand = "";
      continue;
    }

    // Keep comments
    if (trimmed.startsWith(";")) {
      optimized.push(line);
      continue;
    }

    // Extract the command part (before any comment)
    const commandPart = trimmed.split(";")[0].trim();

    // Track Z movements separately - never remove pen up/down commands
    if (commandPart.includes(" Z")) {
      const zMatch = commandPart.match(/Z(-?\d+\.?\d*)/);
      if (zMatch) {
        const currentZ = zMatch[1];
        // Only skip if it's the exact same Z command consecutively
        if (currentZ !== lastZ || !commandPart.startsWith("G1 Z")) {
          optimized.push(line);
          lastZ = currentZ;
        }
        lastCommand = commandPart;
        continue;
      }
    }

    // Remove duplicate consecutive XY movement commands only
    if (commandPart !== lastCommand) {
      optimized.push(line);
      lastCommand = commandPart;
    }
  }

  return optimized.join("\n");
}

/**
 * Optimizes path order using nearest neighbor algorithm to minimize pen travel
 * @param {Array<Array<{x: number, y: number}>>} paths - Array of paths
 * @returns {Array<Array<{x: number, y: number}>>} - Optimized paths
 */
function optimizePathOrder(paths) {
  if (paths.length <= 1) return paths;

  const optimized = [];
  const remaining = [...paths];
  let currentPos = { x: 0, y: 0 }; // Start from origin

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    // Find nearest path start point
    for (let i = 0; i < remaining.length; i++) {
      const path = remaining[i];
      if (path.length === 0) continue;

      const startPoint = path[0];
      const dx = startPoint.x - currentPos.x;
      const dy = startPoint.y - currentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    // Add nearest path to optimized list
    const nearestPath = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearestPath);

    // Update current position to end of this path
    if (nearestPath.length > 0) {
      currentPos = nearestPath[nearestPath.length - 1];
    }
  }

  return optimized;
}

export { pointsToGcode, optimizeGcode, optimizePathOrder };
