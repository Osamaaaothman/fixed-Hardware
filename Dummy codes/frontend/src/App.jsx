import { useState } from "react";
import ImageUploader from "./components/ImageUploader";
import GcodeViewer from "./components/GcodeViewer";
import Settings from "./components/Settings";
import StatsPanel from "./components/StatsPanel";
import DrawButton from "./components/DrawButton";
import { convertImageToGcode } from "./api";
import "./App.css";

function App() {
  const [gcode, setGcode] = useState("");
  const [stats, setStats] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({
    imageSize: 300,
    detailLevel: 2,
    feedRate: 1500,
    penUp: 5,
    penDown: -2,
    tolerance: 0.5,
    removeNoise: true,
    minPathLength: 2,
  });

  const handleImageUpload = async (imageFile) => {
    setIsLoading(true);
    setError(null);
    setGcode("");
    setStats(null);
    setProcessedImage(null);

    try {
      const result = await convertImageToGcode(imageFile, settings);
      setGcode(result.gcode);
      setStats(result.stats);
      setProcessedImage(result.processedImage);
    } catch (err) {
      setError(err.message);
      console.error("Upload error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🖊️ Image to G-code Converter</h1>
        <p>Convert images into pen plotter G-code commands</p>
      </header>

      <main className="app-main">
        <Settings onSettingsChange={setSettings} isDisabled={isLoading} />

        <ImageUploader onUpload={handleImageUpload} isLoading={isLoading} />

        {error && (
          <div className="error-message">
            <h3>⚠️ Error</h3>
            <p>{error}</p>
          </div>
        )}

        {stats && <StatsPanel stats={stats} processedImage={processedImage} />}

        {gcode && <DrawButton gcode={gcode} disabled={isLoading} />}
        {gcode && <GcodeViewer gcode={gcode} />}


        {!gcode && !error && !isLoading && (
          <div className="instructions">
            <h2>How to use:</h2>
            <ol>
              <li>Adjust settings above to customize the output</li>
              <li>Upload an image file (JPG, PNG, BMP, etc.)</li>
              <li>Click "Generate G-code" to convert the image</li>
              <li>Review the statistics and processed image</li>
              <li>Download or copy the generated G-code</li>
              <li>Send the G-code to your pen plotter</li>
            </ol>
            <div className="tips">
              <h3>Tips for best results:</h3>
              <ul>
                <li>Use high-contrast images with clear outlines</li>
                <li>Simple line art works better than photographs</li>
                <li>Black and white images produce cleaner results</li>
                <li>Lower image size and detail level for faster drawing</li>
                <li>Keep file size under 10MB</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by React + Node.js | Using Potrace vectorization</p>
      </footer>
    </div>
  );
}

export default App;
