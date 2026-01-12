import { useState, useEffect } from "react";
import { Camera, X, AlertCircle } from "lucide-react";

const CaptureModal = ({ isOpen, onClose, onCapture, isLoading = false }) => {
  const [imageName, setImageName] = useState("");
  const [error, setError] = useState("");

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImageName("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!imageName.trim()) {
      setError("Please enter an image name");
      return;
    }

    if (imageName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    onCapture(imageName.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md bg-gradient-to-br from-base-100 to-base-200 border-2 border-primary/20">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 pt-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
            <div className="relative bg-primary/10 p-4 rounded-full border-2 border-primary/30">
              <Camera className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mt-4 text-center">
            Save Captured Image
          </h3>
          <p className="text-base-content/70 text-sm mt-2 text-center">
            Enter a name for this capture
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Image Name Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Image Name</span>
            </label>
            <input
              type="text"
              value={imageName}
              onChange={(e) => {
                setImageName(e.target.value);
                setError("");
              }}
              placeholder="e.g., Drawing 1, Portrait, Sketch..."
              className="input input-bordered w-full focus:input-primary"
              autoFocus
              disabled={isLoading}
              maxLength={50}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/60">
                {imageName.length}/50 characters
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline flex-1 gap-2"
              disabled={isLoading}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 gap-2"
              disabled={isLoading || !imageName.trim()}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Save Capture
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <div
        className="modal-backdrop"
        onClick={!isLoading ? onClose : undefined}
      ></div>
    </div>
  );
};

export default CaptureModal;
