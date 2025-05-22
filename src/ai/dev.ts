
import { config } from 'dotenv';
// Load environment variables from .env and .env.local
config();
config({ path: '.env.local' });

// Determine AI provider
const aiProvider = process.env.AI_PROVIDER || 'googleai';

// Conditionally check for API key based on AI_PROVIDER
if (aiProvider === 'googleai') {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    console.log('✅ Google AI provider selected. Gemini API key found in environment variables.');
  } else {
    console.warn('⚠️ Google AI provider selected, but no Gemini API key found. Please run ./set-api-key.sh to set up your API key, or ensure GEMINI_API_KEY or GOOGLE_API_KEY is set in your environment.');
  }
} else if (aiProvider === 'ollama') {
  console.log('✅ Ollama provider selected. API key not required.');
} else {
  console.warn(`⚠️ Unknown AI_PROVIDER: "${aiProvider}". Proceeding without provider-specific checks.`);
}

import '@/ai/flows/summarize-adventure.ts';
import '@/ai/flows/generate-npc.ts';
import '@/ai/flows/generate-quest.ts';
import '@/ai/flows/generate-character.ts';
import '@/ai/flows/generate-series-details.ts';
import '@/ai/tools/retrieve-lore-info.ts'; // Import the new tool
import '@/ai/flows/advance-story.ts'; // Import the new flow
