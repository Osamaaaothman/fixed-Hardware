#!/bin/bash

# Nexaboard Auto-Start Installation Script for Raspberry Pi
# This script sets up automatic startup of both backend and frontend services

echo "======================================"
echo "Nexaboard Auto-Start Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
cd /home/osama/code/fixed-Hardware/Backend
sudo -u osama npm install --production
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

cd /home/osama/code/fixed-Hardware/nexaboard
sudo -u osama npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo ""
echo -e "${YELLOW}Step 2: Building frontend for production...${NC}"
sudo -u osama npm run build
echo -e "${GREEN}✓ Frontend built${NC}"

echo ""
echo -e "${YELLOW}Step 3: Installing systemd services...${NC}"

# Copy service files to systemd directory
cp /home/osama/code/fixed-Hardware/nexaboard-backend.service /etc/systemd/system/
cp /home/osama/code/fixed-Hardware/nexaboard-frontend.service /etc/systemd/system/

# Set correct permissions
chmod 644 /etc/systemd/system/nexaboard-backend.service
chmod 644 /etc/systemd/system/nexaboard-frontend.service

echo -e "${GREEN}✓ Service files installed${NC}"

echo ""
echo -e "${YELLOW}Step 4: Enabling and starting services...${NC}"

# Reload systemd daemon
systemctl daemon-reload

# Enable services to start on boot
systemctl enable nexaboard-backend.service
systemctl enable nexaboard-frontend.service

# Start services
systemctl start nexaboard-backend.service
systemctl start nexaboard-frontend.service

echo -e "${GREEN}✓ Services enabled and started${NC}"

echo ""
echo -e "${YELLOW}Step 5: Checking service status...${NC}"
sleep 2

echo ""
echo "Backend Status:"
systemctl status nexaboard-backend.service --no-pager -l | head -n 10

echo ""
echo "Frontend Status:"
systemctl status nexaboard-frontend.service --no-pager -l | head -n 10

echo ""
echo "======================================"
echo -e "${GREEN}Installation Complete!${NC}"
echo "======================================"
echo ""
echo "Your Nexaboard is now configured to start automatically on boot!"
echo ""
echo "Access your application at:"
echo -e "${GREEN}  http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo ""
echo "Backend API is running at:"
echo -e "${GREEN}  http://$(hostname -I | awk '{print $1}'):5000${NC}"
echo ""
echo "Useful commands:"
echo "  - Check backend status:  sudo systemctl status nexaboard-backend"
echo "  - Check frontend status: sudo systemctl status nexaboard-frontend"
echo "  - View backend logs:     sudo journalctl -u nexaboard-backend -f"
echo "  - View frontend logs:    sudo journalctl -u nexaboard-frontend -f"
echo "  - Restart backend:       sudo systemctl restart nexaboard-backend"
echo "  - Restart frontend:      sudo systemctl restart nexaboard-frontend"
echo "  - Stop services:         sudo systemctl stop nexaboard-backend nexaboard-frontend"
echo "  - Disable auto-start:    sudo systemctl disable nexaboard-backend nexaboard-frontend"
echo ""
