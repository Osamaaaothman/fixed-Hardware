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
          <div className="badge badge-ghost gap-2">
            <Circle className="w-3 h-3" />
            Pending
          </div>
        );
      case "processing":
        return (
          <div className="badge badge-info gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </div>
        );
      case "completed":
        return (
          <div className="badge badge-success gap-2">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </div>
        );
      case "failed":
        return (
          <div className="badge badge-error gap-2">
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
        return <ImageIcon className="w-4 h-4" />;
      case "text":
        return <FileCode className="w-4 h-4" />;
      default:
        return <FileCode className="w-4 h-4" />;
    }
  };

  return (
    <>
      <div
        className="group relative bg-white dark:bg-base-200 rounded-xl p-4 border-2 border-base-300 hover:border-primary transition-all"
        onDragOver={(e) => {
          e.preventDefault();
          if (onDragOver) onDragOver(e);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (onDrop) onDrop(e);
        }}
      >
        {/* Status Indicator Bar */}
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${
          item.status === "completed" ? "bg-success" :
          item.status === "processing" ? "bg-info" :
          item.status === "failed" ? "bg-error" :
          "bg-base-300"
        }`}></div>

        <div className="flex items-center gap-4 pl-2">
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
              <GripVertical className="w-5 h-5" />
            </div>
          )}

          {/* Preview Image */}
          {item.processedImage && (
            <div className="flex-shrink-0">
              <img
                src={item.processedImage}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border-2 border-base-300"
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${
                  item.type === "image" ? "bg-purple-100 dark:bg-purple-900/20" : "bg-blue-100 dark:bg-blue-900/20"
                }`}>
                  {getTypeIcon(item.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-base-content text-sm">
                    {item.type === "image" ? "Image" : item.type === "text" ? "Text" : "Drawing"}
                  </h3>
                  <p className="text-xs text-base-content/50">
                    {formatTime(item.timestamp)}
                  </p>
                </div>
              </div>

              {/* Status Badge - Minimal */}
              {item.status === "processing" && (
                <div className="flex items-center gap-1 text-info text-xs font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Processing</span>
                </div>
              )}
              {item.status === "completed" && (
                <div className="flex items-center gap-1 text-success text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
              )}
              {item.status === "failed" && (
                <div className="flex items-center gap-1 text-error text-xs font-medium">
                  <XCircle className="w-3 h-3" />
                </div>
              )}
            </div>

            {/* Stats Row */}
            {item.stats && (
              <div className="flex items-center gap-4 text-xs text-base-content/60 mb-3">
                {item.stats.totalLines && (
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{item.stats.totalLines} lines</span>
                  </div>
                )}
                {item.stats.estimatedTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.stats.estimatedTime}</span>
                  </div>
                )}
              </div>
            )}

            {/* Processing Progress */}
            {item.status === "processing" && item.stats?.totalLines && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-base-content/60">Progress</span>
                  <span className="text-base-content/60 font-medium">
                    {Math.round((item.currentLine / item.stats.totalLines) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-info h-full transition-all duration-300"
                    style={{ width: `${(item.currentLine / item.stats.totalLines) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {item.error && (
              <div className="mb-3 p-2 bg-error/10 border border-error/20 rounded-lg text-xs text-error">
                {item.error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewGcode && onViewGcode(item)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                View Code
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="text-xs text-error hover:underline flex items-center gap-1"
                disabled={item.status === "processing"}
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QueueItem;
