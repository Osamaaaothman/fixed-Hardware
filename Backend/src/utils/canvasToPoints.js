/**
 * Converts Fabric.js canvas paths to coordinate arrays
 * @param {Array} fabricPaths - Array of Fabric.js path objects
 * @param {Object} canvasSize - Canvas dimensions {width, height}
 * @returns {Array<Array<{x: number, y: number}>>} - Array of paths with coordinates
 */
function fabricPathsToPoints(fabricPaths, canvasSize) {
  const CNC_WIDTH = 95; // mm
  const CNC_HEIGHT = 130; // mm

  const allPaths = [];
  let allPoints = [];

  // First pass: extract all points from fabric paths
  for (const pathObj of fabricPaths) {
    console.log(
      `[canvasToPoints] Processing path: type=${
        pathObj.type
      }, hasPath=${!!pathObj.path}, pathLength=${pathObj.path?.length}`
    );

    if (pathObj.type?.toLowerCase() === "path" && pathObj.path) {
      const subPaths = parsePathToPoints(pathObj.path);
      for (const subPath of subPaths) {
        if (subPath.length > 0) {
          allPoints.push(...subPath);
          allPaths.push(subPath);
        }
      }
    }
  }

  // Find actual min/max coordinates from all points
  if (allPoints.length === 0) {
    return [];
  }

  const xCoords = allPoints.map((p) => p.x);
  const yCoords = allPoints.map((p) => p.y);
  const actualMinX = Math.min(...xCoords);
  const actualMinY = Math.min(...yCoords);
  const actualMaxX = Math.max(...xCoords);
  const actualMaxY = Math.max(...yCoords);
  const actualWidth = actualMaxX - actualMinX;
  const actualHeight = actualMaxY - actualMinY;

  // Calculate scaling factor to fit CNC area while maintaining aspect ratio
  const scaleX = CNC_WIDTH / actualWidth;
  const scaleY = CNC_HEIGHT / actualHeight;
  const scale = Math.min(scaleX, scaleY);

  // Scale and translate all paths to fit within CNC bounds
  const scaledPaths = [];
  for (const path of allPaths) {
    const scaledPath = path.map((point) => ({
      x: Math.min(
        Math.max(Math.round((point.x - actualMinX) * scale * 100) / 100, 0),
        CNC_WIDTH
      ),
      y: Math.min(
        Math.max(Math.round((point.y - actualMinY) * scale * 100) / 100, 0),
        CNC_HEIGHT
      ),
    }));

    // Simplify path by removing very close points
    const simplifiedPath = simplifyPath(scaledPath, 0.5);
    if (simplifiedPath.length > 0) {
      scaledPaths.push(simplifiedPath);
    }
  }

  return scaledPaths;
}

/**
 * Parse Fabric.js path array to points
 * @param {Array} fabricPath - Fabric.js path array [['M', x, y], ['L', x, y], ...]
 * @returns {Array<Array<{x: number, y: number}>>} - Array of sub-paths
 */
function parsePathToPoints(fabricPath) {
  const allPaths = [];
  let currentPath = [];
  let currentX = 0;
  let currentY = 0;

  for (const cmd of fabricPath) {
    const command = cmd[0];

    switch (command) {
      case "M": // MoveTo
        if (currentPath.length > 0) {
          allPaths.push([...currentPath]);
          currentPath = [];
        }
        currentX = cmd[1];
        currentY = cmd[2];
        currentPath.push({ x: currentX, y: currentY });
        break;

      case "L": // LineTo
        currentX = cmd[1];
        currentY = cmd[2];
        currentPath.push({ x: currentX, y: currentY });
        break;

      case "H": // Horizontal LineTo
        currentX = cmd[1];
        currentPath.push({ x: currentX, y: currentY });
        break;

      case "V": // Vertical LineTo
        currentY = cmd[1];
        currentPath.push({ x: currentX, y: currentY });
        break;

      case "C": // Cubic Bezier
        const cubicPoints = sampleCubicBezier(
          currentX,
          currentY,
          cmd[1],
          cmd[2],
          cmd[3],
          cmd[4],
          cmd[5],
          cmd[6],
          8
        );
        currentPath.push(...cubicPoints);
        currentX = cmd[5];
        currentY = cmd[6];
        break;

      case "Q": // Quadratic Bezier
        const quadPoints = sampleQuadraticBezier(
          currentX,
          currentY,
          cmd[1],
          cmd[2],
          cmd[3],
          cmd[4],
          6
        );
        currentPath.push(...quadPoints);
        currentX = cmd[3];
        currentY = cmd[4];
        break;

      case "Z": // ClosePath
        // Don't add return point - pen will lift after path
        break;
    }
  }

  if (currentPath.length > 0) {
    allPaths.push(currentPath);
  }

  return allPaths;
}

/**
 * Simplify path by removing points that are very close to each other
 * @param {Array<{x: number, y: number}>} path - Array of points
 * @param {number} tolerance - Minimum distance between points in mm
 * @returns {Array<{x: number, y: number}>} - Simplified path
 */
function simplifyPath(path, tolerance = 0.5) {
  if (path.length <= 2) return path;

  const simplified = [path[0]]; // Always keep first point

  for (let i = 1; i < path.length - 1; i++) {
    const lastPoint = simplified[simplified.length - 1];
    const currentPoint = path[i];

    // Calculate distance from last kept point
    const dx = currentPoint.x - lastPoint.x;
    const dy = currentPoint.y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only keep point if it's far enough from the last kept point
    if (distance >= tolerance) {
      simplified.push(currentPoint);
    }
  }

  // Always keep last point
  simplified.push(path[path.length - 1]);

  return simplified;
}

/**
 * Sample points along a cubic Bezier curve
 */
function sampleCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, numPoints) {
  const points = [];

  for (let i = 1; i <= numPoints; i++) {
    const t = i / numPoints;
    const mt = 1 - t;

    const x =
      mt * mt * mt * x0 +
      3 * mt * mt * t * x1 +
      3 * mt * t * t * x2 +
      t * t * t * x3;

    const y =
      mt * mt * mt * y0 +
      3 * mt * mt * t * y1 +
      3 * mt * t * t * y2 +
      t * t * t * y3;

    points.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  }

  return points;
}

/**
 * Sample points along a quadratic Bezier curve
 */
function sampleQuadraticBezier(x0, y0, x1, y1, x2, y2, numPoints) {
  const points = [];

  for (let i = 1; i <= numPoints; i++) {
    const t = i / numPoints;
    const mt = 1 - t;

    const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
    const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;

    points.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  }

  return points;
}

export { fabricPathsToPoints, simplifyPath };
