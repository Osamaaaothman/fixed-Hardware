import { useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  FileCode,
  Image as ImageIcon,
  Trash2,
  GripVertical,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Eye,
  FileText,
  Pencil,
  Copy,
  Download,
} from "lucide-react";

const QueueItem = ({
  item,
  onDelete,
  onViewGcode,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggable = true,
}) => {
  const [showGcodeModal, setShowGcodeModal] = useState(false);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <div className="badge badge-sm badge-ghost gap-1">
            <Circle className="w-3 h-3" />
            Pending
          </div>
        );
      case "processing":
        return (
          <div className="badge badge-sm badge-info gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </div>
        );
      case "completed":
        return (
          <div className="badge badge-sm badge-success gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </div>
        );
      case "failed":
        return (
          <div className="badge badge-sm badge-error gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </div>
        );
      default:
        return null;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-5 h-5" />;
      case "text":
        return <FileText className="w-5 h-5" />;
      case "pen":
        return <Pencil className="w-5 h-5" />;
      default:
        return <FileCode className="w-5 h-5" />;
    }
  };

  const isPen = item.type === "pen";

  const handleCopyGcode = () => {
    if (item.gcode) {
      navigator.clipboard.writeText(item.gcode.join("\n"));
      toast.success("G-code copied to clipboard");
    }
  };

  const handleDownloadGcode = () => {
    if (item.gcode) {
      const blob = new Blob([item.gcode.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.name || "gcode"}.gcode`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("G-code downloaded");
    }
  };

  return (
    <>
      <div
        className={`bg-base-100 rounded-lg border hover:shadow-md transition-all ${
          isPen
            ? "border-l-4 border-l-primary border-r border-t border-b border-base-300"
            : "border border-base-300"
        } ${item.status === "processing" ? "ring-2 ring-primary" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (onDragOver) onDragOver(e);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (onDrop) onDrop(e);
        }}
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Drag Handle */}
              {draggable && item.status === "pending" && (
                <div
                  className="cursor-grab active:cursor-grabbing text-base-content/20 hover:text-primary transition-colors"
                  draggable={true}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    if (onDragStart) onDragStart(e);
                  }}
                  onDragEnd={(e) => {
                    e.stopPropagation();
                    if (onDragEnd) onDragEnd(e);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-4 h-4" />
                </div>
              )}

              {/* Icon */}
              <div
                className={`p-2 rounded ${
                  isPen ? "bg-primary/10 text-primary" : "bg-base-200"
                }`}
              >
                {getTypeIcon(item.type)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {isPen
                    ? item.name || "Pen Drawing"
                    : item.type === "image"
                    ? "Image"
                    : item.type === "text"
                    ? "Text"
                    : "Drawing"}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="badge badge-xs">
                    {isPen ? item.penType || "pen" : item.type}
                  </span>
                  {getStatusBadge(item.status)}
                  <span className="text-xs text-base-content/50">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={() => onDelete(item.id)}
              className="btn btn-xs btn-ghost btn-circle text-error"
              disabled={item.status === "processing"}
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Preview Image */}
          {item.processedImage && (
            <div className="mb-3">
              <img
                src={item.processedImage}
                alt="Preview"
                className="w-full h-24 object-cover rounded border border-base-300"
              />
            </div>
          )}

          {/* Stats */}
          {item.stats && (
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              {(item.stats.totalLines || item.stats.lines) && (
                <div className="flex items-center gap-1.5 text-base-content/70">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{item.stats.totalLines || item.stats.lines} lines</span>
                </div>
              )}
              {item.stats.estimatedTime && (
                <div className="flex items-center gap-1.5 text-base-content/70">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.stats.estimatedTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {item.status === "processing" && item.stats?.totalLines && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-base-content/60">Progress</span>
                <span className="font-medium">
                  {Math.round((item.currentLine / item.stats.totalLines) * 100)}
                  %
                </span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={item.currentLine}
                max={item.stats.totalLines}
              ></progress>
            </div>
          )}

          {/* Error Message */}
          {item.error && (
            <div className="alert alert-error mb-3 py-2 text-xs">
              <XCircle size={14} />
              <span>{item.error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGcodeModal(true)}
              className="btn btn-xs btn-ghost gap-1"
            >
              <Eye size={14} />
              View
            </button>
            <button
              onClick={handleCopyGcode}
              className="btn btn-xs btn-ghost gap-1"
            >
              <Copy size={14} />
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* G-code Modal */}
      {showGcodeModal && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">G-code Preview</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {item.name || item.type} • {item.gcode?.length || 0} lines
                </p>
              </div>
              <button
                onClick={() => setShowGcodeModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            {/* G-code Content */}
            <div className="bg-base-200 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm mb-4">
              {item.gcode?.map((line, i) => (
                <div
                  key={i}
                  className="flex gap-3 hover:bg-base-300 px-2 py-0.5 rounded"
                >
                  <span className="text-base-content/40 select-none w-12 text-right shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-base-content">{line}</span>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2">
              <button onClick={handleCopyGcode} className="btn btn-sm gap-2">
                <Copy size={16} />
                Copy All
              </button>
              <button
                onClick={handleDownloadGcode}
                className="btn btn-sm gap-2"
              >
                <Download size={16} />
                Download
              </button>
              <button
                onClick={() => setShowGcodeModal(false)}
                className="btn btn-sm btn-primary"
              >
                Close
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowGcodeModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </>
  );
};

export default QueueItem;
