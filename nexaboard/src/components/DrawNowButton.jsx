import { Play } from "lucide-react";
import { useState } from "react";

const DrawNowButton = ({ onClick, disabled = false }) => {
  const [isClicking, setIsClicking] = useState(false);

  const handleDrawNow = async () => {
    if (isClicking || disabled) return;

    setIsClicking(true);

    if (onClick) {
      await onClick();
    }

    // Prevent rapid clicks for 2 seconds
    setTimeout(() => setIsClicking(false), 2000);
  };

  return (
    <button
      onClick={handleDrawNow}
      disabled={disabled || isClicking}
      className="btn btn-success btn-lg gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
    >
      <Play size={20} />
      {isClicking ? "Drawing..." : "Draw Now"}
    </button>
  );
};

export default DrawNowButton;
