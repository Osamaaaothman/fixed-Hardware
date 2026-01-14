import { Play, Plus } from "lucide-react";
import { useState } from "react";
import { executePen, addPenToQueue } from "../api/penApi";
import { toast } from "react-hot-toast";

const PenButtons = ({ onQueueUpdate }) => {
  const [executing, setExecuting] = useState(null);

  const pens = [
    { type: "pen1", name: "Pen 1", color: "bg-blue-500" },
    { type: "pen2", name: "Pen 2", color: "bg-green-500" },
    { type: "erasing_pen", name: "Erasing Pen", color: "bg-red-500" },
  ];

  const handleExecute = async (penType, penName) => {
    setExecuting(penType);
    const toastId = toast.loading(`Executing ${penName}...`);

    try {
      await executePen(penType);
      toast.success(`${penName} execution started!`, { id: toastId });
    } catch (error) {
      toast.error(error.message || `Failed to execute ${penName}`, {
        id: toastId,
      });
    } finally {
      setExecuting(null);
    }
  };

  const handleAddToQueue = async (penType, penName) => {
    const toastId = toast.loading(`Adding ${penName} to queue...`);

    try {
      await addPenToQueue(penType);
      toast.success(`${penName} added to queue!`, { id: toastId });
      if (onQueueUpdate) onQueueUpdate();
    } catch (error) {
      toast.error(error.message || `Failed to add ${penName}`, { id: toastId });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {pens.map((pen) => (
        <div
          key={pen.type}
          className={`card ${
            pen.color
          } bg-opacity-10 border-2 border-${pen.color.replace("bg-", "")}`}
        >
          <div className="card-body p-4">
            <h3 className="card-title text-lg">{pen.name}</h3>
            <div className="card-actions justify-end gap-2 mt-2">
              <button
                onClick={() => handleExecute(pen.type, pen.name)}
                disabled={executing === pen.type}
                className={`btn btn-sm ${pen.color} text-white gap-1`}
              >
                <Play size={16} />
                {executing === pen.type ? "Running..." : "Execute"}
              </button>
              <button
                onClick={() => handleAddToQueue(pen.type, pen.name)}
                className="btn btn-sm btn-outline gap-1"
              >
                <Plus size={16} />
                Queue
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PenButtons;
