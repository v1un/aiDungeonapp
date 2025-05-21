#!/bin/bash

# Mystic Chatways wrapper script
# This script is now a wrapper around the TypeScript launcher

# Display banner
echo -e "\033[0;34m=================================\033[0m"
echo -e "\033[0;32m  Mystic Chatways Launcher  \033[0m"
echo -e "\033[0;34m=================================\033[0m"
echo ""
echo -e "\033[1;33mLaunching Mystic Chatways using TypeScript launcher...\033[0m"
echo ""

# Check if dist directory exists and TypeScript is compiled
if [ ! -f "dist/tools/mystic-chatways-launcher.js" ]; then
  echo -e "\033[1;33mCompiling TypeScript launcher...\033[0m"
  cd tools && npx tsc --outDir ../dist/tools mystic-chatways-launcher.ts
  cd ..
  
  # Check if compilation was successful
  if [ ! -f "dist/tools/mystic-chatways-launcher.js" ]; then
    echo -e "\033[0;31mError: Failed to compile TypeScript launcher.\033[0m"
    echo -e "\033[0;31mPlease run: cd tools && npx tsc --outDir ../dist/tools mystic-chatways-launcher.ts\033[0m"
    exit 1
  fi
  
  echo -e "\033[0;32mTypeScript compilation successful!\033[0m"
fi

# Check for required dependencies
echo -e "\033[1;33mChecking dependencies...\033[0m"
if ! command -v node &> /dev/null; then
  echo -e "\033[0;31mNode.js is not installed. Please install Node.js to run this application.\033[0m"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "\033[0;31mnpm is not installed. Please install npm to run this application.\033[0m"
  exit 1
fi

# Check if package.json exists in the current directory
if [ ! -f "package.json" ]; then
  echo -e "\033[0;31mError: package.json not found. Please run this script from the root of the Mystic Chatways project.\033[0m"
  exit 1
fi

# Kill any previously running instances
echo -e "\033[1;33mStopping any existing processes...\033[0m"
pkill -f "next dev" &>/dev/null
pkill -f "genkit start" &>/dev/null

# Clean up any stale GenKit server configurations
if [ -d ".genkit/servers" ]; then
  rm -f .genkit/servers/*.json
fi

# Create logs directory
mkdir -p logs
mkdir -p .genkit/servers

# Let the user know we're starting the launcher
echo -e "\033[0;32mStarting Mystic Chatways with TypeScript launcher...\033[0m"

# Run the TypeScript launcher
node dist/tools/mystic-chatways-launcher.js

# The TypeScript launcher should handle the process lifetime and cleanup
# These commands below will only execute if the TypeScript launcher exits

# Tips for users
echo -e "\033[0;34m=================================\033[0m"
echo -e "\033[0;32m  Useful Commands  \033[0m"
echo -e "\033[0;34m=================================\033[0m"
echo -e "\033[0;36m  pkill -f \"next dev\"; pkill -f \"genkit start\"\033[0m - Stop servers manually"
echo -e "\033[0;36m  tail -f logs/frontend.log\033[0m - View frontend logs"
echo -e "\033[0;36m  tail -f logs/backend.log\033[0m - View backend logs"
echo -e "\033[0;36m  tail -f logs/errors.log\033[0m - View error logs"
echo -e "\033[0;34m=================================\033[0m"
