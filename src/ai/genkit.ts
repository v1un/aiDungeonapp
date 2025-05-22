import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Load environment variables
import dotenv from 'dotenv';
// Try loading from .env and .env.local files
dotenv.config();
dotenv.config({ path: '.env.local' });

// Note: Server port is configured via the PORT environment variable in start-app.sh
// Get API key from environment variables
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export const ai = genkit({
  plugins: [googleAI({
    apiKey: apiKey, // Explicitly pass the API key
  })],
  model: 'googleai/gemini-2.5-flash-preview-05-20',
});
