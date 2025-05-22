#!/bin/bash

# Prompt for Gemini API key
echo -e "\033[0;34m=================================\033[0m"
echo -e "\033[0;32m  Mystic Chatways API Setup  \033[0m"
echo -e "\033[0;34m=================================\033[0m"
echo ""

# Ask for the API key
read -p "Enter your Gemini API key: " apikey

# Update the .env.local file
cat > .env.local << EOL
# Gemini API Key for Google AI
GEMINI_API_KEY=$apikey

# Legacy configuration (keep if needed)
# GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/your/service-account-key.json"
EOL

echo ""
echo -e "\033[0;32mAPI key has been successfully saved to .env.local\033[0m"
echo -e "\033[0;34mYou can now run './start-app.sh' to start the application\033[0m"
echo ""
