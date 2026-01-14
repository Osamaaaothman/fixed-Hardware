import { useState } from "react";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import PropTypes from "prop-types";

const ImageUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      handleFile(droppedFile);
    } else {
      toast.error("Please drop an image file");
    }
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleFile = (file) => {
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (file) {
      onUpload(file);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setDragActive(false);
    onClose();
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Upload Image</h3>
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <X size={20} />
          </button>
        </div>

        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
            dragActive
              ? "border-primary bg-primary/10"
              : "border-base-300 hover:border-primary/50"
          }`}
        >
          {preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 mx-auto rounded border border-base-300"
              />
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="btn btn-sm btn-ghost"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-base-content/50" />
                </div>
              </div>
              <div>
                <p className="text-base-content/70 mb-2">
                  Drag and drop an image here, or click to select
                </p>
                <p className="text-xs text-base-content/50">
                  Supports: JPG, PNG, GIF (max 10MB)
                </p>
              </div>
              <label
                htmlFor="file-input"
                className="btn btn-primary btn-sm gap-2"
              >
                <Upload size={16} />
                Choose File
              </label>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Info Alert */}
        <div className="alert alert-info mt-4 py-2">
          <AlertCircle size={16} />
          <span className="text-xs">
            Images will be converted to line art for CNC drawing
          </span>
        </div>

        {/* Actions */}
        <div className="modal-action">
          <button onClick={handleClose} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file}
            className="btn btn-primary"
          >
            Upload & Process
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
};

ImageUploadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
};

export default ImageUploadModal;
