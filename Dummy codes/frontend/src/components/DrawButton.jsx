import { useState, useRef, useEffect } from "react";
import "./DrawButton.css";

function DrawButton({ gcode, disabled }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentProgress, setCurrentProgress] = useState({
    current: 0,
    total: 0,
  });
  const logsEndRef = useRef(null);
  const readerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleDraw = async () => {
    if (!gcode) {
      setError("No G-code available");
      return;
    }

    setIsDrawing(true);
    setIsPaused(false);
    setError(null);
    setLogs([]);
    setCurrentProgress({ current: 0, total: 0 });
    setProgress("Connecting to Arduino...");

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("http://localhost:5000/api/serial/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gcode: gcode,
          port: "COM4",
          baudRate: 115200,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to connect to Arduino");
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      // Read stream
      const readStream = async () => {
        try {
          while (true) {
            // Check if paused
            while (isPaused && isDrawing) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            const { done, value } = await reader.read();

            if (done) {
              setIsDrawing(false);
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim()) {
                processSSEMessage(line);
              }
            }
          }
        } catch (err) {
          if (err.name === "AbortError") {
            addLog(Date.now(), "Drawing cancelled by user", "error");
            setProgress("❌ Drawing cancelled");
          } else {
            console.error("Stream error:", err);
            setError(err.message);
          }
          setIsDrawing(false);
        }
      };

      readStream();
    } catch (err) {
      if (err.name === "AbortError") {
        setProgress("❌ Drawing cancelled");
      } else {
        setError(err.message);
        setProgress(null);
      }
      setIsDrawing(false);
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      setProgress("⏸️ Paused - Click Resume to continue");
      addLog(Date.now(), "Drawing paused", "status");
    } else {
      setProgress("▶️ Resuming...");
      addLog(Date.now(), "Drawing resumed", "status");
    }
  };

  const handleCancel = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.error("Error cancelling reader:", e);
      }
    }

    setIsDrawing(false);
    setIsPaused(false);
    setProgress("❌ Drawing cancelled");
    addLog(Date.now(), "Drawing cancelled by user", "error");
  };

  const processSSEMessage = (message) => {
    const lines = message.split("\n");
    let eventType = "message";
    let data = null;

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith("data:")) {
        try {
          data = JSON.parse(line.substring(5).trim());
        } catch (e) {
          console.error("Failed to parse SSE data:", e);
        }
      }
    }

    if (!data) return;

    switch (eventType) {
      case "status":
        setProgress(data.message);
        addLog(data.timestamp, data.message, "status");
        break;

      case "progress":
        setCurrentProgress({ current: data.current, total: data.total });
        setProgress(
          `Sending line ${data.current}/${data.total}: ${data.line.substring(
            0,
            30
          )}...`
        );
        break;

      case "log":
        addLog(data.timestamp, data.message, "arduino");
        break;

      case "complete":
        setProgress(`✅ Drawing complete in ${data.totalTime}!`);
        addLog(
          data.timestamp,
          `Completed! Total lines: ${data.totalLines}, Time: ${data.totalTime}`,
          "complete"
        );
        setIsDrawing(false);
        break;

      case "error":
        setError(data.message);
        addLog(data.timestamp, `Error: ${data.message}`, "error");
        setIsDrawing(false);
        break;
    }
  };

  const addLog = (timestamp, message, type = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp,
        message,
        type,
      },
    ]);
  };

  return (
    <div className="draw-button-container">
      {isDrawing && currentProgress.total > 0 && (
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{
              width: `${
                (currentProgress.current / currentProgress.total) * 100
              }%`,
            }}
          />
          <span className="progress-text">
            {currentProgress.current}/{currentProgress.total} lines
            {isPaused && " (PAUSED)"}
          </span>
        </div>
      )}
      {logs.length > 0 && (
        <div className="draw-logs">
          <h4>Arduino Response Log (Real-time):</h4>
          <div className="logs-container">
            {logs.map((log, index) => (
              <div key={index} className={`log-entry log-${log.type}`}>
                <span className="log-time">
                  [{(log.timestamp / 1000).toFixed(2)}s]
                </span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {progress && (
        <div className="draw-progress">
          <p className="progress-message">{progress}</p>
        </div>
      )}

      {error && (
        <div className="draw-error">
          <p>❌ Error: {error}</p>
          <small>Make sure Arduino is connected to COM4</small>
        </div>
      )}
      <div className="button-group">
        <button
          className="draw-button"
          onClick={handleDraw}
          disabled={disabled || isDrawing || !gcode}
        >
          {isDrawing ? "🔄 Drawing..." : "🖊️ Draw on CNC"}
        </button>

        {isDrawing && (
          <>
            <button className="pause-button" onClick={handlePauseResume}>
              {isPaused ? "▶️ Resume" : "⏸️ Pause"}
            </button>
            <button className="cancel-button" onClick={handleCancel}>
              ❌ Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default DrawButton;
