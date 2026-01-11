/**
 * Converts coordinate arrays to G-code commands for a pen plotter
 * @param {Array<Array<{x: number, y: number}>>} paths - Array of paths
 * @param {Object} options - G-code generation options
 * @returns {Object} - Generated G-code text and statistics
 */
export function pointsToGcode(paths, options = {}) {
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
