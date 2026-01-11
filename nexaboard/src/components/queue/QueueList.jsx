import { useState } from "react";
import QueueItem from "./QueueItem";
import { reorderQueue } from "../../api/queueApi";
import { toast } from "sonner";

const QueueList = ({ items, onDelete, onViewGcode, onReorder }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (index) => (e) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (index) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (toIndex) => async (e) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === toIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    try {
      await reorderQueue(draggedIndex, toIndex);

      // Don't call onReorder - socket event will handle the refresh
      toast.success("Queue reordered");
    } catch (error) {
      console.error("Error reordering queue:", error);
      toast.error("Failed to reorder queue");
    } finally {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="bg-base-200 rounded-2xl p-12 text-center border border-base-300">
        <div className="text-base-content/30 mb-3">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-base-content/50 mb-2">
          Queue is Empty
        </h3>
        <p className="text-sm text-base-content/40">
          Generate G-code from images or text and add them to the queue
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`transition-all ${
            dragOverIndex === index ? "border-t-2 border-primary pt-2" : ""
          } ${draggedIndex === index ? "opacity-50" : ""}`}
          onDragLeave={handleDragLeave}
        >
          <QueueItem
            item={item}
            onDelete={onDelete}
            onViewGcode={onViewGcode}
            onDragStart={handleDragStart(index)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop(index)}
            draggable={item.status === "pending"}
          />
        </div>
      ))}
    </div>
  );
};

export default QueueList;
