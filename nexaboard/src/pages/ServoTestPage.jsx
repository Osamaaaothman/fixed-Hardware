import React, { useState } from 'react';
import { Send, RotateCw, Activity } from 'lucide-react';
import { sendSerialCommand } from '../api/serialApi';

const ServoTestPage = () => {
  const [angle, setAngle] = useState(90);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [logs, setLogs] = useState([]);

  const sendServoCommand = async (servoAngle) => {
    setIsLoading(true);
    const command = `M3 S${servoAngle}`;
    
    // Add to logs
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, {
      time: timestamp,
      type: 'sent',
      message: command
    }]);

    try {
      const result = await sendSerialCommand(command);
      
      setResponse(result);
      
      // Add response to logs
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        type: result.success ? 'success' : 'error',
        message: result.success 
          ? `✅ Servo set to ${servoAngle}° ${result.mockMode ? '(Mock Mode)' : '(Hardware)'}` 
          : `❌ Error: ${result.error}`
      }]);
    } catch (error) {
      setLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        type: 'error',
        message: `❌ Error: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResponse(null);
  };

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            🎯 Servo Control Terminal
          </h1>
          <p className="text-base-content/70">
            Test Raspberry Pi GPIO Servo with M3 Commands
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Servo Control Panel */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                <RotateCw className="w-6 h-6" />
                Servo Control
              </h2>

              {/* Angle Slider */}
              <div className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Servo Angle</span>
                    <span className="label-text-alt text-2xl font-bold text-primary">
                      {angle}°
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={angle}
                    onChange={(e) => setAngle(parseInt(e.target.value))}
                    className="range range-primary"
                    step="1"
                  />
                  <div className="w-full flex justify-between text-xs px-2">
                    <span>0°</span>
                    <span>45°</span>
                    <span>90°</span>
                    <span>135°</span>
                    <span>180°</span>
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={() => sendServoCommand(angle)}
                  disabled={isLoading}
                  className="btn btn-primary btn-lg w-full"
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-md"></span>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send M3 S{angle}
                    </>
                  )}
                </button>

                {/* Quick Angle Buttons */}
                <div className="divider">Quick Angles</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => sendServoCommand(0)}
                    disabled={isLoading}
                    className="btn btn-outline btn-sm"
                  >
                    0° (Up)
                  </button>
                  <button
                    onClick={() => sendServoCommand(90)}
                    disabled={isLoading}
                    className="btn btn-outline btn-sm"
                  >
                    90° (Middle)
                  </button>
                  <button
                    onClick={() => sendServoCommand(180)}
                    disabled={isLoading}
                    className="btn btn-outline btn-sm"
                  >
                    180° (Down)
                  </button>
                </div>

                {/* Sweep Test */}
                <div className="divider">Test Patterns</div>
                <button
                  onClick={async () => {
                    for (let i = 0; i <= 180; i += 30) {
                      await sendServoCommand(i);
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                  }}
                  disabled={isLoading}
                  className="btn btn-secondary btn-sm w-full"
                >
                  <Activity className="w-4 h-4" />
                  Sweep Test (0° → 180°)
                </button>
              </div>

              {/* Response Display */}
              {response && (
                <div className="mt-6">
                  <div className="divider">Last Response</div>
                  <div className={`alert ${response.success ? 'alert-success' : 'alert-error'}`}>
                    <div className="flex flex-col items-start w-full">
                      <span className="font-semibold">{response.message}</span>
                      {response.success && (
                        <div className="text-xs mt-2 space-y-1">
                          <div>Angle: {response.angle}°</div>
                          {response.mockMode !== undefined && (
                            <div>Mode: {response.mockMode ? 'SIMULATION' : 'HARDWARE'}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Console/Logs Panel */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title text-2xl">
                  <Activity className="w-6 h-6" />
                  Console
                </h2>
                <button
                  onClick={clearLogs}
                  className="btn btn-ghost btn-sm"
                >
                  Clear
                </button>
              </div>

              {/* Logs Display */}
              <div className="bg-base-300 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-base-content/50 text-center mt-10">
                    No commands sent yet. Use the controls to test the servo.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className={`flex gap-2 ${
                          log.type === 'sent' ? 'text-info' :
                          log.type === 'success' ? 'text-success' :
                          log.type === 'error' ? 'text-error' :
                          'text-base-content'
                        }`}
                      >
                        <span className="text-base-content/50">[{log.time}]</span>
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">ℹ️ Information</h3>
            <div className="text-sm space-y-2">
              <p><strong>M3 Commands:</strong> Control the Raspberry Pi GPIO servo (Pin 18)</p>
              <p><strong>Format:</strong> M3 S&lt;angle&gt; where angle is 0-180 degrees</p>
              <p><strong>Examples:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li><code className="bg-base-300 px-2 py-1 rounded">M3 S0</code> - Servo to 0° (pen up)</li>
                <li><code className="bg-base-300 px-2 py-1 rounded">M3 S90</code> - Servo to 90° (middle)</li>
                <li><code className="bg-base-300 px-2 py-1 rounded">M3 S180</code> - Servo to 180° (pen down)</li>
              </ul>
              <p className="text-warning"><strong>Note:</strong> M3 commands are intercepted and sent to Raspberry Pi GPIO, NOT to CNC or Box.</p>
              {response?.mockMode && (
                <p className="text-info"><strong>Mock Mode:</strong> GPIO hardware not available. Running in simulation mode.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ServoTestPage;
