
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-adventure.ts';
import '@/ai/flows/generate-npc.ts';
import '@/ai/flows/generate-quest.ts';
import '@/ai/flows/generate-character.ts';
import '@/ai/flows/generate-series-details.ts';
import '@/ai/tools/retrieve-lore-info.ts'; // Import the new tool
import '@/ai/flows/advance-story.ts'; // Import the new flow
