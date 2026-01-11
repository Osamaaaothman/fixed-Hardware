import { useState, useEffect } from "react";
import { Image, Settings2, FileCode } from "lucide-react";
import { toast } from "sonner";
import GenerateButton from "../components/GenerateButton";
import ImageUploader from "../components/image/ImageUploader";
import ImageSettings from "../components/image/ImageSettings";
import GcodePreviewModal from "../components/image/GcodePreviewModal";
import StatsDisplay from "../components/image/StatsDisplay";
import { convertImageToGcode } from "../api/imageApi";

const ImagePage = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [settings, setSettings] = useState({
    imageSize: 300,
    detailLevel: 2,
    feedRate: 1500,
    penUp: -2.3,
    penDown: 0,
    tolerance: 0.5,
    removeNoise: true,
    minPathLength: 2,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Clear any lingering toasts on mount
  useEffect(() => {
    toast.dismiss();
  }, []);

  const handleImageSelect = (file) => {
    setSelectedImage(file);
    setResult(null);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setResult(null);
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error("Please select an image first!");
      return;
    }
    setIsGenerating(true);
    const toastId = toast.loading("Converting image to G-code...");

    try {
      const data = await convertImageToGcode(selectedImage, settings);
      setResult(data);
      toast.success("G-code generated successfully!", { id: toastId });
      setIsModalOpen(true);
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error(`Failed to convert image: ${error.message}`, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full h-full p-8 overflow-auto bg-base-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-primary/20">
          <div className="w-1 h-8 bg-primary rounded-full"></div>
          <h2 className="text-3xl font-bold">Image to G-code</h2>
        </div>

        {/* Vertical Layout */}
        <div className="space-y-6">
          {/* Image Upload Section */}
          <div className="bg-base-200 rounded-2xl p-8 shadow-xl border border-base-300">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/20">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Image className="w-5 h-5" />
                Upload Image
              </h3>
            </div>

            <ImageUploader
              onImageSelect={handleImageSelect}
              selectedImage={selectedImage}
              onClear={handleClearImage}
            />
          </div>

          {/* Settings Section */}
          <div className="bg-base-200 rounded-2xl p-8 shadow-xl border border-base-300">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/20">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Settings
              </h3>
            </div>

            <ImageSettings settings={settings} onSettingsChange={setSettings} />

            {/* Generate Button */}
            <div className="mt-6">
              <GenerateButton
                onClick={handleGenerate}
                disabled={!selectedImage || isGenerating}
              />

              {!selectedImage && (
                <p className="text-sm text-base-content/50 text-center mt-3">
                  Upload an image to start
                </p>
              )}
            </div>
          </div>

          {/* Results Section */}
          {result && (
            <div className="bg-base-200 rounded-2xl p-8 shadow-xl border border-base-300">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-primary/20">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  Generation Results
                </h3>
              </div>

              <div className="space-y-6">
                {/* Stats */}
                <StatsDisplay stats={result.stats} />

                {/* Processed Image Preview */}
                {result.processedImage && (
                  <div>
                    <h4 className="font-semibold mb-3">Processed Image</h4>
                    <img
                      src={result.processedImage}
                      alt="Processed"
                      className="w-full max-w-md mx-auto rounded-lg bg-base-300"
                    />
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn btn-primary btn-block btn-lg gap-2"
                >
                  <FileCode className="w-5 h-5" />
                  View Full G-code
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Settings and Generate */}
      </div>

      {/* G-code Preview Modal */}
      <GcodePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        gcode={result?.gcode}
        stats={result?.stats}
        processedImage={result?.processedImage}
        settings={settings}
      />
    </div>
  );
};

export default ImagePage;
