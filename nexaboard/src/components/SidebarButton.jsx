const SidebarButton = ({ label, icon, onClick, isCollapsed, isActive }) => {
  return (
    <button
      onClick={onClick}
      className={`relative btn btn-md w-full gap-3 transition-all duration-200 ${
        isCollapsed ? "justify-center px-0" : "justify-start pl-5 pr-4"
      } ${
        isActive
          ? "bg-primary text-primary-content hover:bg-primary/90 shadow-lg border-2 border-primary-content/20"
          : "btn-ghost hover:bg-base-300 hover:border-2 hover:border-base-content/10"
      }`}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary-content rounded-r-lg"></div>
      )}
      
      <span className={`shrink-0 ${isActive ? "scale-110" : ""}`}>
        {icon}
      </span>
      {!isCollapsed && (
        <span className="text-base font-bold truncate">
          {label}
        </span>
      )}
    </button>
  );
};

export default SidebarButton;
