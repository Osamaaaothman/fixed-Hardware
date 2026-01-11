const ColorPicker = ({ textColor, setTextColor }) => {
  const colors = ["#ff0000", "#000000", "#0000ff", "#00ff00"];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {colors.map((color) => (
          <div
            key={color}
            onClick={() => setTextColor(color)}
            className={`w-full h-20 rounded-xl cursor-pointer transition-all flex items-center justify-center ${
              textColor === color
                ? "border-4 border-primary ring-4 ring-primary/20 scale-105"
                : "border-2 border-base-300 hover:border-primary/50 hover:scale-102"
            }`}
            style={{ backgroundColor: color }}
          >
            {textColor === color && (
              <svg
                className="w-8 h-8 text-white drop-shadow-lg"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
      <div className="badge badge-lg badge-primary w-full py-3 font-mono">
        {textColor}
      </div>
    </div>
  );
};

export default ColorPicker;
