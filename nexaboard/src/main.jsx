import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "sonner";
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA using VitePWA
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, please reload.');
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  immediate: true
});

createRoot(document.getElementById("root")).render(
  <>
    <App />
    <Toaster position="top-center" richColors expand={false} duration={3000} />
  </>
);
