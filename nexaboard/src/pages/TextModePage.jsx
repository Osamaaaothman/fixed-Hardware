import { useState, useRef, useEffect } from "react";
import TextareaComponent from "../components/TextareaComponent";
import GenerateButton from "../components/GenerateButton";
import AddToQueueButton from "../components/AddToQueueButton";
import DrawNowButton from "../components/DrawNowButton";
import TextPreviewCanvas from "../components/TextPreviewCanvas";
import {
  convertTextToGcode,
  fetchFonts,
  fetchFont,
  previewTextBounds,
} from "../api/textApi";
import { addToQueue } from "../api/queueApi";
import { toast } from "sonner";

const TextModePage = () => {
  const fontSize = 5; // Fixed 5mm
  const [selectedFont] = useState(0); // Always use first font (simplex)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fonts, setFonts] = useState([]);
  const [currentFontData, setCurrentFontData] = useState(null);
  const [previewText, setPreviewText] = useState("");
  const [textBounds, setTextBounds] = useState(null);
  const [gcode, setGcode] = useState("");
  const [stats, setStats] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const textareaRef = useRef(null);

  // Load fonts on mount
  useEffect(() => {
    async function loadFonts() {
      try {
        const fontList = await fetchFonts();
        // Filter to show only simplex font
        const simplexOnly = fontList.filter((f) => f.id === "simplex");
        setFonts(simplexOnly.length > 0 ? simplexOnly : fontList);
      } catch (err) {
        console.error("Failed to load fonts:", err);
        // Fallback fonts
        setFonts([
          {
            id: "simplex",
            name: "Hershey Simplex",
            description: "Simple thin font",
          },
          {
            id: "complex",
            name: "Hershey Complex",
            description: "Thick bold font",
          },
          {
            id: "script",
            name: "Hershey Script",
            description: "Elegant cursive",
          },
          {
            id: "sans",
            name: "Hershey Sans",
            description: "Modern sans-serif",
          },
        ]);
      }
    }
    loadFonts();
  }, []);

  // Load selected font data for preview
  useEffect(() => {
    async function loadSelectedFont() {
      if (fonts.length === 0) return;

      const selectedFontId = fonts[selectedFont]?.id || "simplex";

      try {
        const fontData = await fetchFont(selectedFontId);
        setCurrentFontData(fontData);
      } catch (err) {
        console.error("Failed to load font data:", err);
      }
    }

    loadSelectedFont();
  }, [selectedFont, fonts]);

  // Calculate text bounds for dimension display
  useEffect(() => {
    async function calculateBounds() {
      if (
        !previewText ||
        !fonts[selectedFont]?.id ||
        previewText.trim() === ""
      ) {
        setTextBounds(null);
        return;
      }

      try {
        const selectedFontId = fonts[selectedFont]?.id || "simplex";
        const bounds = await previewTextBounds({
          text: previewText,
          font: selectedFontId,
          size: fontSize,
          spacing: 0.5,
        });
        setTextBounds(bounds);
      } catch (err) {
        console.error("Failed to calculate bounds:", err);
      }
    }

    calculateBounds();
  }, [previewText, fontSize, selectedFont, fonts]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const text = textareaRef.current?.getText();

      if (!text || text.trim() === "") {
        setError("Please enter some text first");
        setIsGenerating(false);
        return;
      }

      const selectedFontId = fonts[selectedFont]?.id || "simplex";

      const result = await convertTextToGcode({
        text,
        font: selectedFontId,
        size: fontSize,
        spacing: 0.5,
        lineSpacing: 1.5,
        feedRate: 1500,
        penUp: -2.3,
        penDown: 0,
        alignment: "left",
      });

      setGcode(result.gcode);
      setStats(result.stats);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Error generating G-code:", err);
      setError(err.message || "Failed to generate G-code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToQueue = async () => {
    try {
      if (!gcode) {
        toast.error("Please generate G-code first");
        return;
      }

      await addToQueue({
        gcode,
        stats,
        type: "text",
        settings: {
          font: fonts[selectedFont]?.name || "Hershey Simplex",
          size: fontSize,
          color: "#000000",
        },
      });

      toast.success("Added to queue successfully!");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding to queue:", error);
      toast.error(error.message || "Failed to add to queue");
    }
  };

  const handleCopyGcode = () => {
    if (!gcode) {
      toast.error("No G-code to copy");
      return;
    }

    navigator.clipboard
      .writeText(gcode)
      .then(() => {
        toast.success("✅ G-code copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy G-code");
      });
  };

  return (
    <div className="w-full h-full p-6 overflow-auto bg-gradient-to-br from-base-100 to-base-200">
      <div className="max-w-[1400px] mx-auto space-y-4">
        {/* Header */}
        <div className="bg-base-100/80 backdrop-blur-sm rounded-3xl p-5 shadow-2xl border-2 border-primary/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Text Mode
              </h2>
              <p className="text-base-content/50 text-sm mt-0.5">
                Convert your text to G-code for drawing
              </p>
            </div>
          </div>
        </div>

        {/* Text Input Section */}
        <div className="bg-base-100/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border-2 border-base-300/50">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-primary/10">
            <h2 className="text-lg font-semibold text-base-content/80">
              ✍️ Your Text
            </h2>
            <div className="flex flex-col items-end gap-2">
              {error && (
                <div className="alert alert-error py-2 px-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-5 w-5"
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
                  <span className="text-sm">{error}</span>
                </div>
              )}
              <GenerateButton
                onClick={handleGenerate}
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <TextareaComponent
              ref={textareaRef}
              fontSize={24}
              textColor="#000000"
              onTextChange={setPreviewText}
            />

            <div className="flex flex-col gap-4">
              {currentFontData && (
                <TextPreviewCanvas
                  text={previewText}
                  fontData={currentFontData}
                  fontSize={fontSize}
                  textColor="#000000"
                />
              )}

              {/* Dimensions Display */}
              {textBounds &&
                textBounds.width !== undefined &&
                textBounds.height !== undefined && (
                  <div
                    className={`bg-gradient-to-br rounded-2xl p-4 border-2 shadow-lg ${
                      textBounds.exceedsLimits
                        ? "from-error/10 to-error/5 border-error/50"
                        : "from-success/10 to-success/5 border-success/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={`p-2 rounded-lg ${
                          textBounds.exceedsLimits
                            ? "bg-error/20"
                            : "bg-success/20"
                        }`}
                      >
                        <svg
                          className={`w-5 h-5 ${
                            textBounds.exceedsLimits
                              ? "text-error"
                              : "text-success"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold">📏 Dimensions</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="bg-base-100/50 rounded-lg p-2 flex justify-between items-center">
                        <span className="font-medium text-base-content/60">
                          ↔️ Width
                        </span>
                        <span
                          className={`font-mono font-bold text-base px-2 py-1 rounded ${
                            textBounds.width > (textBounds.maxWidth || 95)
                              ? "text-error bg-error/10"
                              : "text-success bg-success/10"
                          }`}
                        >
                          {textBounds.width.toFixed(1)} /{" "}
                          {textBounds.maxWidth || 95} mm
                        </span>
                      </div>
                      <div className="bg-base-100/50 rounded-lg p-2 flex justify-between items-center">
                        <span className="font-medium text-base-content/60">
                          ↕️ Height
                        </span>
                        <span
                          className={`font-mono font-bold text-base px-2 py-1 rounded ${
                            textBounds.height > (textBounds.maxHeight || 130)
                              ? "text-error bg-error/10"
                              : "text-success bg-success/10"
                          }`}
                        >
                          {textBounds.height.toFixed(1)} /{" "}
                          {textBounds.maxHeight || 130} mm
                        </span>
                      </div>
                      {textBounds.exceedsLimits && (
                        <div className="mt-3 p-3 bg-error/20 rounded-lg border border-error/30">
                          <p className="text-error text-xs font-semibold flex items-center gap-1">
                            <span>⚠️</span> Text exceeds CNC limits! Reduce text
                            length.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
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
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Lines:</span>
                  <span className="badge badge-primary">
                    {stats?.lines || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Paths:</span>
                  <span className="badge badge-secondary">
                    {stats?.paths || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Characters:</span>
                  <span className="badge badge-accent">
                    {stats?.characters || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Distance:</span>
                  <span className="badge badge-info">
                    {typeof stats?.distance === "number"
                      ? stats.distance.toFixed(1)
                      : stats?.distance || 0}{" "}
                    mm
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Est. Time:</span>
                  <span className="badge badge-success">
                    {typeof stats?.estimatedTime === "number"
                      ? stats.estimatedTime.toFixed(1)
                      : stats?.estimatedTime || 0}
                    s
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Size:</span>
                  <span className="badge badge-warning">
                    {typeof stats?.size?.width === "number"
                      ? stats.size.width.toFixed(1)
                      : stats?.size?.width || 0}{" "}
                    ×{" "}
                    {typeof stats?.size?.height === "number"
                      ? stats.size.height.toFixed(1)
                      : stats?.size?.height || 0}{" "}
                    mm
                  </span>
                </div>
              </div>
            </div>

            {/* G-code Textarea */}
            <div className="flex-1 p-6 overflow-hidden">
              <textarea
                className="textarea textarea-bordered w-full h-full font-mono text-sm resize-none bg-base-200 focus:outline-none focus:border-primary"
                placeholder="G-code will appear here..."
                value={gcode}
                readOnly
              ></textarea>
            </div>

            {/* Modal Footer with Action Buttons */}
            <div className="px-6 py-4 bg-base-200 border-t border-base-300">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCopyGcode}
                  className="btn btn-outline btn-primary gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy G-code
                </button>
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

export default TextModePage;
