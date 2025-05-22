# API Key Setup Guide

## Getting a Gemini API Key

Mystic Chatways uses Google's Gemini AI model for its text generation capabilities. To use this application, you need to set up a Gemini API key by following these steps:

1. Go to [Google AI Studio](https://ai.google.dev/)
2. Sign in with your Google account
3. Navigate to "Get API key" in the menu
4. Create a new API key or use an existing one
5. Copy your API key

## Setting Up Your API Key

### Option 1: Using the Setup Script (Recommended)

Run the setup script that prompts for your API key:

```bash
./set-api-key.sh
```

Follow the prompts to enter your API key.

### Option 2: Manual Configuration

Create or edit the `.env.local` file in the root directory of the project and add:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

## Starting the Application

After setting up your API key, start the application with:

```bash
./start-app.sh
```

## Troubleshooting

- **Error:** `Please pass in the API key or set the GEMINI_API_KEY or GOOGLE_API_KEY environment variable.`  
  **Solution:** Your API key is not being correctly loaded. Run `./set-api-key.sh` to set up your API key.

- **Error:** Environment variable not loading  
  **Solution:** Ensure your `.env.local` file is in the root directory and formatted correctly with `GEMINI_API_KEY=your_key` without quotes.

## Notes

- Your API key is stored locally in the `.env.local` file
- Never commit your API key to version control
- If you change your API key, run `./set-api-key.sh` again
