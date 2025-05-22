import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ollama} from 'genkitx-ollama'; // Import ollama

// Load environment variables
import dotenv from 'dotenv';
// Try loading from .env and .env.local files
dotenv.config();
dotenv.config({ path: '.env.local' });

// Note: Server port is configured via the PORT environment variable in start-app.sh

// Determine AI provider
const aiProvider = process.env.AI_PROVIDER || 'googleai';
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const googleApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

let plugins: any[];
let modelName: string;

if (aiProvider === 'ollama') {
  plugins = [
    ollama({
      host: ollamaBaseUrl,
      models: [{ name: 'google/gemma-3-4b-it', type: 'generate' }, { name: 'gemma:7b', type: 'generate' }], // Attempt specific model, fallback to gemma:7b
    }),
  ];
  modelName = 'ollama/google/gemma-3-4b-it'; // Prioritize specific model
  // modelName = 'ollama/gemma:7b'; // Fallback model
  console.log(`Using Ollama AI provider with model ${modelName} at ${ollamaBaseUrl}`);
} else {
  if (!googleApiKey) {
    console.warn(
      'Google AI provider selected, but GEMINI_API_KEY or GOOGLE_API_KEY is not set. API calls may fail.'
    );
  }
  plugins = [
    googleAI({
      apiKey: googleApiKey, // Explicitly pass the API key
    }),
  ];
  modelName = 'googleai/gemini-2.5-flash-preview-05-20';
  console.log(`Using Google AI provider with model ${modelName}`);
}

export const ai = genkit({
  plugins: plugins,
  model: modelName,
});
