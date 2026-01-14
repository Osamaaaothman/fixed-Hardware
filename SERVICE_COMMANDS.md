# 🔄 Restart Services After Code Changes

## Quick Commands

### Backend Changes Only
```bash
sudo systemctl restart nexaboard-backend
```

### Frontend Changes Only
```bash
cd /home/osama/code/fixed-Hardware/nexaboard && npm run build && sudo systemctl restart nexaboard-frontend
```

### Both Backend & Frontend
```bash
cd /home/osama/code/fixed-Hardware/nexaboard && npm run build && sudo systemctl restart nexaboard-backend nexaboard-frontend
```

---

## 📊 Check Service Status

### Check if services are running
```bash
# Backend status
sudo systemctl status nexaboard-backend

# Frontend status
sudo systemctl status nexaboard-frontend

# Both
sudo systemctl status nexaboard-backend nexaboard-frontend
```

---

## 📝 View Logs

### Real-time logs (Live)
```bash
# Backend logs (live)
sudo journalctl -u nexaboard-backend -f

# Frontend logs (live)
sudo journalctl -u nexaboard-frontend -f

# Both logs together
sudo journalctl -u nexaboard-backend -u nexaboard-frontend -f
```

### Last 50 lines
```bash
# Backend last 50 lines
sudo journalctl -u nexaboard-backend -n 50

# Frontend last 50 lines
sudo journalctl -u nexaboard-frontend -n 50
```

### Last 100 lines
```bash
sudo journalctl -u nexaboard-backend -n 100
sudo journalctl -u nexaboard-frontend -n 100
```

---

## 🛑 Stop Services

```bash
# Stop backend
sudo systemctl stop nexaboard-backend

# Stop frontend
sudo systemctl stop nexaboard-frontend

# Stop both
sudo systemctl stop nexaboard-backend nexaboard-frontend
```

---

## ▶️ Start Services

```bash
# Start backend
sudo systemctl start nexaboard-backend

# Start frontend
sudo systemctl start nexaboard-frontend

# Start both
sudo systemctl start nexaboard-backend nexaboard-frontend
```

---

## 🔄 Restart Services

```bash
# Restart backend
sudo systemctl restart nexaboard-backend

# Restart frontend
sudo systemctl restart nexaboard-frontend

# Restart both
sudo systemctl restart nexaboard-backend nexaboard-frontend
```

---

## 🚫 Disable Auto-Start (Stop running on boot)

```bash
# Disable backend auto-start
sudo systemctl disable nexaboard-backend

# Disable frontend auto-start
sudo systemctl disable nexaboard-frontend

# Disable both
sudo systemctl disable nexaboard-backend nexaboard-frontend
```

---

## ✅ Enable Auto-Start (Start on boot)

```bash
# Enable backend auto-start
sudo systemctl enable nexaboard-backend

# Enable frontend auto-start
sudo systemctl enable nexaboard-frontend

# Enable both
sudo systemctl enable nexaboard-backend nexaboard-frontend
```

---

## 🔧 Development Workflow

### When you edit Backend code:
```bash
# 1. Edit your code in Backend/
# 2. Restart backend
sudo systemctl restart nexaboard-backend

# 3. Check logs for errors
sudo journalctl -u nexaboard-backend -f
```

### When you edit Frontend code:
```bash
# 1. Edit your code in nexaboard/src/
# 2. Rebuild and restart
cd /home/osama/code/fixed-Hardware/nexaboard && npm run build && sudo systemctl restart nexaboard-frontend

# 3. Check logs for errors
sudo journalctl -u nexaboard-frontend -f
```

---

## 💡 Create Bash Aliases (Optional)

Add these to your `~/.bashrc` for quick commands:

```bash
# Edit bashrc
nano ~/.bashrc

# Add these lines at the end:
alias restart-backend='sudo systemctl restart nexaboard-backend'
alias restart-frontend='cd /home/osama/code/fixed-Hardware/nexaboard && npm run build && sudo systemctl restart nexaboard-frontend'
alias restart-nexaboard='cd /home/osama/code/fixed-Hardware/nexaboard && npm run build && sudo systemctl restart nexaboard-backend nexaboard-frontend'
alias logs-backend='sudo journalctl -u nexaboard-backend -f'
alias logs-frontend='sudo journalctl -u nexaboard-frontend -f'
alias status-nexaboard='sudo systemctl status nexaboard-backend nexaboard-frontend'

# Save and reload bashrc
source ~/.bashrc
```

**Then you can use:**
```bash
restart-backend       # Restart backend only
restart-frontend      # Rebuild & restart frontend
restart-nexaboard     # Rebuild & restart both
logs-backend          # View backend logs
logs-frontend         # View frontend logs
status-nexaboard      # Check status of both
```

---

## 🔍 Troubleshooting

### Service won't start?
```bash
# Check detailed status
sudo systemctl status nexaboard-backend -l
sudo systemctl status nexaboard-frontend -l

# View all logs
sudo journalctl -u nexaboard-backend -n 200
sudo journalctl -u nexaboard-frontend -n 200

# Check if port is already in use
sudo lsof -i :5000  # Backend
sudo lsof -i :3000  # Frontend
```

### Kill process using port
```bash
# Find process ID
sudo lsof -i :5000
sudo lsof -i :3000

# Kill it
sudo kill -9 <PID>
```

### Reset everything
```bash
# Stop services
sudo systemctl stop nexaboard-backend nexaboard-frontend

# Reload systemd
sudo systemctl daemon-reload

# Start services
sudo systemctl start nexaboard-backend nexaboard-frontend
```

---

## 📍 File Locations

- **Service Files:** `/etc/systemd/system/nexaboard-*.service`
- **Backend Code:** `/home/osama/code/fixed-Hardware/Backend/`
- **Frontend Code:** `/home/osama/code/fixed-Hardware/nexaboard/src/`
- **Frontend Build:** `/home/osama/code/fixed-Hardware/nexaboard/dist/`
- **Logs:** View with `journalctl` commands above

---

## 🌐 Access URLs

- **Frontend:** `http://192.168.1.34:3000`
- **Backend:** `http://192.168.1.34:5000`

---

## ⚡ Most Common Commands

```bash
# After editing backend code
sudo systemctl restart nexaboard-backend

# After editing frontend code
cd /home/osama/code/fixed-Hardware/nexaboard && npm run build && sudo systemctl restart nexaboard-frontend

# Check if everything is running
sudo systemctl status nexaboard-backend nexaboard-frontend

# View logs
sudo journalctl -u nexaboard-backend -f
sudo journalctl -u nexaboard-frontend -f
```

---

**Quick Reference:** Keep this file bookmarked for easy access to all service commands!
