#!/bin/bash

# Mystic Chatways Auto-Launcher Script
# This script launches both the Next.js server and GenKit server required for Mystic Chatways

# Default ports
DEFAULT_NEXTJS_PORT=9003

# GenKit uses multiple ports:
# - API/Health: typically 4001
# - Developer UI: typically 4000
# - Telemetry: typically 4033

# Allow overriding ports via environment variables
export PORT=${NEXTJS_PORT:-$DEFAULT_NEXTJS_PORT}

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

# Find available port for Next.js server
echo -e "${YELLOW}Checking for available ports...${NC}"

# Find available Next.js port
while port_in_use $PORT; do
  echo -e "${YELLOW}Port $PORT is already in use, trying next port...${NC}"
  PORT=$((PORT + 1))
done

# We don't need to manually set GenKit ports as it will find available ports itself

export PORT

echo -e "${GREEN}Using ports:${NC}"
echo -e "- Next.js: ${GREEN}$PORT${NC}"
echo -e "- GenKit:  Will auto-select available ports"

# Kill any previously running instances
echo -e "${YELLOW}Checking for existing processes...${NC}"
pkill -f "next dev" &>/dev/null
pkill -f "genkit start" &>/dev/null

# Clean up any stale GenKit server configurations
if [ -d ".genkit/servers" ]; then
  rm -f .genkit/servers/*.json
fi

# Create necessary directories
mkdir -p logs
mkdir -p .genkit/servers

# Start GenKit server
echo -e "${GREEN}Starting GenKit server...${NC}"

# Clean up any existing GenKit server processes
pkill -f "genkit start" &>/dev/null

# Start GenKit with a clean environment
# Note: GenKit will automatically find available ports
(
  cd "$(pwd)" && \
  npm run genkit:dev > logs/genkit.log 2>&1
) &
GENKIT_PID=$!

# Wait for GenKit to start and detect the ports it's using
echo -n "${YELLOW}Waiting for GenKit to start...${NC}"
MAX_WAIT=90  # Increased timeout to 90 seconds
WAITED=0
GENKIT_UI_PORT=""
GENKIT_API_PORT=""
GENKIT_TELEMETRY_PORT=""

while [ $WAITED -lt $MAX_WAIT ]; do
  # Check if process is still running
  if ! ps -p $GENKIT_PID > /dev/null; then
    echo -e "\n${RED}GenKit process died during startup. Check logs/genkit.log for details.${NC}"
    exit 1
  fi
  
  # Try to extract port information from the log file
  if [ -z "$GENKIT_UI_PORT" ]; then
    GENKIT_UI_PORT=$(grep -o "Genkit Developer UI: http://localhost:[0-9]\+" logs/genkit.log | grep -o "[0-9]\+$")
  fi
  
  if [ -z "$GENKIT_TELEMETRY_PORT" ]; then
    GENKIT_TELEMETRY_PORT=$(grep -o "Telemetry API running on http://localhost:[0-9]\+" logs/genkit.log | grep -o "[0-9]\+$")
  fi
  
  # If we found the UI port, we can assume GenKit is starting up correctly
  if [ -n "$GENKIT_UI_PORT" ] && [ -n "$GENKIT_TELEMETRY_PORT" ]; then
    # Now let's try various potential API port numbers
    for potential_port in 4001 4002 4003 4004 8080; do
      if curl -s "http://localhost:${potential_port}/health" > /dev/null 2>&1; then
        GENKIT_API_PORT="$potential_port"
        break
      fi
    done
    
    # If we found all ports, break out of the loop
    if [ -n "$GENKIT_API_PORT" ]; then
      echo -e " ${GREEN}✓${NC}"
      break
    fi
  fi
  
  echo -n "."
  sleep 1
  WAITED=$((WAITED + 1))
  
  # Every 10 seconds, output a status update
  if [ $((WAITED % 10)) -eq 0 ]; then
    echo -e "\n${YELLOW}Still waiting for GenKit to start (${WAITED}/${MAX_WAIT}s)...${NC}"
    echo -n "${YELLOW}Continuing to wait...${NC}"
  fi
done

# Check if GenKit started successfully
if ! ps -p $GENKIT_PID > /dev/null; then
  echo -e "\n${RED}Failed to start GenKit server. Check logs/genkit.log for details.${NC}"
  exit 1
fi

if [ -z "$GENKIT_UI_PORT" ] || [ -z "$GENKIT_API_PORT" ] || [ -z "$GENKIT_TELEMETRY_PORT" ]; then
  echo -e "\n${RED}Timed out waiting for GenKit to start or couldn't detect all ports.${NC}"
  echo -e "${YELLOW}Last 20 lines of GenKit log:${NC}"
  tail -n 20 logs/genkit.log
  echo -e "${YELLOW}You may need to check your GenKit configuration or try running 'npm run genkit:dev' manually.${NC}"
  exit 1
fi

# Export the detected GenKit ports so the Next.js app can use them
export GENKIT_UI_PORT=$GENKIT_UI_PORT
export GENKIT_API_PORT=$GENKIT_API_PORT
export GENKIT_TELEMETRY_PORT=$GENKIT_TELEMETRY_PORT

echo -e "${GREEN}GenKit server started with PID: $GENKIT_PID${NC}"
echo -e "${GREEN}Detected GenKit ports:${NC}"
echo -e "- API/Health: ${GREEN}$GENKIT_API_PORT${NC}"
echo -e "- Developer UI: ${GREEN}$GENKIT_UI_PORT${NC}"
echo -e "- Telemetry: ${GREEN}$GENKIT_TELEMETRY_PORT${NC}"
echo -e "${BLUE}GenKit logs available at: $(pwd)/logs/genkit.log${NC}"

# Start Next.js server with environment variables for the GenKit ports
echo -e "${GREEN}Starting Next.js server on port $PORT...${NC}"
PORT=$PORT GENKIT_API_PORT=$GENKIT_API_PORT GENKIT_UI_PORT=$GENKIT_UI_PORT npm run dev > logs/nextjs.log 2>&1 &
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
echo -e "${BLUE}Application URL: ${GREEN}http://localhost:$PORT${NC}"
echo -e "${BLUE}GenKit Developer UI: ${GREEN}http://localhost:$GENKIT_UI_PORT${NC}"
echo -e "${BLUE}GenKit API: ${GREEN}http://localhost:$GENKIT_API_PORT${NC}"

# Check connection status
echo ""
echo -e "${YELLOW}Checking connection status...${NC}"
sleep 5

# Check if Next.js server is accessible
if curl -s "http://localhost:$PORT" > /dev/null; then
  echo -e "${GREEN}✓ Next.js server is accessible${NC}"
else
  echo -e "${RED}✗ Next.js server is not accessible${NC}"
  echo -e "${YELLOW}Check logs/nextjs.log for details${NC}"
fi

# Check if GenKit API server is accessible
if curl -s "http://localhost:$GENKIT_API_PORT/health" > /dev/null; then
  echo -e "${GREEN}✓ GenKit API server is accessible${NC}"
else
  echo -e "${RED}✗ GenKit API server is not accessible${NC}"
  echo -e "${YELLOW}Check logs/genkit.log for details${NC}"
fi

# Check if GenKit UI server is accessible
if curl -s "http://localhost:$GENKIT_UI_PORT" > /dev/null; then
  echo -e "${GREEN}✓ GenKit UI server is accessible${NC}"
else
  echo -e "${RED}✗ GenKit UI server is not accessible${NC}"
  echo -e "${YELLOW}Check logs/genkit.log for details${NC}"
fi

echo ""
echo -e "${BLUE}=================================${NC}"
echo -e "${GREEN}  Servers are running in the background  ${NC}"
echo -e "${YELLOW}  To stop the servers, run:  ${NC}"
echo -e "${RED}  pkill -f \"next dev\"; pkill -f \"genkit start\"  ${NC}"
echo -e "${BLUE}=================================${NC}"

# Function to clean up processes
cleanup() {
  echo -e "\n${YELLOW}Stopping servers...${NC}"
  pkill -P $GENKIT_PID 2>/dev/null
  pkill -P $NEXTJS_PID 2>/dev/null
  pkill -f "genkit start" 2>/dev/null
  echo -e "${GREEN}Servers stopped${NC}"
  exit 0
}

# Set up trap for Ctrl+C
trap cleanup INT

# Keep the script running to maintain control of the terminal
echo -e "\n${YELLOW}Press Ctrl+C to stop both servers and exit${NC}"

# Wait for background processes
wait $GENKIT_PID $NEXTJS_PID

# If we get here, one of the servers died
cleanup
