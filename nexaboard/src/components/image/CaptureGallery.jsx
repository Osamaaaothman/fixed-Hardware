import { useState } from "react";
import {
  Camera,
  Trash2,
  Image as ImageIcon,
  Calendar,
  FileSize,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { API_CONFIG } from "../../config/api.config";

const CaptureGallery = ({ captures, onSelect, onDelete, onRefresh }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSelect = (capture) => {
    setSelectedId(capture.id);
    onSelect(capture);
    toast.success(`Selected: ${capture.name}`);
  };

  const handleDelete = async (capture, e) => {
    e.stopPropagation();

    if (!confirm(`Delete "${capture.name}"?`)) {
      return;
    }

    try {
      await onDelete(capture.id);
      if (selectedId === capture.id) {
        setSelectedId(null);
      }
      toast.success("Capture deleted");
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete capture");
    }
  };

  const getImageUrl = (filename) => {
    return `${API_CONFIG.BASE_URL}/uploads/captures/${filename}`;
  };

  if (!captures || captures.length === 0) {
    return (
      <div className="text-center py-8 text-base-content/60">
        <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No captures yet</p>
        <p className="text-sm">Take a photo to get started</p>
      </div>
    );
  }

  const recentCaptures = captures.slice(0, 6);
  const hasMore = captures.length > 6;

  const CaptureCard = ({ capture, showFullInfo = false }) => (
    <div
      onClick={() => handleSelect(capture)}
      className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
        selectedId === capture.id
          ? "border-primary shadow-lg shadow-primary/20 scale-105"
          : "border-base-300 hover:border-primary/50 hover:shadow-md"
      }`}
    >
      {/* Image */}
      <div className="aspect-video bg-base-300 overflow-hidden">
        <img
          src={getImageUrl(capture.filename)}
          alt={capture.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          loading="lazy"
        />
      </div>

      {/* Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-base-100/90 via-base-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
        <div className="space-y-1">
          {showFullInfo && (
            <>
              <div className="flex items-center gap-2 text-xs text-base-content/80">
                <Calendar className="w-3 h-3" />
                {formatDate(capture.timestamp)}
              </div>
              <div className="flex items-center gap-2 text-xs text-base-content/80">
                <FileSize className="w-3 h-3" />
                {formatSize(capture.size)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selected Badge */}
      {selectedId === capture.id && (
        <div className="absolute top-2 left-2 bg-primary text-primary-content px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          SELECTED
        </div>
      )}

      {/* Delete Button */}
      <button
        onClick={(e) => handleDelete(capture, e)}
        className="absolute top-2 right-2 btn btn-sm btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete capture"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Name */}
      <div className="p-2 bg-base-200">
        <p className="text-sm font-semibold truncate" title={capture.name}>
          {capture.name}
        </p>
        {!showFullInfo && (
          <p className="text-xs text-base-content/60">
            {formatDate(capture.timestamp)}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {recentCaptures.map((capture) => (
          <CaptureCard key={capture.id} capture={capture} />
        ))}
      </div>

      {/* View All Button */}
      {hasMore && (
        <button
          onClick={() => setShowAllModal(true)}
          className="btn btn-outline btn-block gap-2"
        >
          <Eye className="w-4 h-4" />
          View All Captures ({captures.length})
        </button>
      )}

      {/* View All Modal */}
      {showAllModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl max-h-[90vh]">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Camera className="w-6 h-6 text-primary" />
              All Captures ({captures.length})
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto p-1">
              {captures.map((capture) => (
                <CaptureCard key={capture.id} capture={capture} showFullInfo />
              ))}
            </div>

            <div className="modal-action">
              <button
                onClick={() => setShowAllModal(false)}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setShowAllModal(false)}
          ></div>
        </div>
      )}
    </div>
  );
};

export default CaptureGallery;
