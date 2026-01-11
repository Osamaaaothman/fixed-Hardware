import { Play, Trash2, Package, Loader2, SkipForward } from "lucide-react";

const QueueControls = ({
  queueStats,
  onProcess,
  onProcessNext,
  onClear,
  isProcessing = false,
}) => {
  const {
    total = 0,
    pending = 0,
    processing = 0,
    completed = 0,
    failed = 0,
  } = queueStats || {};

  return (
    <div className="bg-base-100/80 backdrop-blur-sm rounded-3xl p-5 shadow-2xl border-2 border-base-300/50">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <div className="bg-gradient-to-br from-base-200 to-base-300 rounded-2xl p-3 border border-base-content/10">
          <div className="text-[10px] font-semibold text-base-content/50 uppercase tracking-wide mb-1">
            Total
          </div>
          <div className="text-2xl font-bold">{total}</div>
        </div>

        <div className="bg-gradient-to-br from-warning/20 to-warning/10 rounded-2xl p-3 border border-warning/30">
          <div className="text-[10px] font-semibold text-warning/70 uppercase tracking-wide mb-1">
            Pending
          </div>
          <div className="text-2xl font-bold text-warning">{pending}</div>
        </div>

        <div className="bg-gradient-to-br from-info/20 to-info/10 rounded-2xl p-3 border border-info/30">
          <div className="text-[10px] font-semibold text-info/70 uppercase tracking-wide mb-1">
            Processing
          </div>
          <div className="text-2xl font-bold text-info">{processing}</div>
        </div>

        <div className="bg-gradient-to-br from-success/20 to-success/10 rounded-2xl p-3 border border-success/30">
          <div className="text-[10px] font-semibold text-success/70 uppercase tracking-wide mb-1">
            Completed
          </div>
          <div className="text-2xl font-bold text-success">{completed}</div>
        </div>

        <div className="bg-gradient-to-br from-error/20 to-error/10 rounded-2xl p-3 border border-error/30">
          <div className="text-[10px] font-semibold text-error/70 uppercase tracking-wide mb-1">
            Failed
          </div>
          <div className="text-2xl font-bold text-error">{failed}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onProcessNext}
          disabled={pending === 0 || isProcessing}
          className="btn btn-primary btn-sm flex-1 gap-2 shadow-lg hover:shadow-xl"
        >
          <SkipForward className="w-4 h-4" />
          Draw Next Item
        </button>

        <button
          onClick={onClear}
          disabled={total === 0 || isProcessing}
          className="btn btn-error btn-outline btn-sm gap-2 shadow-lg hover:shadow-xl"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </button>
      </div>

      {/* Info Message */}
      {pending > 0 && !isProcessing && (
        <div className="alert alert-info mt-3 py-2 rounded-xl shadow-lg">
          <Package className="w-4 h-4" />
          <span className="text-xs font-medium">
            {pending} item{pending !== 1 ? "s" : ""} ready to be drawn.
          </span>
        </div>
      )}

      {isProcessing && (
        <div className="alert alert-warning mt-3 py-2 rounded-xl shadow-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-medium">Processing queue...</span>
        </div>
      )}

      {total === 0 && (
        <div className="alert mt-3 py-2 rounded-xl shadow-lg">
          <Package className="w-4 h-4" />
          <span className="text-xs font-medium">
            Queue is empty. Add items from Image or Text mode.
          </span>
        </div>
      )}
    </div>
  );
};

export default QueueControls;
