import { useState, useEffect } from "react";
import {
  BarChart3,
  Type,
  Image,
  List,
  FileCode,
  Camera,
  Pencil,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import LogoBox from "./LogoBox";
import SidebarButton from "./SidebarButton";

const Sidebar = ({ onNavigate, currentPage }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleNavigate = (page) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 size={20} /> },
    { id: "queue", label: "Queue", icon: <List size={20} /> },
    { id: "imageMode", label: "Image", icon: <Image size={20} /> },
    { id: "textMode", label: "Text", icon: <Type size={20} /> },
    { id: "draw", label: "Draw", icon: <Pencil size={20} /> },
    { id: "gcodeViewer", label: "G-code", icon: <FileCode size={20} /> },
    { id: "liveCam", label: "Camera", icon: <Camera size={20} /> },
    { id: "servoTest", label: "Servo Test", icon: <RotateCw size={20} /> },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex bg-base-100 h-screen transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-64"
        } flex-col border-r border-base-300`}
      >
        {/* Logo Section */}
        <div
          className={`${
            isCollapsed ? "py-5" : "py-4"
          } px-3 border-b border-base-300`}
        >
          {isCollapsed ? (
            <div className="flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">N</span>
            </div>
          ) : (
            <LogoBox />
          )}
        </div>

        {/* Navigation Section */}
        <div className="flex flex-col gap-1 py-3 px-2 flex-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <SidebarButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              onClick={() => onNavigate(item.id)}
              isCollapsed={isCollapsed}
              isActive={currentPage === item.id}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-base-300">
          <div className="p-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full p-2 rounded hover:bg-base-200 transition flex items-center justify-center gap-2 text-sm"
            >
              {isCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
              {!isCollapsed && <span>Collapse</span>}
            </button>
          </div>
          <div className="p-2">
            <button
              onClick={toggleTheme}
              className="w-full p-2 rounded hover:bg-base-200 transition flex items-center gap-2 text-sm"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {!isCollapsed && (
                <span>{theme === "dark" ? "Light" : "Dark"}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 z-50">
        <div className="grid grid-cols-5 gap-1 p-1">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded transition ${
                currentPage === item.id
                  ? "bg-primary text-primary-content"
                  : "text-base-content hover:bg-base-200"
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex flex-col items-center justify-center py-2 px-1 rounded transition hover:bg-base-200"
          >
            <Menu size={20} />
            <span className="text-xs mt-1">More</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="md:hidden fixed right-0 top-0 bottom-0 w-64 bg-base-100 z-50 shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-base-300">
              <span className="font-semibold">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded hover:bg-base-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {navItems.slice(4).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded mb-1 transition ${
                    currentPage === item.id
                      ? "bg-primary text-primary-content"
                      : "hover:bg-base-200"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-base-300 p-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 p-3 rounded hover:bg-base-200 transition"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Sidebar;
