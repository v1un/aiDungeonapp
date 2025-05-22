
import { config } from 'dotenv';
// Load environment variables from .env and .env.local
config();
config({ path: '.env.local' });

// Check if API key is set and log status (without revealing the key)
if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
  console.log('✅ Gemini API key found in environment variables');
} else {
  console.warn('⚠️ No Gemini API key found. Please run ./set-api-key.sh to set up your API key');
}

import '@/ai/flows/summarize-adventure.ts';
import '@/ai/flows/generate-npc.ts';
import '@/ai/flows/generate-quest.ts';
import '@/ai/flows/generate-character.ts';
import '@/ai/flows/generate-series-details.ts';
import '@/ai/tools/retrieve-lore-info.ts'; // Import the new tool
import '@/ai/flows/advance-story.ts'; // Import the new flow
