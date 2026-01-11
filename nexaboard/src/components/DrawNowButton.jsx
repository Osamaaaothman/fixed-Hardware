import { Play } from "lucide-react";

const DrawNowButton = ({ onClick }) => {
  const handleDrawNow = () => {
    if (onClick) onClick();
  };

  return (
    <button
      onClick={handleDrawNow}
      className="btn btn-success btn-lg gap-2 shadow-lg hover:shadow-xl transition-all"
    >
      <Play size={20} />
      Draw Now
    </button>
  );
};

export default DrawNowButton;
