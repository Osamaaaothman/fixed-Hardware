import { useState } from "react";
import { Upload, X } from "lucide-react";

const ImageUploader = ({ onImageSelect, selectedImage, onClear }) => {
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/bmp",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, GIF, or BMP)");
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target.result);
      };
      reader.readAsDataURL(file);

      // Pass file to parent
      onImageSelect(file);
    }
  };

  const handleClear = () => {
    setPreview(null);
    if (onClear) onClear();
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-base-300 rounded-2xl cursor-pointer bg-base-200 hover:bg-base-300 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-12 h-12 mb-3 text-base-content/50" />
            <p className="mb-2 text-sm text-base-content/70">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-base-content/50">
              PNG, JPG, GIF or BMP (MAX. 10MB)
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/bmp"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-64 object-contain rounded-2xl bg-base-200"
          />
          <button
            onClick={handleClear}
            className="btn btn-sm btn-circle btn-error absolute top-2 right-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {selectedImage && (
        <div className="text-sm text-base-content/60 space-y-1">
          <p>
            <span className="font-semibold">File:</span> {selectedImage.name}
          </p>
          <p>
            <span className="font-semibold">Size:</span>{" "}
            {(selectedImage.size / 1024).toFixed(2)} KB
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
