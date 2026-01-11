import { useState, useEffect } from "react";
import { Lock, Shield, AlertTriangle } from "lucide-react";
import { API_CONFIG } from "../config/api.config";

const LockModal = ({ isOpen, onClose, onLockStatusChange }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      setError("");
      setAttempts(0);
    }
  }, [isOpen]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.SYSTEM_UNLOCK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPassword("");
        if (onLockStatusChange) {
          onLockStatusChange(false);
        }
        onClose();
      } else {
        setError("Incorrect password");
        setPassword("");
        setAttempts(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error unlocking system:", error);
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md bg-gradient-to-br from-base-100 to-base-200 border-2 border-error/20">
        {/* Lock Icon Header */}
        <div className="flex flex-col items-center mb-8 pt-4">
          <div className="relative">
            <div className="absolute inset-0 bg-error/20 blur-2xl rounded-full"></div>
            <div className="relative bg-error/10 p-6 rounded-full border-4 border-error/30">
              <Lock className="w-16 h-16 text-error" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mt-6 text-error">System Locked</h2>
          <p className="text-base-content/60 text-center mt-2">
            All operations are blocked. Enter password to continue.
          </p>
        </div>

        {/* Warning Banner */}
        <div className="alert alert-error mb-6 shadow-lg">
          <AlertTriangle className="w-5 h-5" />
          <div className="flex-1">
            <div className="font-semibold">Access Restricted</div>
            <div className="text-sm opacity-80">Queue, drawing, and serial operations are disabled</div>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleUnlock} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold text-base">Enter Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••"
              className={`input input-bordered input-lg w-full text-center text-3xl tracking-[0.5em] font-bold ${
                error ? "input-error" : ""
              }`}
              maxLength={4}
              autoFocus
              disabled={loading}
            />
            {error && (
              <label className="label">
                <span className="label-text-alt text-error font-medium flex items-center gap-1">
                  <span>✕</span> {error}
                  {attempts > 2 && <span className="ml-2">({attempts} attempts)</span>}
                </span>
              </label>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-error btn-lg w-full text-lg gap-2"
            disabled={password.length !== 4 || loading}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner"></span>
                Unlocking...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Unlock System
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-base-300">
          <div className="text-center text-xs text-base-content/50 space-y-2">
            <p>
              <kbd className="kbd kbd-xs">Ctrl</kbd> + <kbd className="kbd kbd-xs">L</kbd> = Lock system
            </p>
            <p className="text-base-content/30">Password: 4 digits</p>
          </div>
        </div>
      </div>
      
      {/* Non-closeable backdrop */}
      <div className="modal-backdrop bg-black/80"></div>
    </div>
  );
};

export default LockModal;
