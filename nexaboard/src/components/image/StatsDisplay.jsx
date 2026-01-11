const StatsDisplay = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div className="bg-base-300 rounded-lg p-4">
        <div className="text-xs text-base-content/60 mb-1">Paths</div>
        <div className="text-2xl font-bold text-primary">{stats.pathCount}</div>
      </div>

      <div className="bg-base-300 rounded-lg p-4">
        <div className="text-xs text-base-content/60 mb-1">Total Distance</div>
        <div className="text-2xl font-bold text-primary">
          {stats.totalDistance} mm
        </div>
      </div>

      <div className="bg-base-300 rounded-lg p-4">
        <div className="text-xs text-base-content/60 mb-1">
          Drawing Distance
        </div>
        <div className="text-2xl font-bold text-primary">
          {stats.drawingDistance} mm
        </div>
      </div>

      <div className="bg-base-300 rounded-lg p-4">
        <div className="text-xs text-base-content/60 mb-1">Move Distance</div>
        <div className="text-2xl font-bold text-secondary">
          {stats.moveDistance} mm
        </div>
      </div>

      <div className="bg-base-300 rounded-lg p-4">
        <div className="text-xs text-base-content/60 mb-1">Estimated Time</div>
        <div className="text-2xl font-bold text-secondary">
          {stats.estimatedTime} min
        </div>
      </div>

      <div className="bg-base-300 rounded-lg p-4">
        <div className="text-xs text-base-content/60 mb-1">G-code Lines</div>
        <div className="text-2xl font-bold text-secondary">
          {stats.lineCount}
        </div>
      </div>
    </div>
  );
};

export default StatsDisplay;
