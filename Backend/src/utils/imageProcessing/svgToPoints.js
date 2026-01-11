import pkg from "svg-path-parser";
const { parseSVG, makeAbsolute } = pkg;

/**
 * Extracts path data from SVG and converts to coordinate arrays
 * @param {string} svgString - The SVG string from Potrace
 * @param {object} options - Options
 * @returns {Array<Array<{x: number, y: number}>>} - Array of paths, each path is an array of points
 */
export function svgToPoints(svgString, options = {}) {
  const tolerance = options.tolerance || 0.5;
  
  try {
    // CNC working area dimensions in mm (GRBL limits: X=95, Y=130)
    const CNC_WIDTH = 95;
    const CNC_HEIGHT = 130;

    // Extract SVG viewBox to get original dimensions
    const viewBoxMatch = svgString.match(/viewBox="([^"]+)"/);
    let svgWidth = 300;
    let svgHeight = 300;
    let minX = 0;
    let minY = 0;

    if (viewBoxMatch) {
      const viewBox = viewBoxMatch[1].split(/\s+/);
      minX = parseFloat(viewBox[0]) || 0;
      minY = parseFloat(viewBox[1]) || 0;
      svgWidth = parseFloat(viewBox[2]) || 300;
      svgHeight = parseFloat(viewBox[3]) || 300;
    }

    const paths = [];
    let allPoints = [];

    // Extract all path elements from SVG - first pass to get all points
    const pathRegex = /<path[^>]*\sd="([^"]*)"/g;
    let match;

    while ((match = pathRegex.exec(svgString)) !== null) {
      const pathData = match[1];

      if (pathData && pathData.trim()) {
        const subPaths = parsePathToPoints(pathData);
        for (const subPath of subPaths) {
          if (subPath.length > 0) {
            allPoints.push(...subPath);
            paths.push(subPath);
          }
        }
      }
    }

    // Find actual min/max coordinates from all points
    if (allPoints.length > 0) {
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
      for (const path of paths) {
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
        const simplifiedPath = simplifyPath(scaledPath, tolerance);
        if (simplifiedPath.length > 0) {
          scaledPaths.push(simplifiedPath);
        }
      }

      return scaledPaths;
    }

    return paths;
  } catch (error) {
    console.error("Error in svgToPoints:", error);
    throw new Error(`Failed to parse SVG paths: ${error.message}`);
  }
}

/**
 * Simplify path by removing points that are very close to each other
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
 * Parses a single SVG path string into multiple sub-paths (split on moveto)
 */
function parsePathToPoints(pathData) {
  const allPaths = [];
  let currentPath = [];

  try {
    // Parse the path and make all commands absolute
    const commands = makeAbsolute(parseSVG(pathData));

    let currentX = 0;
    let currentY = 0;

    for (const cmd of commands) {
      switch (cmd.command) {
        case "moveto":
          // If we already have points in current path, save it and start new one
          if (currentPath.length > 0) {
            allPaths.push([...currentPath]);
            currentPath = [];
          }
          // Start new path with this point
          currentX = cmd.x;
          currentY = cmd.y;
          currentPath.push({ x: currentX, y: currentY });
          break;

        case "lineto":
          currentX = cmd.x;
          currentY = cmd.y;
          currentPath.push({ x: currentX, y: currentY });
          break;

        case "horizontal lineto":
          currentX = cmd.x;
          currentPath.push({ x: currentX, y: currentY });
          break;

        case "vertical lineto":
          currentY = cmd.y;
          currentPath.push({ x: currentX, y: currentY });
          break;

        case "curveto":
          // Cubic Bezier curve - sample multiple points along the curve
          const cubicPoints = sampleCubicBezier(
            currentX,
            currentY,
            cmd.x1,
            cmd.y1,
            cmd.x2,
            cmd.y2,
            cmd.x,
            cmd.y,
            8 // Sample 8 points
          );
          currentPath.push(...cubicPoints);
          currentX = cmd.x;
          currentY = cmd.y;
          break;

        case "smooth curveto":
          // Smooth cubic Bezier
          const smoothCubicPoints = sampleCubicBezier(
            currentX,
            currentY,
            cmd.x2,
            cmd.y2,
            cmd.x2,
            cmd.y2,
            cmd.x,
            cmd.y,
            8
          );
          currentPath.push(...smoothCubicPoints);
          currentX = cmd.x;
          currentY = cmd.y;
          break;

        case "quadratic curveto":
          // Quadratic Bezier curve
          const quadPoints = sampleQuadraticBezier(
            currentX,
            currentY,
            cmd.x1,
            cmd.y1,
            cmd.x,
            cmd.y,
            6 // Sample 6 points
          );
          currentPath.push(...quadPoints);
          currentX = cmd.x;
          currentY = cmd.y;
          break;

        case "smooth quadratic curveto":
          // Smooth quadratic Bezier
          const smoothQuadPoints = sampleQuadraticBezier(
            currentX,
            currentY,
            currentX,
            currentY,
            cmd.x,
            cmd.y,
            6
          );
          currentPath.push(...smoothQuadPoints);
          currentX = cmd.x;
          currentY = cmd.y;
          break;

        case "closepath":
          // Don't add return point - pen will lift after path
          break;

        case "arc":
          // Approximate arc with line segments
          const arcPoints = sampleArc(
            currentX,
            currentY,
            cmd.rx,
            cmd.ry,
            cmd.xAxisRotation,
            cmd.largeArc,
            cmd.sweep,
            cmd.x,
            cmd.y,
            8
          );
          currentPath.push(...arcPoints);
          currentX = cmd.x;
          currentY = cmd.y;
          break;
      }
    }

    // Don't forget to add the last path
    if (currentPath.length > 0) {
      allPaths.push(currentPath);
    }
  } catch (error) {
    console.error("Error parsing path data:", error);
  }

  return allPaths;
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

/**
 * Sample points along an arc
 */
function sampleArc(x0, y0, rx, ry, rotation, largeArc, sweep, x, y, numPoints) {
  const points = [];

  // Simple linear interpolation for arc approximation
  for (let i = 1; i <= numPoints; i++) {
    const t = i / numPoints;
    const px = x0 + (x - x0) * t;
    const py = y0 + (y - y0) * t;
    points.push({
      x: Math.round(px * 100) / 100,
      y: Math.round(py * 100) / 100,
    });
  }

  return points;
}
