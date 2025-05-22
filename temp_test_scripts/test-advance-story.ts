import { advanceStory, AdvanceStoryInput } from '../src/ai/flows/advance-story';
// Note: Zod schema is not explicitly exported, so we rely on AdvanceStoryInput type and trust the flow's internal parsing.
// If direct schema validation in the test is needed, the flow file would need to export AdvanceStoryInputSchema.

import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Explicitly load .env and .env.local
const envPath = resolve(process.cwd(), '.env');
const envLocalPath = resolve(process.cwd(), '.env.local');

console.log(`Attempting to load .env from: ${envPath}`);
dotenvConfig({ path: envPath, override: true });
console.log(`Attempting to load .env.local from: ${envLocalPath}`);
dotenvConfig({ path: envLocalPath, override: true });

console.log(`AI_PROVIDER after dotenv: ${process.env.AI_PROVIDER}`);
console.log(`OLLAMA_BASE_URL after dotenv: ${process.env.OLLAMA_BASE_URL}`);
console.log(`GEMINI_API_KEY after dotenv: ${process.env.GEMINI_API_KEY ? 'found' : 'not found'}`);


async function testAdvanceStory() {
  const input: AdvanceStoryInput = { // Use the imported type
    playerInput: "I try to open the mysterious glowing chest with my lockpicks.",
    chatHistorySummary: "The adventure started in a dark cave. We found a mysterious glowing chest. Valerius is examining it.",
    mainCharacter: {
      name: "Valerius",
      description: "A cunning rogue, always looking for treasure."
      // Removed other fields to match the simplified schema in advance-story.ts
    },
    currentLocation: "Dark Cave - Chamber of the Glowing Chest",
    inventory: ["Lockpicks", "Torch"], // Simplified to array of strings
    activeQuests: [
      {
        title: "Explore the Dark Cave",
        description: "Find what lies within the dark cave.",
        objectives: ["Find the source of the glowing light."] // Simplified to array of strings
      }
    ],
    seriesTitle: "The Chronicles of Valerius the Rogue"
  };

  console.log("Attempting to run advanceStory with input:", JSON.stringify(input, null, 2));
  try {
    const output = await advanceStory(input);
    console.log("advanceStory successful. Output:", JSON.stringify(output, null, 2));
  } catch (error) {
    // Check if error is an instance of Error to access message and stack
    if (error instanceof Error) {
        console.error("advanceStory failed:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
    } else {
        console.error("advanceStory failed with an unknown error:", error);
    }
  }
}

testAdvanceStory();
