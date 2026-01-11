import { useState, useRef, useEffect } from "react";
import {
  FileCode2,
  Upload,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

const GcodeViewerPage = () => {
  const [gcode, setGcode] = useState("");
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef(null);

  // Parse and draw G-code on canvas
  const drawGcode = (gcodeText) => {
    const canvas = canvasRef.current;
    if (!canvas || !gcodeText) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    const gridSize = 20;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Parse G-code and collect all points
    const lines = gcodeText.split("\n");
    const paths = [];
    let currentPath = [];
    let currentX = 0;
    let currentY = 0;
    let isPenDown = false;
    let allX = [];
    let allY = [];

    console.log("Starting G-code parsing...");
    console.log("First 20 lines:", lines.slice(0, 20));

    lines.forEach((line, index) => {
      const trimmed = line.trim().toUpperCase();
      if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("("))
        return;

      // Check for pen down (Z negative value means pen down)
      const zDownMatch = trimmed.match(/Z\s*([-]\d*\.?\d+)/);
      if (zDownMatch) {
        if (!isPenDown && currentPath.length > 0) {
          paths.push([...currentPath]);
          currentPath = [];
        }
        isPenDown = true;
        currentPath.push({ x: currentX, y: currentY });
        if (index < 30)
          console.log(
            `Line ${index}: Pen DOWN (Z${zDownMatch[1]}) at (${currentX}, ${currentY})`
          );
        return;
      }

      // Check for pen up (Z positive value means pen up)
      const zUpMatch = trimmed.match(/Z\s*([+]?\d*\.?\d+)/);
      if (zUpMatch && parseFloat(zUpMatch[1]) > 0) {
        if (isPenDown && currentPath.length > 0) {
          paths.push([...currentPath]);
          currentPath = [];
        }
        isPenDown = false;
        if (index < 30) console.log(`Line ${index}: Pen UP (Z${zUpMatch[1]})`);
        return;
      }

      // Also check for M3/M5 commands (alternative pen control)
      if (trimmed.match(/M0?3\b/)) {
        if (!isPenDown && currentPath.length > 0) {
          paths.push([...currentPath]);
          currentPath = [];
        }
        isPenDown = true;
        currentPath.push({ x: currentX, y: currentY });
        if (index < 30)
          console.log(
            `Line ${index}: Pen DOWN (M3) at (${currentX}, ${currentY})`
          );
        return;
      }

      if (trimmed.match(/M0?5\b/)) {
        if (isPenDown && currentPath.length > 0) {
          paths.push([...currentPath]);
          currentPath = [];
        }
        isPenDown = false;
        if (index < 30) console.log(`Line ${index}: Pen UP (M5)`);
        return;
      }

      // Parse coordinates
      const xMatch = trimmed.match(/X\s*([-+]?\d*\.?\d+)/);
      const yMatch = trimmed.match(/Y\s*([-+]?\d*\.?\d+)/);

      if (xMatch || yMatch) {
        if (xMatch) currentX = parseFloat(xMatch[1]);
        if (yMatch) currentY = parseFloat(yMatch[1]);

        allX.push(currentX);
        allY.push(currentY);

        if (isPenDown) {
          currentPath.push({ x: currentX, y: currentY });
        }
      }
    });

    // Add last path
    if (currentPath.length > 0) {
      paths.push(currentPath);
      console.log(`Added final path with ${currentPath.length} points`);
    }

    console.log("Parsed paths:", paths.length);
    console.log("Total points:", allX.length);
    console.log(
      "First few paths:",
      paths
        .slice(0, 3)
        .map((p) => ({ length: p.length, first: p[0], last: p[p.length - 1] }))
    );

    if (allX.length === 0) {
      ctx.fillStyle = "#666";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No valid G-code coordinates found", width / 2, height / 2);
      console.log("No coordinates found in G-code");
      return;
    }

    // Calculate bounds
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    console.log("Bounds:", { minX, maxX, minY, maxY });

    const gcodeWidth = maxX - minX || 1;
    const gcodeHeight = maxY - minY || 1;

    // Calculate scale to fit canvas with padding
    const padding = 60;
    const scaleX = (width - padding * 2) / gcodeWidth;
    const scaleY = (height - padding * 2) / gcodeHeight;
    const drawScale = Math.min(scaleX, scaleY) * scale;

    console.log("Draw scale:", drawScale);

    // Center the drawing
    const offsetX = (width - gcodeWidth * drawScale) / 2 - minX * drawScale;
    const offsetY = (height - gcodeHeight * drawScale) / 2 - minY * drawScale;

    // Transform function
    const transformX = (x) => x * drawScale + offsetX;
    const transformY = (y) => y * drawScale + offsetY; // Remove flip - use normal Y axis

    // Draw all paths
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    paths.forEach((path, pathIndex) => {
      if (path.length < 2) return;

      ctx.beginPath();
      const firstPoint = path[0];
      ctx.moveTo(transformX(firstPoint.x), transformY(firstPoint.y));

      for (let i = 1; i < path.length; i++) {
        const point = path[i];
        ctx.lineTo(transformX(point.x), transformY(point.y));
      }

      ctx.stroke();
    });

    console.log("Drawing complete!");

    // Draw bounds rectangle
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(
      transformX(minX),
      transformY(minY),
      gcodeWidth * drawScale,
      gcodeHeight * drawScale
    );
    ctx.setLineDash([]);

    // Draw coordinate labels
    ctx.fillStyle = "#059669";
    ctx.font = "12px monospace";
    ctx.fillText(
      `(${minX.toFixed(1)}, ${minY.toFixed(1)})`,
      transformX(minX) + 5,
      transformY(minY) + 15
    );
    ctx.fillText(
      `(${maxX.toFixed(1)}, ${maxY.toFixed(1)})`,
      transformX(maxX) - 80,
      transformY(maxY) - 5
    );
  };

  // Calculate stats
  const calculateStats = (gcodeText) => {
    const lines = gcodeText.split("\n").filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(";");
    });

    const pathMatches = gcodeText.match(/; Path \d+/g);
    const pathCount = pathMatches ? pathMatches.length : 0;
    const size = new Blob([gcodeText]).size;

    // Calculate estimated time (rough estimate)
    let totalDistance = 0;
    let currentX = 0,
      currentY = 0;

    lines.forEach((line) => {
      const xMatch = line.match(/X([-\d.]+)/);
      const yMatch = line.match(/Y([-\d.]+)/);

      if (xMatch || yMatch) {
        const newX = xMatch ? parseFloat(xMatch[1]) : currentX;
        const newY = yMatch ? parseFloat(yMatch[1]) : currentY;
        const dx = newX - currentX;
        const dy = newY - currentY;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
        currentX = newX;
        currentY = newY;
      }
    });

    const feedRate = 1500; // mm/min (default)
    const estimatedMinutes = totalDistance / feedRate;

    return {
      lines: lines.length,
      paths: pathCount,
      size: (size / 1024).toFixed(2),
      distance: totalDistance.toFixed(2),
      estimatedTime: estimatedMinutes.toFixed(2),
    };
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setGcode(content);
      setStats(calculateStats(content));
      drawGcode(content);
      toast.success("G-code loaded successfully!");
    };
    reader.readAsText(file);
  };

  // Handle text input
  const handleGcodeInput = (e) => {
    const content = e.target.value;
    setGcode(content);
    if (content.trim()) {
      setStats(calculateStats(content));
      drawGcode(content);
    }
  };

  // Handle copy
  const handleCopy = () => {
    navigator.clipboard.writeText(gcode);
    setCopied(true);
    toast.success("G-code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle download
  const handleDownload = () => {
    const blob = new Blob([gcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gcode-${Date.now()}.gcode`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("G-code downloaded!");
  };

  // Handle zoom
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.2));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  // Redraw when scale changes
  useEffect(() => {
    if (gcode) {
      drawGcode(gcode);
    }
  }, [scale]);

  // Initial canvas setup
  useEffect(() => {
    if (canvasRef.current && gcode) {
      drawGcode(gcode);
    }
  }, [gcode]);

  return (
    <div className="w-full h-full p-8 overflow-auto bg-base-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-primary/20">
          <div className="w-1 h-8 bg-primary rounded-full"></div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <FileCode2 className="w-8 h-8" />
            G-code Viewer
          </h2>
        </div>

        {/* Upload Section */}
        <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="btn btn-primary gap-2">
              <Upload className="w-5 h-5" />
              Upload G-code File
              <input
                type="file"
                accept=".gcode,.nc,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {gcode && (
              <>
                <button
                  onClick={handleCopy}
                  className="btn btn-secondary gap-2"
                >
                  {copied ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </button>

                <button
                  onClick={handleDownload}
                  className="btn btn-accent gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>

                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleZoomOut}
                    className="btn btn-sm btn-outline"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="btn btn-sm btn-outline"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="btn btn-sm btn-outline"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-title text-xs">Commands</div>
              <div className="stat-value text-2xl">{stats.lines}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-title text-xs">Paths</div>
              <div className="stat-value text-2xl">{stats.paths}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-title text-xs">File Size</div>
              <div className="stat-value text-xl">{stats.size} KB</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-title text-xs">Distance</div>
              <div className="stat-value text-xl">{stats.distance} mm</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-title text-xs">Est. Time</div>
              <div className="stat-value text-xl">
                {stats.estimatedTime} min
              </div>
            </div>
          </div>
        )}

        {/* Canvas and Code */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canvas Preview */}
          <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              Preview
            </h3>
            <canvas
              ref={canvasRef}
              width={800}
              height={800}
              className="w-full h-auto border border-base-300 rounded-lg bg-white"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>

          {/* G-code Editor */}
          <div className="bg-base-200 rounded-2xl p-6 shadow-xl border border-base-300">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              G-code
            </h3>
            <textarea
              value={gcode}
              onChange={handleGcodeInput}
              placeholder="Paste your G-code here or upload a file..."
              className="textarea textarea-bordered w-full h-[568px] font-mono text-sm bg-base-300"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GcodeViewerPage;
