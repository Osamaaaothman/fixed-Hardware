import { useState, useEffect } from "react";
import { Camera, Image } from "lucide-react";
import { toast } from "sonner";
import CameraViewer from "../components/image/CameraViewer";
import CaptureModal from "../components/image/CaptureModal";
import CaptureGallery from "../components/image/CaptureGallery";
import {
  getStreamUrl,
  captureImage,
  getCapturesList,
  deleteCapture,
} from "../api/cameraApi";
import { sendBoxCommand } from "../api/boxApi";

const LiveCamPage = () => {
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captures, setCaptures] = useState([]);
  const [streamUrl, setStreamUrl] = useState("");
  const [selectedCapture, setSelectedCapture] = useState(null);

  useEffect(() => {
    toast.dismiss();
    setStreamUrl(getStreamUrl());
    loadCaptures();
  }, []);

  const loadCaptures = async () => {
    try {
      const data = await getCapturesList();
      setCaptures(data.captures || []);
    } catch (error) {
      console.error("Failed to load captures:", error);
    }
  };

  const handleCaptureClick = () => {
    setIsCaptureModalOpen(true);
  };

  const handleCapture = async (name) => {
              await sendBoxCommand("screenshot");
    
    setIsCapturing(true);
    const toastId = toast.loading("Capturing image...");

    try {
      await captureImage(name);
      toast.success("Image captured successfully!", { id: toastId });
      setIsCaptureModalOpen(false);
      await loadCaptures();
      await sendBoxCommand("exit_screenshot");

    } catch (error) {
      console.error("Capture error:", error);
      toast.error(`Failed to capture: ${error.message}`, { id: toastId });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSelectCapture = (capture) => {
    setSelectedCapture(capture);
  };

  const handleDeleteCapture = async (id) => {
    try {
      await deleteCapture(id);
      if (selectedCapture?.id === id) {
        setSelectedCapture(null);
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="w-full h-full p-8 overflow-auto bg-base-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-primary/20">
          <div className="w-1 h-8 bg-primary rounded-full"></div>
          <h2 className="text-3xl font-bold">ESP32 Live Camera</h2>
        </div>

        {/* Camera Stream Section */}
        <div className="bg-base-200 rounded-2xl p-8 shadow-xl border border-base-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/20">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Live Stream
            </h3>
          </div>

          <CameraViewer streamUrl={streamUrl} className="w-full h-96" />

          <button
            onClick={handleCaptureClick}
            className="btn btn-primary btn-lg btn-block mt-6 gap-2"
          >
            <Camera className="w-5 h-5" />
            Capture Image
          </button>
        </div>

        {/* Captures Gallery Section */}
        {captures.length > 0 && (
          <div className="bg-base-200 rounded-2xl p-8 shadow-xl border border-base-300">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/20">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Image className="w-5 h-5" />
                Captured Images
              </h3>
            </div>

            <CaptureGallery
              captures={captures}
              onSelect={handleSelectCapture}
              onDelete={handleDeleteCapture}
              onRefresh={loadCaptures}
            />
          </div>
        )}
      </div>

      {/* Capture Modal */}
      <CaptureModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        onCapture={handleCapture}
        isLoading={isCapturing}
      />
    </div>
  );
};

export default LiveCamPage;
