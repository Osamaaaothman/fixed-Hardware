import { useEffect, useRef } from "react";

const TextPreviewCanvas = ({ text, fontData, fontSize, textColor }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !fontData || !text) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas background
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!text.trim()) return;

    // Convert to uppercase since Hershey fonts only have uppercase
    const upperText = text.toUpperCase();
    const lines = upperText.split("\n");
    const scale = (fontSize / fontData.lineHeight) * 4; // Increased scale for better visibility
    const spacing = 2 * scale;
    const lineSpacing = fontData.lineHeight * scale * 1.5;

    // Add visual scale indicator
    ctx.fillStyle = "#9ca3af";
    ctx.font = "12px sans-serif";
    ctx.fillText(`Scale: ${fontSize}mm`, 10, 20);

    let startY = 50;

    lines.forEach((line, lineIndex) => {
      let currentX = 50;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const charData = fontData.chars[char];

        if (!charData) {
          // Space or unknown character
          currentX += 8 * scale;
          continue;
        }

        // Draw character paths
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        charData.paths.forEach((path) => {
          if (path.length < 2) return;

          ctx.beginPath();
          path.forEach((point, idx) => {
            const x = currentX + point[0] * scale;
            // Flip Y coordinate by subtracting from a baseline instead of adding
            const y =
              startY +
              lineIndex * lineSpacing +
              (fontData.lineHeight - point[1]) * scale;

            if (idx === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();
        });

        currentX += charData.width * scale + spacing;
      }
    });
  }, [text, fontData, fontSize, textColor]);

  return (
    <div className="flex justify-center">
      <div className="bg-base-100 rounded-xl p-4 border-2 border-base-300 h-full">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-base-300">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <h3 className="text-sm font-semibold">Preview</h3>
        </div>
        <canvas
          ref={canvasRef}
          width={500}
          height={400}
          className="bg-gray-100 rounded-lg"
        />
      </div>
    </div>
  );
};

export default TextPreviewCanvas;
