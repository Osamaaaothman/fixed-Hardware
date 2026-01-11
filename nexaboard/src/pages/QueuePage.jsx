import { useState, useEffect } from "react";
import { Package, AlertCircle, FileCode } from "lucide-react";
import { toast } from "sonner";
import { io } from "socket.io-client";
import QueueList from "../components/queue/QueueList";
import QueueControls from "../components/queue/QueueControls";
import ManualControl from "../components/queue/ManualControl";
import RecoveryButton from "../components/RecoveryButton";
import SerialLogModal from "../components/SerialLogModal";
import { SOCKET_CONFIG, SERIAL_CONFIG } from "../config/api.config.js";
import {
  getQueue,
  getQueueStatus,
  removeFromQueue,
  clearQueue,
  processQueue,
  processNextInQueue,
  sendCommand,
} from "../api/queueApi";

const QueuePage = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [isSerialLogOpen, setIsSerialLogOpen] = useState(false);
  const [currentQueueGcode, setCurrentQueueGcode] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showGcodeModal, setShowGcodeModal] = useState(false);

  // Fetch queue data
  const fetchQueue = async () => {
    try {
      const [queueData, statusData] = await Promise.all([
        getQueue(),
        getQueueStatus(),
      ]);

      setItems(queueData.items || []);
      setStats({
        total: statusData.total,
        pending: statusData.pending,
        processing: statusData.processing,
        completed: statusData.completed,
        failed: statusData.failed,
      });
      setIsProcessing(statusData.isProcessing || false);
    } catch (error) {
      console.error("Error fetching queue:", error);
      toast.error("Failed to load queue");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(SOCKET_CONFIG.SERVER_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket.IO connected");
    });

    newSocket.on("disconnect", () => {
      console.log("Socket.IO disconnected");
    });

    // Listen for queue updates (debounced to avoid double fetch)
    let fetchTimeout;
    newSocket.on("queue:updated", (data) => {
      console.log("Queue updated:", data);

      // Debounce the fetch to avoid multiple rapid calls
      clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => {
        fetchQueue();
      }, 200);
    });

    // Listen for processing updates
    newSocket.on("queue:processing", (data) => {
      console.log("Queue processing:", data);

      if (data.status === "started") {
        setIsProcessing(true);
      }

      // Update item progress
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === data.itemId
            ? {
                ...item,
                currentLine: data.current || item.currentLine,
                status: "processing",
              }
            : item
        )
      );
    });

    // Listen for completion
    newSocket.on("queue:completed", (data) => {
      console.log("=== Queue Completion Event Received ===");
      console.log("Full data:", JSON.stringify(data, null, 2));
      console.log("Status:", data.status);
      console.log("ID:", data.id);
      console.log("ItemID:", data.itemId);

      if (data.status === "completed") {
        toast.success("Queue item completed successfully!");

        // Auto-remove completed item from queue
        const idToRemove = data.id || data.itemId;
        if (idToRemove) {
          console.log("Attempting to remove item with ID:", idToRemove);
          setTimeout(async () => {
            try {
              console.log("Calling removeFromQueue with ID:", idToRemove);
              const result = await removeFromQueue(idToRemove);
              console.log("Remove result:", result);
              console.log("Completed item removed from queue");
              // Force refresh queue
              await fetchQueue();
              console.log("Queue refreshed after removal");
            } catch (error) {
              console.error("Error removing completed item:", error);
              // Still refresh even if remove failed
              await fetchQueue();
            }
          }, 1000); // زيادة الوقت لـ 1 ثانية
        } else {
          console.warn("No ID found in completion event, removing by status");
          // حذف أول item مكتمل
          setTimeout(async () => {
            try {
              const currentItems = items.filter(
                (item) => item.status === "completed"
              );
              if (currentItems.length > 0) {
                await removeFromQueue(currentItems[0].id);
              }
              await fetchQueue();
            } catch (error) {
              console.error("Error in fallback removal:", error);
              await fetchQueue();
            }
          }, 1000);
        }
      } else if (data.status === "failed") {
        toast.error(`Queue item failed: ${data.error}`);
        // Refresh to update status
        setTimeout(() => fetchQueue(), 500);
      }
    });

    return () => {
      clearTimeout(fetchTimeout);
      newSocket.close();
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchQueue();
  }, []);

  // Handle delete
  const handleDelete = async (id) => {
    try {
      await removeFromQueue(id);
      toast.success("Item removed from queue");
      // fetchQueue will be called by socket event
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to remove item");
    }
  };

  // Handle process queue
  const handleProcess = async () => {
    try {
      // Get the first pending item's gcode
      const pendingItems = items.filter((item) => item.status === "pending");
      if (pendingItems.length > 0 && pendingItems[0].gcode) {
        setCurrentQueueGcode(pendingItems[0].gcode);
        setIsSerialLogOpen(true);
      }

      await processQueue();
      toast.success("Queue processing started");
      setIsProcessing(true);
    } catch (error) {
      console.error("Error processing queue:", error);
      toast.error("Failed to start queue processing");
    }
  };

  // Handle process next (first pending item only)
  const handleProcessNext = async () => {
    try {
      const result = await processNextInQueue();

      if (result.success && result.item) {
        setCurrentQueueGcode(result.item.gcode);
        setIsSerialLogOpen(true);
        toast.success("Drawing next item...");
      }
    } catch (error) {
      console.error("Error processing next item:", error);
      toast.error(error.message || "Failed to process next item");
    }
  };

  // Handle clear all
  const handleClear = async () => {
    if (!window.confirm("Are you sure you want to clear the entire queue?")) {
      return;
    }

    try {
      await clearQueue();
      toast.success("Queue cleared");
      // fetchQueue will be called by socket event
    } catch (error) {
      console.error("Error clearing queue:", error);
      toast.error("Failed to clear queue");
    }
  };

  // Handle view G-code
  const handleViewGcode = (item) => {
    setSelectedItem(item);
    setShowGcodeModal(true);
  };

  // Handle copy G-code
  const handleCopyGcode = () => {
    if (selectedItem?.gcode) {
      navigator.clipboard
        .writeText(selectedItem.gcode)
        .then(() => {
          toast.success("✅ G-code copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          toast.error("Failed to copy G-code");
        });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-base-100">
        <div className="flex flex-col items-center gap-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-sm text-base-content/60">Loading queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 md:p-6 overflow-auto bg-base-100">
      <div className="max-w-7xl mx-auto">
        {/* Simple Header with Total Count */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-base-content mb-1">Queue</h1>
              <p className="text-sm text-base-content/50">
                {items.length === 0 ? "No items" : `${items.length} ${items.length === 1 ? "item" : "items"}`}
              </p>
            </div>
            
            {/* Action Buttons */}
            {items.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleProcessNext}
                  disabled={stats.pending === 0 || isProcessing}
                  className="btn btn-primary gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Draw Next
                </button>
                <button
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="btn btn-ghost gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Queue List - Takes 8 columns */}
          <div className="lg:col-span-8">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-base-300 rounded-xl bg-base-200/30">
                <div className="w-16 h-16 rounded-full bg-base-300/50 flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-base-content/30" />
                </div>
                <h3 className="text-lg font-semibold text-base-content/60 mb-2">
                  Queue is Empty
                </h3>
                <p className="text-sm text-base-content/40">
                  Add items from Image or Text mode to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <QueueList
                  items={items}
                  onDelete={handleDelete}
                  onViewGcode={handleViewGcode}
                  onReorder={fetchQueue}
                />
              </div>
            )}
          </div>

          {/* Manual Control - Takes 4 columns */}
          <div className="lg:col-span-4 space-y-4">
            <RecoveryButton />
            <ManualControl />
          </div>
        </div>
      </div>

      {/* G-code Modal */}
      {showGcodeModal && selectedItem && (
        <div className="modal modal-open z-50">
          <div className="modal-box max-w-5xl h-[85vh] flex flex-col p-0 bg-base-100 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-base-300 bg-gradient-to-r from-primary/10 to-secondary/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <FileCode className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl">G-code Preview</h3>
                  <p className="text-sm text-base-content/60 mt-1">
                    {selectedItem.type === "image" ? "Image" : "Text"} Mode
                  </p>
                </div>
              </div>
              <button
                className="btn btn-sm btn-circle btn-ghost hover:bg-error/20 hover:text-error hover:scale-110 transition-all"
                onClick={() => setShowGcodeModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Stats Bar */}
            {selectedItem.stats && (
              <div className="px-6 py-3 bg-base-200 border-b border-base-300">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base-content/70">
                      Lines:
                    </span>
                    <span className="badge badge-primary badge-sm">
                      {selectedItem.stats.totalLines || 0}
                    </span>
                  </div>
                  {selectedItem.stats.estimatedTime && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base-content/70">
                        Time:
                      </span>
                      <span className="badge badge-success badge-sm">
                        {selectedItem.stats.estimatedTime}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base-content/70">
                      Type:
                    </span>
                    <span className="badge badge-accent badge-sm capitalize">
                      {selectedItem.type}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* G-code Content */}
            <div className="flex-1 p-6 overflow-hidden">
              <textarea
                className="textarea textarea-bordered w-full h-full font-mono text-xs resize-none bg-base-200/50 focus:outline-none focus:border-primary leading-relaxed"
                value={selectedItem.gcode || "No G-code available"}
                readOnly
                spellCheck={false}
              ></textarea>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-base-200 border-t-2 border-base-300 flex justify-between items-center gap-3">
              <div className="text-xs text-base-content/60">
                📝 {selectedItem.gcode?.split("\n").length || 0} lines •{" "}
                {(selectedItem.gcode?.length || 0).toLocaleString()} characters
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyGcode}
                  className="btn btn-primary btn-sm gap-2 shadow-lg"
                >
                  <FileCode className="w-4 h-4" />
                  Copy G-code
                </button>
                <button
                  onClick={() => setShowGcodeModal(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/70 backdrop-blur-sm"
            onClick={() => setShowGcodeModal(false)}
          ></div>
        </div>
      )}

      {/* Serial Log Modal */}
      <SerialLogModal
        isOpen={isSerialLogOpen}
        onClose={() => setIsSerialLogOpen(false)}
        gcode={currentQueueGcode}
        port={SERIAL_CONFIG.DEFAULT_PORT}
      />
    </div>
  );
};

export default QueuePage;
