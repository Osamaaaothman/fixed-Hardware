import { useState } from "react";
import "./GcodeViewer.css";

function GcodeViewer({ gcode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(gcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([gcode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plotter-${Date.now()}.gcode`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getGcodeStats = () => {
    const lines = gcode
      .split("\n")
      .filter((line) => line.trim() && !line.trim().startsWith(";"));
    const pathMatches = gcode.match(/; Path \d+/g);
    const pathCount = pathMatches ? pathMatches.length : 0;

    return {
      lines: lines.length,
      paths: pathCount,
      size: new Blob([gcode]).size,
    };
  };

  if (!gcode) {
    return null;
  }

  const stats = getGcodeStats();

  return (
    <div className="gcode-viewer">
      <div className="viewer-header">
        <h2>Generated G-code</h2>
        <div className="stats">
          <span className="stat-item">📊 {stats.lines} commands</span>
          <span className="stat-item">🛤️ {stats.paths} paths</span>
          <span className="stat-item">
            💾 {(stats.size / 1024).toFixed(2)} KB
          </span>
        </div>
      </div>

      <div className="button-group">
        <button onClick={handleCopy} className="btn btn-secondary">
          {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
        </button>
        <button onClick={handleDownload} className="btn btn-primary">
          ⬇️ Download .gcode
        </button>
      </div>

      <div className="code-container">
        <pre className="code-display">
          <code>{gcode}</code>
        </pre>
      </div>
    </div>
  );
}

export default GcodeViewer;
