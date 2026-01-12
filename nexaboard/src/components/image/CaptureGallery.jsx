import { useState } from "react";
import {
  Camera,
  Trash2,
  Image as ImageIcon,
  Calendar,
  FileText,
  Eye,
  Download,
  X,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { API_CONFIG } from "../../config/api.config";

const CaptureGallery = ({ captures, onSelect, onDelete, onRefresh }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [showAllModal, setShowAllModal] = useState(false);
  const [viewImageModal, setViewImageModal] = useState(null);

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

  const handleViewImage = (capture, e) => {
    e.stopPropagation();
    setViewImageModal(capture);
  };

  const handleDownload = async (capture) => {
    try {
      const imageUrl = getImageUrl(capture.filename);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${capture.name}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (error) {
      toast.error("Failed to download image");
    }
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
      <div className="absolute inset-0 bg-gradient-to-t from-base-100/90 via-base-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
        {/* View Button */}
        <div className="flex justify-center items-center flex-1">
          <button
            onClick={(e) => handleViewImage(capture, e)}
            className="btn btn-primary btn-circle btn-lg shadow-lg"
            title="View full size"
          >
            <Maximize2 className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-1">
          {showFullInfo && (
            <>
              <div className="flex items-center gap-2 text-xs text-base-content/80">
                <Calendar className="w-3 h-3" />
                {formatDate(capture.timestamp)}
              </div>
              <div className="flex items-center gap-2 text-xs text-base-content/80">
                <FileText className="w-3 h-3" />
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

      {/* Image View Modal */}
      {viewImageModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-6xl bg-base-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <ImageIcon className="w-6 h-6 text-primary" />
                  {viewImageModal.name}
                </h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {formatDate(viewImageModal.timestamp)} • {formatSize(viewImageModal.size)}
                </p>
              </div>
              <button
                onClick={() => setViewImageModal(null)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image */}
            <div className="bg-base-300 rounded-xl overflow-hidden mb-4">
              <img
                src={getImageUrl(viewImageModal.filename)}
                alt={viewImageModal.name}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(viewImageModal)}
                className="btn btn-primary flex-1 gap-2"
              >
                <Download className="w-5 h-5" />
                Download Image
              </button>
              <button
                onClick={() => {
                  handleSelect(viewImageModal);
                  setViewImageModal(null);
                }}
                className="btn btn-success flex-1 gap-2"
              >
                <ImageIcon className="w-5 h-5" />
                Select for Conversion
              </button>
              <button
                onClick={async (e) => {
                  await handleDelete(viewImageModal, e);
                  setViewImageModal(null);
                }}
                className="btn btn-error gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setViewImageModal(null)}
          ></div>
        </div>
      )}
    </div>
  );
};

export default CaptureGallery;
