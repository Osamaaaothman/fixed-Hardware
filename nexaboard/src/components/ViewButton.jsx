import { Eye } from "lucide-react";

const ViewButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="btn btn-info btn-lg gap-2 shadow-lg hover:shadow-xl transition-all"
    >
      <Eye size={20} />
      View
    </button>
  );
};

export default ViewButton;
