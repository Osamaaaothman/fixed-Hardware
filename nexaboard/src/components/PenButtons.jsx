import { Play, Plus, Pencil, Eraser } from "lucide-react";
import { useState } from "react";
import { executePen, addPenToQueue } from "../api/penApi";
import { toast } from "sonner";

const PenButtons = ({ onQueueUpdate }) => {
  const [executing, setExecuting] = useState(null);

  const pens = [
    {
      type: "pen1",
      name: "Pen 1",
      icon: <Pencil size={18} />,
      color: "primary",
    },
    {
      type: "pen2",
      name: "Pen 2",
      icon: <Pencil size={18} />,
      color: "secondary",
    },
    {
      type: "erasing_pen",
      name: "Erasing Pen",
      icon: <Eraser size={18} />,
      color: "accent",
    },
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
    <div className="grid grid-cols-1 gap-3">
      {pens.map((pen) => (
        <div
          key={pen.type}
          className="bg-base-200/50 border border-base-300 rounded-lg p-3 hover:shadow-sm transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded bg-${pen.color}/10 text-${pen.color}`}
              >
                {pen.icon}
              </div>
              <h3 className="font-semibold text-sm">{pen.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExecute(pen.type, pen.name)}
                disabled={executing === pen.type}
                className={`btn btn-sm btn-${pen.color} gap-1`}
              >
                {executing === pen.type ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <Play size={14} />
                )}
                {executing === pen.type ? "Running" : "Execute"}
              </button>
              <button
                onClick={() => handleAddToQueue(pen.type, pen.name)}
                className="btn btn-sm btn-ghost btn-square"
                title="Add to queue"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PenButtons;
