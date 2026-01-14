# Nexaboard Raspberry Pi Auto-Start Setup

This guide will help you set up your Nexaboard application to start automatically when your Raspberry Pi boots up, making it accessible from any device on your local network.

## Quick Installation

Run this single command to install and configure everything:

```bash
sudo /home/osama/code/fixed-Hardware/install-autostart.sh
```

That's it! Your Nexaboard will now start automatically on boot.

---

## What Gets Installed

The installation script will:

1. ✅ Install all dependencies for backend and frontend
2. ✅ Build the frontend for production
3. ✅ Create systemd services for both backend and frontend
4. ✅ Enable automatic startup on boot
5. ✅ Start the services immediately

---

## Accessing Your Nexaboard

After installation, you can access Nexaboard from any device on your local network:

### Find Your Raspberry Pi's IP Address
```bash
hostname -I
```

### Access URLs

- **Frontend (Main Application):** `http://<raspberry-pi-ip>:3000`
- **Backend API:** `http://<raspberry-pi-ip>:5000`

**Example:**
- If your Raspberry Pi IP is `192.168.1.100`
- Frontend: `http://192.168.1.100:3000`
- Backend: `http://192.168.1.100:5000`

---

## Service Management Commands

### Check Service Status
```bash
# Backend status
sudo systemctl status nexaboard-backend

# Frontend status
sudo systemctl status nexaboard-frontend
```

### View Logs
```bash
# Backend logs (real-time)
sudo journalctl -u nexaboard-backend -f

# Frontend logs (real-time)
sudo journalctl -u nexaboard-frontend -f

# Last 50 lines of backend logs
sudo journalctl -u nexaboard-backend -n 50

# Last 50 lines of frontend logs
sudo journalctl -u nexaboard-frontend -n 50
```

### Restart Services
```bash
# Restart backend
sudo systemctl restart nexaboard-backend

# Restart frontend
sudo systemctl restart nexaboard-frontend

# Restart both
sudo systemctl restart nexaboard-backend nexaboard-frontend
```

### Stop Services
```bash
# Stop backend
sudo systemctl stop nexaboard-backend

# Stop frontend
sudo systemctl stop nexaboard-frontend

# Stop both
sudo systemctl stop nexaboard-backend nexaboard-frontend
```

### Start Services
```bash
# Start backend
sudo systemctl start nexaboard-backend

# Start frontend
sudo systemctl start nexaboard-frontend

# Start both
sudo systemctl start nexaboard-backend nexaboard-frontend
```

### Disable Auto-Start
```bash
# Disable auto-start on boot
sudo systemctl disable nexaboard-backend
sudo systemctl disable nexaboard-frontend
```

### Enable Auto-Start
```bash
# Enable auto-start on boot
sudo systemctl enable nexaboard-backend
sudo systemctl enable nexaboard-frontend
```

---

## Configuration Details

### Backend Service
- **Location:** `/etc/systemd/system/nexaboard-backend.service`
- **Port:** 5000
- **Working Directory:** `/home/osama/code/fixed-Hardware/Backend`
- **Command:** `node index.js`

### Frontend Service
- **Location:** `/etc/systemd/system/nexaboard-frontend.service`
- **Port:** 3000
- **Working Directory:** `/home/osama/code/fixed-Hardware/nexaboard`
- **Command:** `npx vite preview --host 0.0.0.0 --port 3000`

---

## Troubleshooting

### Services Won't Start

1. **Check if ports are already in use:**
   ```bash
   sudo lsof -i :5000  # Backend
   sudo lsof -i :3000  # Frontend
   ```

2. **Check service status:**
   ```bash
   sudo systemctl status nexaboard-backend
   sudo systemctl status nexaboard-frontend
   ```

3. **View error logs:**
   ```bash
   sudo journalctl -u nexaboard-backend -n 50
   sudo journalctl -u nexaboard-frontend -n 50
   ```

### Arduino/Serial Port Issues

If you get permission errors for `/dev/ttyUSB0` or `/dev/ttyACM0`:

```bash
# Add user to dialout group
sudo usermod -a -G dialout osama

# Reboot for changes to take effect
sudo reboot
```

### Can't Access from Other Devices

1. **Check firewall:**
   ```bash
   # Allow ports through firewall
   sudo ufw allow 3000
   sudo ufw allow 5000
   ```

2. **Verify Raspberry Pi IP:**
   ```bash
   hostname -I
   ```

3. **Test from Raspberry Pi itself:**
   ```bash
   curl http://localhost:5000
   curl http://localhost:3000
   ```

### Frontend Can't Connect to Backend

The frontend automatically detects the backend URL based on the hostname. If you're having issues:

1. Check that both services are running
2. Verify the backend is accessible: `curl http://localhost:5000`
3. Check browser console for errors

---

## Manual Installation (Alternative)

If you prefer to install manually:

### 1. Install Dependencies
```bash
cd /home/osama/code/fixed-Hardware/Backend
npm install --production

cd /home/osama/code/fixed-Hardware/nexaboard
npm install
```

### 2. Build Frontend
```bash
cd /home/osama/code/fixed-Hardware/nexaboard
npm run build
```

### 3. Copy Service Files
```bash
sudo cp /home/osama/code/fixed-Hardware/nexaboard-backend.service /etc/systemd/system/
sudo cp /home/osama/code/fixed-Hardware/nexaboard-frontend.service /etc/systemd/system/
```

### 4. Enable and Start Services
```bash
sudo systemctl daemon-reload
sudo systemctl enable nexaboard-backend nexaboard-frontend
sudo systemctl start nexaboard-backend nexaboard-frontend
```

---

## Uninstallation

To remove auto-start and stop services:

```bash
# Stop services
sudo systemctl stop nexaboard-backend nexaboard-frontend

# Disable auto-start
sudo systemctl disable nexaboard-backend nexaboard-frontend

# Remove service files
sudo rm /etc/systemd/system/nexaboard-backend.service
sudo rm /etc/systemd/system/nexaboard-frontend.service

# Reload systemd
sudo systemctl daemon-reload
```

---

## Performance Tips

### For Better Performance on Raspberry Pi:

1. **Use Raspberry Pi 3B+ or newer** (recommended: Raspberry Pi 4)
2. **Overclock** (optional, but helps):
   ```bash
   sudo raspi-config
   # Navigate to: Performance Options > Overclock
   ```

3. **Reduce memory usage:**
   - Close unnecessary applications
   - Disable desktop environment if running headless

4. **Use a good power supply** (minimum 2.5A for Pi 3, 3A for Pi 4)

---

## Setting Static IP (Recommended)

To ensure your Raspberry Pi always has the same IP address:

1. **Edit dhcpcd.conf:**
   ```bash
   sudo nano /etc/dhcpcd.conf
   ```

2. **Add these lines** (adjust for your network):
   ```
   interface eth0
   static ip_address=192.168.1.100/24
   static routers=192.168.1.1
   static domain_name_servers=192.168.1.1 8.8.8.8
   ```

3. **Reboot:**
   ```bash
   sudo reboot
   ```

---

## Support

If you encounter issues:

1. Check the logs: `sudo journalctl -u nexaboard-backend -n 100`
2. Verify network connectivity: `ping 8.8.8.8`
3. Check serial port permissions: `ls -l /dev/ttyUSB0`
4. Ensure Node.js is installed: `node --version`

---

## Files Created

- `/etc/systemd/system/nexaboard-backend.service` - Backend systemd service
- `/etc/systemd/system/nexaboard-frontend.service` - Frontend systemd service
- `install-autostart.sh` - Installation script
- `RASPBERRY_PI_SETUP.md` - This documentation

---

**Last Updated:** January 14, 2026
