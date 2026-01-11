import { useRef, useEffect } from "react";
import { Canvas } from "fabric";

const DrawingBoard = ({ canvasRef, onCanvasReady }) => {
  const canvasElRef = useRef(null);

  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new Canvas(canvasElRef.current, {
      width: 600,
      height: 500,
      backgroundColor: "#ffffff",
      isDrawingMode: false,
    });

    canvasRef.current = canvas;
    onCanvasReady(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  return (
    <div className="flex justify-center items-center">
      <div className="border-4 border-base-300 rounded-xl overflow-hidden shadow-2xl">
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
};

export default DrawingBoard;
