import { Plus, X } from "lucide-react";
import { useState } from "react";
import PropTypes from "prop-types";

const FloatingActionButton = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!actions || actions.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 md:hidden z-40">
      {/* Action Menu */}
      {isOpen && (
        <div className="mb-3 space-y-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className="btn btn-sm btn-primary gap-2 shadow-lg w-full"
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`btn btn-circle btn-lg shadow-lg transition-transform ${
          isOpen ? "btn-error rotate-45" : "btn-primary"
        }`}
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>
  );
};

FloatingActionButton.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.node.isRequired,
      onClick: PropTypes.func.isRequired,
    })
  ),
};

export default FloatingActionButton;
