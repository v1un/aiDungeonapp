#!/bin/bash

# Mystic Chatways Auto-Launcher Script
# This script launches both the Next.js server and GenKit server required for Mystic Chatways

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a port is in use
port_in_use() {
  lsof -i:"$1" >/dev/null 2>&1
  return $?
}

# Print banner
echo -e "${BLUE}=================================${NC}"
echo -e "${GREEN}  Mystic Chatways Launcher  ${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Check for required dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js is not installed. Please install Node.js to run this application.${NC}"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}npm is not installed. Please install npm to run this application.${NC}"
  exit 1
fi

# Check if package.json exists in the current directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found. Please run this script from the root of the Mystic Chatways project.${NC}"
  exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies. Please try running 'npm install' manually.${NC}"
    exit 1
  fi
fi

# Find an available port for the Next.js server
NEXTJS_PORT=9003
while port_in_use $NEXTJS_PORT; do
  echo -e "${YELLOW}Port $NEXTJS_PORT is already in use, trying next port...${NC}"
  NEXTJS_PORT=$((NEXTJS_PORT+1))
done

# Kill any previously running instances
echo -e "${YELLOW}Checking for existing processes...${NC}"
pkill -f "next dev" &>/dev/null
pkill -f "genkit start" &>/dev/null

# Create log directory if it doesn't exist
mkdir -p logs

# Start GenKit server
echo -e "${GREEN}Starting GenKit server...${NC}"
npm run genkit:dev > logs/genkit.log 2>&1 &
GENKIT_PID=$!

# Check if GenKit started successfully
sleep 3
if ! ps -p $GENKIT_PID > /dev/null; then
  echo -e "${RED}Failed to start GenKit server. Check logs/genkit.log for details.${NC}"
  exit 1
fi

echo -e "${GREEN}GenKit server started with PID: $GENKIT_PID${NC}"
echo -e "${BLUE}GenKit logs available at: $(pwd)/logs/genkit.log${NC}"

# Start Next.js server
echo -e "${GREEN}Starting Next.js server on port $NEXTJS_PORT...${NC}"
PORT=$NEXTJS_PORT npm run dev > logs/nextjs.log 2>&1 &
NEXTJS_PID=$!

# Check if Next.js started successfully
sleep 3
if ! ps -p $NEXTJS_PID > /dev/null; then
  echo -e "${RED}Failed to start Next.js server. Check logs/nextjs.log for details.${NC}"
  pkill -P $GENKIT_PID
  exit 1
fi

echo -e "${GREEN}Next.js server started with PID: $NEXTJS_PID${NC}"
echo -e "${BLUE}Next.js logs available at: $(pwd)/logs/nextjs.log${NC}"

# Print URLs
echo ""
echo -e "${GREEN}Mystic Chatways is now running!${NC}"
echo -e "${BLUE}Application URL: ${GREEN}http://localhost:$NEXTJS_PORT${NC}"
echo -e "${BLUE}GenKit Developer UI: ${GREEN}http://localhost:4001${NC}"

# Check connection status
echo ""
echo -e "${YELLOW}Checking connection status...${NC}"
sleep 5

# Check if Next.js server is accessible
if curl -s "http://localhost:$NEXTJS_PORT" > /dev/null; then
  echo -e "${GREEN}✓ Next.js server is accessible${NC}"
else
  echo -e "${RED}✗ Next.js server is not accessible${NC}"
  echo -e "${YELLOW}Check logs/nextjs.log for details${NC}"
fi

# Check if GenKit server is accessible
if curl -s "http://localhost:4001" > /dev/null; then
  echo -e "${GREEN}✓ GenKit server is accessible${NC}"
else
  echo -e "${RED}✗ GenKit server is not accessible${NC}"
  echo -e "${YELLOW}Check logs/genkit.log for details${NC}"
fi

echo ""
echo -e "${BLUE}=================================${NC}"
echo -e "${GREEN}  Servers are running in the background  ${NC}"
echo -e "${YELLOW}  To stop the servers, run:  ${NC}"
echo -e "${RED}  pkill -f \"next dev\"; pkill -f \"genkit start\"  ${NC}"
echo -e "${BLUE}=================================${NC}"

# Keep the script running to maintain control of the terminal
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers and exit${NC}"
trap "pkill -P $GENKIT_PID; pkill -P $NEXTJS_PID; echo -e '${RED}Servers stopped${NC}'; exit" INT
wait
