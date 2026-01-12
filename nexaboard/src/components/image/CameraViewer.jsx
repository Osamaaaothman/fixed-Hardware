import { useState, useEffect } from "react";
import { Camera, WifiOff, AlertCircle } from "lucide-react";

const CameraViewer = ({ streamUrl, className = "" }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Reset states when stream URL changes
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
  }, [streamUrl]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setIsLoading(true);
    setHasError(false);
  };

  return (
    <div
      className={`relative bg-base-300 rounded-xl overflow-hidden ${className}`}
    >
      {/* Loading State */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-300 z-10">
          <Camera className="w-16 h-16 text-primary/50 animate-pulse mb-4" />
          <p className="text-base-content/70">Connecting to camera...</p>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-300 z-10">
          <WifiOff className="w-16 h-16 text-error mb-4" />
          <p className="text-error font-semibold mb-2">
            Camera Connection Failed
          </p>
          <p className="text-base-content/70 text-sm mb-4 text-center px-4">
            Unable to connect to ESP32 camera
            <br />
            Check if the camera is powered on and connected
          </p>
          <button
            onClick={handleRetry}
            className="btn btn-sm btn-primary gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      )}

      {/* Camera Stream */}
      <img
        key={retryCount} // Force reload on retry
        src={streamUrl}
        alt="ESP32 Camera Stream"
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`w-full h-full object-contain ${
          isLoading || hasError ? "opacity-0" : "opacity-100"
        } transition-opacity duration-300`}
        crossOrigin="anonymous"
      />

      {/* Camera Indicator */}
      {!isLoading && !hasError && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-success/90 text-success-content px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
          <div className="w-2 h-2 bg-success-content rounded-full animate-pulse"></div>
          LIVE
        </div>
      )}
    </div>
  );
};

export default CameraViewer;
