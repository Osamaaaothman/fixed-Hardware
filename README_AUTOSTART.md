# 🚀 Nexaboard - Auto-Start on Raspberry Pi

Your Nexaboard application can now start automatically when your Raspberry Pi boots up!

## 📋 Quick Setup (One Command)

```bash
sudo ./install-autostart.sh
```

This will:
- ✅ Install all dependencies
- ✅ Build the frontend
- ✅ Configure systemd services
- ✅ Enable auto-start on boot
- ✅ Start services immediately

---

## 🌐 Access Your Nexaboard

After installation, find your Raspberry Pi's IP address:
```bash
hostname -I
```

Then access from any device on your network:
- **Frontend:** `http://<pi-ip>:3000`
- **Backend:** `http://<pi-ip>:5000`

**Example:** `http://192.168.1.100:3000`

---

## 🎯 Alternative: Manual Start/Stop

If you want to start services manually (without systemd):

### Start Nexaboard
```bash
./start-nexaboard.sh
```

### Stop Nexaboard
```bash
./stop-nexaboard.sh
```

---

## 🛠️ Manage Systemd Services

### Check Status
```bash
sudo systemctl status nexaboard-backend
sudo systemctl status nexaboard-frontend
```

### View Logs
```bash
sudo journalctl -u nexaboard-backend -f
sudo journalctl -u nexaboard-frontend -f
```

### Restart Services
```bash
sudo systemctl restart nexaboard-backend
sudo systemctl restart nexaboard-frontend
```

### Stop Auto-Start
```bash
sudo systemctl disable nexaboard-backend nexaboard-frontend
```

---

## 📚 Documentation

- **Full Setup Guide:** `RASPBERRY_PI_SETUP.md`
- **Quick Start (Image Mode):** `QUICK_START_IMAGE_MODE.md`
- **USB Issues:** `USB_CORRUPTION_CRITICAL.md`

---

## 🔧 Configuration Files

- `nexaboard-backend.service` - Backend systemd service
- `nexaboard-frontend.service` - Frontend systemd service
- `install-autostart.sh` - Auto-installation script
- `start-nexaboard.sh` - Manual start script
- `stop-nexaboard.sh` - Manual stop script

---

## 📊 What's Running

| Service  | Port | Path |
|----------|------|------|
| Frontend | 3000 | `/home/osama/code/fixed-Hardware/nexaboard` |
| Backend  | 5000 | `/home/osama/code/fixed-Hardware/Backend` |

---

## 🐛 Troubleshooting

### Services won't start?
```bash
# Check logs
sudo journalctl -u nexaboard-backend -n 50
sudo journalctl -u nexaboard-frontend -n 50
```

### Can't access from other devices?
```bash
# Allow ports in firewall
sudo ufw allow 3000
sudo ufw allow 5000
```

### Serial port permission issues?
```bash
# Add user to dialout group
sudo usermod -a -G dialout osama
sudo reboot
```

---

## ✨ Features

- ✅ **Auto-start on boot** - Nexaboard starts automatically
- ✅ **Network accessible** - Access from any device on your LAN
- ✅ **Auto-restart** - Services restart if they crash
- ✅ **Arduino no-reset** - Serial port configured to prevent Arduino reset
- ✅ **Production ready** - Optimized build for best performance

---

**Ready to install?** Run: `sudo ./install-autostart.sh`

For detailed instructions, see `RASPBERRY_PI_SETUP.md`
