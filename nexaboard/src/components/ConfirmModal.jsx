import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import PropTypes from "prop-types";

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "info", // 'info', 'warning', 'error', 'success'
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "btn-primary",
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-12 h-12 text-warning" />;
      case "error":
        return <XCircle className="w-12 h-12 text-error" />;
      case "success":
        return <CheckCircle className="w-12 h-12 text-success" />;
      default:
        return <Info className="w-12 h-12 text-info" />;
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-4">{getIcon()}</div>

        {/* Title */}
        <h3 className="font-bold text-lg text-center mb-2">{title}</h3>

        {/* Message */}
        <p className="text-center text-base-content/70 mb-6">{message}</p>

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <button onClick={onClose} className="btn btn-ghost">
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`btn ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(["info", "warning", "error", "success"]),
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmButtonClass: PropTypes.string,
};

export default ConfirmModal;
