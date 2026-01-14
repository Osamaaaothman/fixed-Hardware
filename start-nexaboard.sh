#!/bin/bash

# Quick Start Script - Start services manually without systemd
# Useful for testing before installing as systemd services

echo "Starting Nexaboard..."
echo ""

# Get IP address
IP=$(hostname -I | awk '{print $1}')

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if already running
if pgrep -f "node.*index.js" > /dev/null; then
    echo "Backend is already running!"
    echo "Stop it with: pkill -f 'node.*index.js'"
    exit 1
fi

# Start backend in background
echo -e "${YELLOW}Starting backend...${NC}"
cd /home/osama/code/fixed-Hardware/Backend
PORT=5000 HOST=0.0.0.0 node index.js > /tmp/nexaboard-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Wait for backend to start
sleep 2

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Backend failed to start! Check logs:"
    tail /tmp/nexaboard-backend.log
    exit 1
fi

# Start frontend
echo -e "${YELLOW}Starting frontend...${NC}"
cd /home/osama/code/fixed-Hardware/nexaboard

# Check if build exists, if not build it
if [ ! -d "dist" ]; then
    echo "Building frontend..."
    npm run build
fi

HOST=0.0.0.0 PORT=3000 npx vite preview --host 0.0.0.0 --port 3000 > /tmp/nexaboard-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

echo ""
echo "======================================"
echo -e "${GREEN}Nexaboard Started Successfully!${NC}"
echo "======================================"
echo ""
echo "Access your application at:"
echo -e "${GREEN}  http://${IP}:3000${NC}"
echo ""
echo "Backend API running at:"
echo -e "${GREEN}  http://${IP}:5000${NC}"
echo ""
echo "Process IDs:"
echo "  Backend:  $BACKEND_PID"
echo "  Frontend: $FRONTEND_PID"
echo ""
echo "To stop:"
echo "  pkill -f 'node.*index.js'    # Stop backend"
echo "  pkill -f 'vite preview'       # Stop frontend"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /tmp/nexaboard-backend.log"
echo "  Frontend: tail -f /tmp/nexaboard-frontend.log"
echo ""
