#!/bin/bash

# Stop Script - Stop manually started services
# Use this to stop services started with start-nexaboard.sh

echo "Stopping Nexaboard..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Stop backend
if pgrep -f "node.*index.js" > /dev/null; then
    pkill -f "node.*index.js"
    echo -e "${GREEN}✓ Backend stopped${NC}"
else
    echo "Backend was not running"
fi

# Stop frontend
if pgrep -f "vite preview" > /dev/null; then
    pkill -f "vite preview"
    echo -e "${GREEN}✓ Frontend stopped${NC}"
else
    echo "Frontend was not running"
fi

echo ""
echo "Nexaboard stopped."
