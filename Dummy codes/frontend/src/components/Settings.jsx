import { useState } from "react";
import "./Settings.css";

function Settings({ onSettingsChange, isDisabled }) {
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

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  return (
    <div className="settings-panel">
      <h3>⚙️ Settings</h3>

      <div className="setting-group">
        <label>
          Image Size (width in pixels)
          <select
            value={settings.imageSize}
            onChange={(e) =>
              handleChange("imageSize", parseInt(e.target.value))
            }
            disabled={isDisabled}
          >
            <option value={200}>200px - Fastest</option>
            <option value={300}>300px - Balanced</option>
            <option value={400}>400px - Detailed</option>
            <option value={500}>500px - High Quality</option>
          </select>
        </label>
      </div>

      <div className="setting-group">
        <label>
          Detail Level
          <select
            value={settings.detailLevel}
            onChange={(e) =>
              handleChange("detailLevel", parseInt(e.target.value))
            }
            disabled={isDisabled}
          >
            <option value={1}>Low - Fewer lines, faster</option>
            <option value={2}>Medium - Balanced</option>
            <option value={3}>High - More details</option>
          </select>
        </label>
      </div>

      <div className="setting-group">
        <label>
          Feed Rate (mm/min)
          <input
            type="number"
            value={settings.feedRate}
            onChange={(e) => handleChange("feedRate", parseInt(e.target.value))}
            min="500"
            max="5000"
            step="100"
            disabled={isDisabled}
          />
        </label>
        <span className="setting-hint">Your plotter speed</span>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.removeNoise}
            onChange={(e) => handleChange("removeNoise", e.target.checked)}
            disabled={isDisabled}
          />
          <span>Remove Noise & Small Artifacts</span>
        </label>
        <span className="setting-hint">Removes tiny dots and speckles</span>
      </div>

      <button
        className="toggle-advanced"
        onClick={() => setShowAdvanced(!showAdvanced)}
        type="button"
      >
        {showAdvanced ? "▼" : "▶"} Advanced Settings
      </button>

      {showAdvanced && (
        <div className="advanced-settings">
          <div className="setting-group">
            <label>
              Pen Up (Z position)
              <input
                type="number"
                value={settings.penUp}
                onChange={(e) =>
                  handleChange("penUp", parseFloat(e.target.value))
                }
                step="0.5"
                disabled={isDisabled}
              />
            </label>
          </div>

          <div className="setting-group">
            <label>
              Pen Down (Z position)
              <input
                type="number"
                value={settings.penDown}
                onChange={(e) =>
                  handleChange("penDown", parseFloat(e.target.value))
                }
                step="0.5"
                disabled={isDisabled}
              />
            </label>
          </div>

          <div className="setting-group">
            <label>
              Simplification Tolerance (mm)
              <input
                type="number"
                value={settings.tolerance}
                onChange={(e) =>
                  handleChange("tolerance", parseFloat(e.target.value))
                }
                min="0.1"
                max="2"
                step="0.1"
                disabled={isDisabled}
              />
            </label>
            <span className="setting-hint">
              Higher = fewer points, smaller file
            </span>
          </div>

          <div className="setting-group">
            <label>
              Minimum Path Length (mm)
              <input
                type="number"
                value={settings.minPathLength}
                onChange={(e) =>
                  handleChange("minPathLength", parseFloat(e.target.value))
                }
                min="0.5"
                max="10"
                step="0.5"
                disabled={isDisabled}
              />
            </label>
            <span className="setting-hint">
              Ignore paths shorter than this (removes dots)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
