import { useState, useRef } from "react";
import { FabricImage, FabricText, PencilBrush } from "fabric";
import DrawingBoard from "../components/draw/DrawingBoard";
import Toolbar from "../components/draw/Toolbar";
import GenerateButton from "../components/GenerateButton";
import AddToQueueButton from "../components/AddToQueueButton";
import DrawNowButton from "../components/DrawNowButton";
import { API_CONFIG } from "../config/api.config.js";

const DrawPage = () => {
  const canvasRef = useRef(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gcode, setGcode] = useState("");
  const [stats, setStats] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleCanvasReady = (canvas) => {
    // Set initial brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = selectedColor;
    canvas.freeDrawingBrush.width = 2;
  };

  const handleFreeDrawClick = () => {
    if (!canvasRef.current) return;

    const newDrawingMode = !isDrawingMode;
    setIsDrawingMode(newDrawingMode);
    setIsEraserMode(false);

    canvasRef.current.isDrawingMode = newDrawingMode;
    if (newDrawingMode) {
      canvasRef.current.freeDrawingBrush = new PencilBrush(canvasRef.current);
      canvasRef.current.freeDrawingBrush.color = selectedColor;
      canvasRef.current.freeDrawingBrush.width = 2;
    }
  };

  const handleEraseClick = () => {
    if (!canvasRef.current) return;

    const newEraserMode = !isEraserMode;
    setIsEraserMode(newEraserMode);
    setIsDrawingMode(false);

    if (newEraserMode) {
      canvasRef.current.isDrawingMode = true;
      const brush = new PencilBrush(canvasRef.current);
      brush.width = 10;
      brush.color = "#ffffff"; // Use white color to erase
      canvasRef.current.freeDrawingBrush = brush;
    } else {
      canvasRef.current.isDrawingMode = false;
    }
  };

  const handleAddText = () => {
    if (!canvasRef.current) return;

    const text = new FabricText("Double click to edit", {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: selectedColor,
      fontFamily: "Arial",
    });

    canvasRef.current.add(text);
    canvasRef.current.setActiveObject(text);
    canvasRef.current.renderAll();
  };

  const handleAddImage = (imageUrl) => {
    if (!canvasRef.current) return;

    FabricImage.fromURL(imageUrl).then((img) => {
      img.scale(0.5);
      img.set({
        left: 50,
        top: 50,
      });
      canvasRef.current.add(img);
      canvasRef.current.renderAll();
    });
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    if (!canvasRef.current) return;

    if (canvasRef.current.isDrawingMode && !isEraserMode) {
      canvasRef.current.freeDrawingBrush.color = color;
    }

    const activeObject = canvasRef.current.getActiveObject();
    if (activeObject && activeObject.type === "i-text") {
      activeObject.set("fill", color);
      canvasRef.current.renderAll();
    }
  };

  const handleClearBoard = () => {
    if (!canvasRef.current) return;
    canvasRef.current.clear();
    canvasRef.current.backgroundColor = "#ffffff";
    canvasRef.current.renderAll();
  };

  const handleGenerate = async () => {
    if (!canvasRef.current) return;

    setIsGenerating(true);
    setError("");

    try {
      // Export canvas data as JSON
      const canvasData = canvasRef.current.toJSON();

      // Debug: log all objects
      console.log(
        `[DrawPage] Canvas has ${canvasData.objects.length} objects:`
      );
      canvasData.objects.forEach((obj, i) => {
        console.log(`  Object ${i}: type="${obj.type}", hasPath=${!!obj.path}`);
      });

      // Check if canvas has any drawable content
      const pathObjects = canvasData.objects.filter(
        (obj) =>
          obj.type?.toLowerCase() === "path" && obj.path && obj.path.length > 0
      );

      console.log(`[DrawPage] Found ${pathObjects.length} path objects`);

      if (pathObjects.length === 0) {
        setError("Please draw something on the canvas first!");
        setIsGenerating(false);
        return;
      }

      console.log(`[DrawPage] Sending ${pathObjects.length} paths to backend`);

      // Call backend API to convert canvas to G-code
      const response = await fetch(`${API_CONFIG.ENDPOINTS.DRAW}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ canvasData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate G-code");
      }

      const data = await response.json();

      if (data.success) {
        setGcode(data.gcode);
        setStats(data.stats);
        setIsModalOpen(true);
        console.log("[DrawPage] G-code generated successfully:", data.stats);
      } else {
        throw new Error(data.error || "Unknown error occurred");
      }
    } catch (err) {
      console.error("[DrawPage] Error generating G-code:", err);
      setError(err.message || "Failed to generate G-code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!gcode || !stats) return;

    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.QUEUE}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "drawing",
          name: `Drawing ${new Date().toLocaleTimeString()}`,
          gcode: gcode,
          estimatedTime: stats.estimatedTime,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add to queue");
      }

      const data = await response.json();
      console.log("[DrawPage] Added to queue:", data);

      // Close modal and show success
      setIsModalOpen(false);
    } catch (err) {
      console.error("[DrawPage] Error adding to queue:", err);
      setError("Failed to add to queue: " + err.message);
    }
  };

  const handleDrawNow = async () => {
    if (!gcode) return;

    try {
      const response = await fetch(`${API_CONFIG.ENDPOINTS.SERIAL}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gcode: gcode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send G-code");
      }

      console.log("[DrawPage] Drawing now...");
      setIsModalOpen(false);
    } catch (err) {
      console.error("[DrawPage] Error sending G-code:", err);
      setError("Failed to start drawing: " + err.message);
    }
  };

  const handleCopyGcode = async () => {
    try {
      await navigator.clipboard.writeText(gcode);
      // You can add a toast notification here if you want
      console.log("[DrawPage] G-code copied to clipboard");
    } catch (err) {
      console.error("[DrawPage] Error copying G-code:", err);
    }
  };

  return (
    <div className="w-full h-full p-8 overflow-auto bg-base-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Tools Section */}
        <div className="bg-base-200 rounded-2xl p-8 shadow-xl border border-base-300">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-primary/20">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            <h2 className="text-3xl font-bold">Drawing Tools</h2>
          </div>

          <Toolbar
            isDrawingMode={isDrawingMode}
            isEraserMode={isEraserMode}
            onFreeDrawClick={handleFreeDrawClick}
            onEraseClick={handleEraseClick}
            onClearBoard={handleClearBoard}
          />
        </div>

        {/* Canvas Section */}
        <div className="bg-base-200 rounded-2xl p-8 shadow-xl border border-base-300">
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full"></div>
              <h2 className="text-3xl font-bold">Canvas</h2>
            </div>
            <GenerateButton onClick={handleGenerate} disabled={isGenerating} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <DrawingBoard
            canvasRef={canvasRef}
            onCanvasReady={handleCanvasReady}
          />
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl h-[85vh] flex flex-col p-0 bg-base-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-base-300">
              <div>
                <h3 className="font-bold text-2xl">G-code Preview</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  Review and manage your generated G-code
                </p>
              </div>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setIsModalOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* G-code Info */}
            <div className="px-6 py-3 bg-base-200 border-b border-base-300">
              <div className="flex gap-6 text-sm flex-wrap items-center justify-between">
                <div className="flex gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Lines:</span>
                    <span className="badge badge-primary">
                      {stats?.lineCount || gcode.split("\n").length}
                    </span>
                  </div>
                  {stats && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Paths:</span>
                        <span className="badge badge-secondary">
                          {stats.pathCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Distance:</span>
                        <span className="badge badge-accent">
                          {stats.totalDistance} mm
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Est. Time:</span>
                        <span className="badge badge-info">
                          {stats.estimatedTime} min
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Copy Button */}
                <button
                  onClick={handleCopyGcode}
                  className="btn btn-sm btn-ghost gap-2"
                  title="Copy G-code"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </button>
              </div>
            </div>

            {/* G-code Textarea */}
            <div className="flex-1 p-6 overflow-hidden">
              <textarea
                className="textarea textarea-bordered w-full h-full font-mono text-sm resize-none bg-base-200 focus:outline-none focus:border-primary"
                value={gcode}
                readOnly
              ></textarea>
            </div>

            {/* Modal Footer with Action Buttons */}
            <div className="px-6 py-4 bg-base-200 border-t border-base-300">
              <div className="flex gap-3 justify-end">
                <AddToQueueButton onClick={handleAddToQueue} />
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/60"
            onClick={() => setIsModalOpen(false)}
          ></div>
        </div>
      )}
    </div>
  );
};

export default DrawPage;
