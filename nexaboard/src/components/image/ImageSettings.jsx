const ImageSettings = ({ settings, onSettingsChange }) => {
  const handleChange = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Detail Level */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Detail Level</span>
        </label>
        <div className="flex gap-2">
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              onClick={() => handleChange("detailLevel", level)}
              className={`btn btn-sm flex-1 ${
                settings.detailLevel === level ? "btn-primary" : "btn-outline"
              }`}
            >
              {level === 1 ? "Low" : level === 2 ? "Medium" : "High"}
            </button>
          ))}
        </div>
        <div className="text-xs text-base-content/50 mt-2">
          {settings.detailLevel === 1 && "Fast processing, less detail"}
          {settings.detailLevel === 2 && "Balanced quality and speed"}
          {settings.detailLevel === 3 && "High quality, slower processing"}
        </div>
      </div>

      {/* Feed Rate (Speed) */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Speed (mm/min)</span>
          <span className="label-text-alt badge badge-primary">
            {settings.feedRate}
          </span>
        </label>
        <input
          type="range"
          min="500"
          max="5000"
          step="100"
          value={settings.feedRate}
          onChange={(e) => handleChange("feedRate", parseInt(e.target.value))}
          className="range range-primary"
        />
        <div className="flex justify-between text-xs text-base-content/50 px-2 mt-1">
          <span>Slow (500)</span>
          <span>Fast (5000)</span>
        </div>
      </div>

      {/* Remove Noise Toggle */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-4">
          <input
            type="checkbox"
            checked={settings.removeNoise}
            onChange={(e) => handleChange("removeNoise", e.target.checked)}
            className="checkbox checkbox-primary"
          />
          <div>
            <span className="label-text font-semibold block">Remove Noise</span>
            <span className="label-text-alt text-xs text-base-content/50">
              Clean small artifacts from the image
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default ImageSettings;
