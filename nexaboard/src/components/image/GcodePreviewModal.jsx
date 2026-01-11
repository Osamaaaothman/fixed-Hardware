import { useState } from "react";
import { X, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import AddToQueueButton from "../AddToQueueButton";
import DrawNowButton from "../DrawNowButton";
import StatsDisplay from "./StatsDisplay";
import { addToQueue } from "../../api/queueApi";
import SerialLogModal from "../SerialLogModal";

const GcodePreviewModal = ({
  isOpen,
  onClose,
  gcode,
  stats,
  processedImage,
  settings,
}) => {
  const [isSerialLogOpen, setIsSerialLogOpen] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(gcode);
    toast.success("G-code copied to clipboard!");
  };

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

  const handleAddToQueue = async () => {
    try {
      const queueItem = {
        type: "image",
        gcode,
        stats,
        processedImage,
        settings,
        image: null,
      };

      await addToQueue(queueItem);
      toast.success("Added to queue successfully!");
    } catch (error) {
      console.error("Error adding to queue:", error);
      toast.error(`Failed to add to queue: ${error.message}`);
    }
  };

  const handleDrawNow = () => {
    setIsSerialLogOpen(true);
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-6xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <div>
            <h3 className="font-bold text-2xl">G-code Preview</h3>
            <p className="text-sm text-base-content/60 mt-1">
              Generated from image vectorization
            </p>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="px-6 py-4 bg-base-200 border-b border-base-300">
            <StatsDisplay stats={stats} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* G-code Viewer */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-lg">G-code</h4>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="btn btn-sm btn-ghost gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="btn btn-sm btn-ghost gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
            <textarea
              value={gcode}
              readOnly
              className="textarea textarea-bordered w-full h-[calc(100%-3rem)] font-mono text-sm"
              style={{ resize: "none" }}
            />
          </div>

          {/* Processed Image Preview */}
          {processedImage && (
            <div className="w-full md:w-80 p-6 border-t md:border-t-0 md:border-l border-base-300">
              <h4 className="font-semibold text-lg mb-3">Processed Image</h4>
              <img
                src={processedImage}
                alt="Processed"
                className="w-full rounded-lg bg-base-200"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-base-200 border-t border-base-300">
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn btn-ghost">
              Close
            </button>
            <AddToQueueButton onClick={handleAddToQueue} />
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose}></div>

      {/* Serial Log Modal */}
      <SerialLogModal
        isOpen={isSerialLogOpen}
        onClose={() => setIsSerialLogOpen(false)}
        gcode={gcode}
        port="COM4"
      />
    </div>
  );
};

export default GcodePreviewModal;
