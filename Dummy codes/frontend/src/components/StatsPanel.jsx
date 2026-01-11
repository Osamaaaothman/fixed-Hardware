import "./StatsPanel.css";

function StatsPanel({ stats, processedImage }) {
  if (!stats) return null;

  const formatTime = (minutes) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)} seconds`;
    } else {
      const mins = Math.floor(minutes);
      const secs = Math.round((minutes - mins) * 60);
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
  };

  return (
    <div className="stats-panel">
      <h3>📊 Statistics</h3>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-label">Estimated Time</div>
            <div className="stat-value">{formatTime(stats.estimatedTime)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🛤️</div>
          <div className="stat-content">
            <div className="stat-label">Total Paths</div>
            <div className="stat-value">{stats.pathCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📏</div>
          <div className="stat-content">
            <div className="stat-label">Drawing Distance</div>
            <div className="stat-value">{stats.drawingDistance}mm</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-label">G-code Lines</div>
            <div className="stat-value">{stats.lineCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <div className="stat-label">Move Distance</div>
            <div className="stat-value">{stats.moveDistance}mm</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📐</div>
          <div className="stat-content">
            <div className="stat-label">Total Distance</div>
            <div className="stat-value">{stats.totalDistance}mm</div>
          </div>
        </div>
      </div>

      {processedImage && (
        <div className="processed-image-preview">
          <h4>Processed Image (Black & White)</h4>
          <img src={processedImage} alt="Processed" />
        </div>
      )}
    </div>
  );
}

export default StatsPanel;
