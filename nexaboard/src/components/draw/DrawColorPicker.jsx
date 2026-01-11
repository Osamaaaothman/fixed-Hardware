const DrawColorPicker = ({ selectedColor, onColorChange }) => {
  const colors = ["#000000", "#FF0000", "#0000FF", "#00FF00"];

  return (
    <div className="flex gap-2">
      {colors.map((color) => (
        <button
          key={color}
          className={`w-10 h-10 rounded-lg border-2 transition-all ${
            selectedColor === color
              ? "border-primary scale-110 shadow-lg"
              : "border-base-300 hover:scale-105"
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onColorChange(color)}
          title={color}
        />
      ))}
    </div>
  );
};

export default DrawColorPicker;
