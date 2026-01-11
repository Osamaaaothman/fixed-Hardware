import { useState, useRef } from "react";
import "./ImageUploader.css";

function ImageUploader({ onUpload, isLoading }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];

    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile && onUpload) {
      onUpload(selectedFile);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="image-uploader">
      <h2>Upload Image</h2>

      <div className="upload-area">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          disabled={isLoading}
          className="file-input"
          id="file-input"
        />
        <label htmlFor="file-input" className="file-label">
          {selectedFile ? selectedFile.name : "Choose an image file"}
        </label>
      </div>

      {previewUrl && (
        <div className="preview-container">
          <h3>Preview</h3>
          <img src={previewUrl} alt="Preview" className="preview-image" />
        </div>
      )}

      <div className="button-group">
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isLoading}
          className="btn btn-primary"
        >
          {isLoading ? "Converting..." : "Generate G-code"}
        </button>

        {selectedFile && !isLoading && (
          <button onClick={handleClear} className="btn btn-secondary">
            Clear
          </button>
        )}
      </div>

      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Processing image... This may take a moment.</p>
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
