# 📱 Install NexaBoard as a PWA (App)

Your NexaBoard now supports PWA (Progressive Web App) installation! You can install it as a native-like app on your phone, tablet, or desktop.

---

## 📱 Install on Android (Chrome/Edge)

1. **Open Chrome or Edge browser** on your Android phone
2. **Go to:** `http://192.168.1.34:3000`
3. **Tap the menu (⋮)** in the top-right corner
4. **Select "Install app"** or "Add to Home screen"
5. **Tap "Install"** in the popup
6. **Done!** NexaBoard is now on your home screen

**Alternative:**
- Look for the **install icon** (⊕ or ⬇) in the address bar
- Tap it and select "Install"

---

## 🍎 Install on iPhone/iPad (Safari)

1. **Open Safari** on your iPhone/iPad
2. **Go to:** `http://192.168.1.34:3000`
3. **Tap the Share button** (□ with arrow pointing up)
4. **Scroll down** and tap **"Add to Home Screen"**
5. **Tap "Add"** in the top-right corner
6. **Done!** NexaBoard icon appears on your home screen

**Note:** Safari doesn't show service worker notifications, but the app will work offline after first visit!

---

## 💻 Install on Desktop (Chrome/Edge/Brave)

1. **Open Chrome, Edge, or Brave browser**
2. **Go to:** `http://192.168.1.34:3000`
3. **Look for the install icon** (⊕ or computer icon) in the address bar
4. **Click it** and select "Install"
5. **Done!** NexaBoard opens as a standalone app

**Alternative:**
- Click the **menu (⋮)** → **"Install NexaBoard..."**
- Or press `Ctrl+Shift+I` → Application tab → Manifest → "Install"

---

## ✨ PWA Features

Once installed, NexaBoard will:

✅ **Work like a native app** - No browser UI, full screen
✅ **Appear on home screen** - Launch from your app drawer
✅ **Work offline** (after first load) - Basic functionality available
✅ **Cache API calls** - Faster loading and better performance
✅ **Auto-update** - Gets new features automatically
✅ **Push notifications ready** - Can be enabled in future

---

## 🔍 Verify PWA Installation

### On Phone:
- **Look for the NexaBoard icon** on your home screen
- **Purple icon with whiteboard logo**

### On Desktop:
- **Check your app list** (Start menu on Windows, Applications on Mac)
- **Look for "NexaBoard"**

---

## 🐛 Troubleshooting

### "Install" button doesn't appear?

**Possible reasons:**
1. **Not using HTTPS** - PWA works on localhost and local IPs without HTTPS
2. **Already installed** - Uninstall first, then try again
3. **Browser doesn't support PWA** - Use Chrome, Edge, or Safari
4. **Manifest error** - Check browser console for errors

### Test PWA Readiness:

1. Open browser DevTools (`F12` or `Ctrl+Shift+I`)
2. Go to **Application** tab
3. Check **Manifest** section - Should show NexaBoard details
4. Check **Service Workers** - Should show "activated and running"

### Clear PWA Cache:

If you need to force reload:

**On Phone:**
- Uninstall the app
- Clear browser cache
- Reinstall

**On Desktop:**
- DevTools → Application → Storage → "Clear site data"
- Or uninstall and reinstall

---

## 🔄 Update the PWA

Updates happen automatically! When you rebuild the frontend:

1. **Rebuild:** `npm run build`
2. **Restart service:** `sudo systemctl restart nexaboard-frontend`
3. **PWA auto-updates** on next visit

---

## 📊 PWA Status Check

To verify PWA is working:

```bash
# Check if manifest is accessible
curl http://192.168.1.34:3000/manifest.webmanifest

# Check if service worker exists
curl http://192.168.1.34:3000/sw.js

# View frontend logs
sudo journalctl -u nexaboard-frontend -f
```

---

## 🎯 What's Cached?

The PWA caches:
- ✅ All static assets (JS, CSS, HTML)
- ✅ Icons and images
- ✅ API responses (for 1 hour)
- ✅ Fonts

**Not cached:**
- ❌ Live serial communication
- ❌ Socket.IO real-time updates
- ❌ Camera streams

---

## 🌐 Access URLs

- **Web:** `http://192.168.1.34:3000`
- **Backend API:** `http://192.168.1.34:5000`
- **PWA Manifest:** `http://192.168.1.34:3000/manifest.webmanifest`
- **Service Worker:** `http://192.168.1.34:3000/sw.js`

---

## 🎨 App Details

- **Name:** NexaBoard - Smart Whiteboard Controller
- **Short Name:** NexaBoard
- **Theme Color:** Purple (#8b5cf6)
- **Display Mode:** Standalone (full screen, no browser UI)
- **Orientation:** Any (portrait/landscape)

---

**Ready to install?** Open `http://192.168.1.34:3000` on your phone and look for the "Install" button! 📲
