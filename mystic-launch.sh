#!/bin/bash

# Mystic Chatways Launch Script
# A simple wrapper to launch the more robust Node.js launcher

# Navigate to project directory (useful if script is called from elsewhere)
cd "$(dirname "$0")"

# Make sure the Node.js launcher is executable
chmod +x ./tools/mystic-chatways-launcher.js

# Execute the Node.js launcher
./tools/mystic-chatways-launcher.js

# This script will exit when the launcher exits
