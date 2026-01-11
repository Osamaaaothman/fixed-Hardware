import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import StatusPage from "./pages/StatusPage";
import TextModePage from "./pages/TextModePage";
import ImagePage from "./pages/ImagePage";
import DrawPage from "./pages/DrawPage";
import GcodeViewerPage from "./pages/GcodeViewerPage";
import QueuePage from "./pages/QueuePage";
import LiveCamPage from "./pages/LiveCamPage";
import LockModal from "./components/LockModal";
import { API_CONFIG } from "./config/api.config";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isSystemLocked, setIsSystemLocked] = useState(false);

  // Check lock status on app load
  useEffect(() => {
    const checkLockStatus = async () => {
      try {
        const response = await fetch(API_CONFIG.ENDPOINTS.SYSTEM_STATUS);
        const data = await response.json();
        setIsSystemLocked(data.locked);
        // If locked, show the modal
        if (data.locked) {
          setIsLockModalOpen(true);
        }
      } catch (error) {
        console.error("Error checking lock status:", error);
      }
    };

    checkLockStatus();
  }, []);

  // Global keyboard listener for Ctrl+L
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Ctrl+L (or Cmd+L on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault();
        
        // Automatically lock the system
        try {
          const response = await fetch(API_CONFIG.ENDPOINTS.SYSTEM_LOCK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          
          const data = await response.json();
          
          if (data.success) {
            setIsSystemLocked(true);
            setIsLockModalOpen(true);
          }
        } catch (error) {
          console.error("Error locking system:", error);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen">
      {/* Lock indicator banner */}
      {isSystemLocked && (
        <div className="fixed top-0 left-0 right-0 bg-error text-error-content py-1 px-4 text-center text-sm font-medium z-50 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          System Locked - All operations are blocked
          <button 
            onClick={() => setIsLockModalOpen(true)}
            className="ml-2 underline hover:no-underline"
          >
            Unlock
          </button>
        </div>
      )}

      <Sidebar onNavigate={setCurrentPage} currentPage={currentPage} />
      <div className={`flex-1 ${isSystemLocked ? "mt-8" : ""}`}>
        {currentPage === "dashboard" && <StatusPage />}
        {currentPage === "textMode" && <TextModePage />}
        {currentPage === "imageMode" && <ImagePage />}
        {currentPage === "draw" && <DrawPage />}
        {currentPage === "gcodeViewer" && <GcodeViewerPage />}
        {currentPage === "queue" && <QueuePage />}
        {currentPage === "liveCam" && <LiveCamPage />}
      </div>

      {/* Lock Modal */}
      <LockModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        onLockStatusChange={setIsSystemLocked}
      />
    </div>
  );
}
