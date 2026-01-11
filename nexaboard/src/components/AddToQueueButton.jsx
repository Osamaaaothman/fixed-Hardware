import { Plus } from "lucide-react";

const AddToQueueButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="btn btn-primary btn-lg gap-2 shadow-lg hover:shadow-xl transition-all"
    >
      <Plus size={20} />
      Add to Queue
    </button>
  );
};

export default AddToQueueButton;
