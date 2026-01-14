import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed/running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone ||
                      document.referrer.includes('android-app://');
    
    setIsStandalone(standalone);
    console.log('InstallPWA: Is standalone?', standalone);

    if (standalone) {
      console.log('InstallPWA: Already running as PWA, hiding prompt');
      return;
    }

    const handler = (e) => {
      console.log("✅ beforeinstallprompt event fired!");
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if dismissed recently
      const dismissed = localStorage.getItem("pwa-dismissed");
      if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime < sevenDays) {
          console.log("InstallPWA: Dismissed recently, not showing");
          return;
        }
      }
      
      setShowInstall(true);
      console.log("✅ Install prompt will be shown!");
    };

    window.addEventListener("beforeinstallprompt", handler);
    
    console.log("InstallPWA: Listening for beforeinstallprompt event...");

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User install response: ${outcome}`);
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleDismiss = () => {
    console.log("User dismissed install toast");
    setShowInstall(false);
    // Don't show again for 7 days
    localStorage.setItem("pwa-dismissed", Date.now().toString());
  };

  // Don't show if already running as PWA
  if (isStandalone) {
    return null;
  }

  // Don't show if no prompt available
  if (!showInstall || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-base-100 border border-base-300 rounded-lg shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">Install NexaBoard</h3>
            <p className="text-xs text-base-content/70 mb-3">
              Install the app for quick access and offline support
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="btn btn-primary btn-sm flex-1"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="btn btn-ghost btn-sm btn-square"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
