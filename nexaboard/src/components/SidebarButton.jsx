const SidebarButton = ({ label, icon, onClick, isCollapsed, isActive }) => {
  return (
    <button
      onClick={onClick}
      className={`relative w-full p-2.5 rounded transition-all flex items-center gap-3 ${
        isCollapsed ? "justify-center" : "justify-start"
      } ${isActive ? "bg-primary text-primary-content" : "hover:bg-base-200"}`}
    >
      <span className="shrink-0">{icon}</span>
      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{label}</span>
      )}
    </button>
  );
};

export default SidebarButton;
