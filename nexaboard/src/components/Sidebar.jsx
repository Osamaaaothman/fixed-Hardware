import { useState, useEffect } from "react";
import {
  BarChart3,
  Type,
  Image,
  List,
  FileCode,
  Camera,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import LogoBox from "./LogoBox";
import SidebarButton from "./SidebarButton";

const Sidebar = ({ onNavigate, currentPage }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div
      className={`bg-base-200 h-screen transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-72"
      } flex flex-col border-r border-base-300 shadow-xl`}
    >
      {/* Logo Section */}
      <div
        className={`${
          isCollapsed ? "py-6" : "py-4"
        } px-4 border-b border-base-300`}
      >
        {isCollapsed ? (
          <div className="flex items-center justify-center">
            <span className="text-3xl font-black text-primary">N</span>
          </div>
        ) : (
          <LogoBox />
        )}
      </div>

      {/* Toggle Button */}
      <div className="px-4 py-3 border-b border-base-300/50">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="btn btn-sm btn-ghost w-full gap-2 hover:bg-base-300"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isCollapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>

      {/* Navigation Section */}
      <div className="flex flex-col gap-3 py-4 px-3 flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <SidebarButton
          label="Dashboard"
          icon={<BarChart3 size={22} />}
          onClick={() => onNavigate("dashboard")}
          isCollapsed={isCollapsed}
          isActive={currentPage === "dashboard"}
        />
        <SidebarButton
          label="Text Mode"
          icon={<Type size={22} />}
          onClick={() => onNavigate("textMode")}
          isCollapsed={isCollapsed}
          isActive={currentPage === "textMode"}
        />
        <SidebarButton
          label="Image Mode"
          icon={<Image size={22} />}
          onClick={() => onNavigate("imageMode")}
          isCollapsed={isCollapsed}
          isActive={currentPage === "imageMode"}
        />
        <SidebarButton
          label="Draw"
          icon={<Pencil size={22} />}
          onClick={() => onNavigate("draw")}
          isCollapsed={isCollapsed}
          isActive={currentPage === "draw"}
        />
        <SidebarButton
          label="G-code Viewer"
          icon={<FileCode size={22} />}
          onClick={() => onNavigate("gcodeViewer")}
          isCollapsed={isCollapsed}
          isActive={currentPage === "gcodeViewer"}
        />
        <SidebarButton
          label="Live Cam"
          icon={<Camera size={22} />}
          onClick={() => onNavigate("liveCam")}
          isCollapsed={isCollapsed}
          isActive={currentPage === "liveCam"}
        />
        <SidebarButton
          label="Queue"
          icon={<List size={22} />}
          onClick={() => onNavigate("queue")}
          isCollapsed={isCollapsed}
          isActive={currentPage === "queue"}
        />
      </div>

      {/* Theme Toggle Section */}
      <div className="mt-auto p-3 border-t border-base-300">
        <SidebarButton
          label={theme === "dark" ? "Light Mode" : "Dark Mode"}
          icon={theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
          onClick={toggleTheme}
          isCollapsed={isCollapsed}
          isActive={false}
        />
      </div>
    </div>
  );
};

export default Sidebar;
