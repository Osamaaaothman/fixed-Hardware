const StatusPage = () => {
  return (
    <div className="w-full h-full p-8 overflow-auto bg-base-100">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* System Status Card */}
          <div className="bg-base-200 rounded-xl p-6 shadow-lg border border-base-300 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">System Status</h3>
              <div className="badge badge-success gap-2">Online</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Connection</span>
                <span className="font-medium">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Uptime</span>
                <span className="font-medium">99.9%</span>
              </div>
            </div>
          </div>

          {/* Hardware Info Card */}
          <div className="bg-base-200 rounded-xl p-6 shadow-lg border border-base-300 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Hardware</h3>
              <div className="badge badge-info">Ready</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Device</span>
                <span className="font-medium">Connected</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Status</span>
                <span className="font-medium">Idle</span>
              </div>
            </div>
          </div>

          {/* Performance Card */}
          <div className="bg-base-200 rounded-xl p-6 shadow-lg border border-base-300 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Performance</h3>
              <div className="badge badge-warning">Monitor</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">CPU Usage</span>
                <span className="font-medium">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-base-content/70">Memory</span>
                <span className="font-medium">--</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-base-200 rounded-xl p-6 shadow-lg border border-base-300">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">System initialized</p>
                <p className="text-xs text-base-content/50">
                  Ready for operation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
              <div className="w-2 h-2 bg-info rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Waiting for input</p>
                <p className="text-xs text-base-content/50">No active tasks</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusPage;
