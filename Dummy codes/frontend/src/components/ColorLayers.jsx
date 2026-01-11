import "./ColorLayers.css";

function ColorLayers({ layers }) {
  if (!layers || layers.length === 0) return null;

  return (
    <div className="color-layers">
      <h3>🎨 Color Layers</h3>
      <p className="layers-description">
        Your image has been separated into {layers.length} color layer
        {layers.length > 1 ? "s" : ""}. Each layer will be drawn with a
        different pen. The plotter will pause between layers for you to change
        the pen.
      </p>

      <div className="layers-grid">
        {layers.map((layer, index) => (
          <div key={index} className="layer-card">
            <div className="layer-header">
              <div
                className="color-swatch"
                style={{ backgroundColor: layer.color.hex }}
                title={layer.color.hex}
              />
              <div className="layer-info">
                <h4>
                  Layer {index + 1}: {layer.name}
                </h4>
                <span className="pixel-count">
                  {layer.pixelCount.toLocaleString()} pixels
                </span>
              </div>
            </div>

            {layer.preview && (
              <div className="layer-preview">
                <img
                  src={`data:image/png;base64,${layer.preview}`}
                  alt={`${layer.name} layer preview`}
                />
              </div>
            )}

            {layer.stats && (
              <div className="layer-stats">
                <div className="stat-item">
                  <span className="stat-label">Paths:</span>
                  <span className="stat-value">{layer.stats.pathCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Draw Time:</span>
                  <span className="stat-value">
                    {layer.stats.estimatedTime}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="total-info">
        <p>
          <strong>Total estimated time:</strong>{" "}
          {layers
            .reduce((sum, layer) => {
              if (!layer.stats) return sum;
              const time = parseFloat(layer.stats.estimatedTime);
              return sum + (isNaN(time) ? 0 : time);
            }, 0)
            .toFixed(2)}{" "}
          minutes + pen change time
        </p>
      </div>
    </div>
  );
}

export default ColorLayers;
