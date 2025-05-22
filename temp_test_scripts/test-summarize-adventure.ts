import { summarizeAdventure, SummarizeAdventureInput } from '../src/ai/flows/summarize-adventure';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
const envLocalPath = resolve(process.cwd(), '.env.local');

console.log(`Attempting to load .env from: ${envPath}`);
dotenvConfig({ path: envPath, override: true });
console.log(`Attempting to load .env.local from: ${envLocalPath}`);
dotenvConfig({ path: envLocalPath, override: true });

console.log(`AI_PROVIDER after dotenv: ${process.env.AI_PROVIDER}`);
console.log(`OLLAMA_BASE_URL after dotenv: ${process.env.OLLAMA_BASE_URL}`);

async function testSummarizeAdventure() {
  const input: SummarizeAdventureInput = {
    adventureHistory: "The party ventured into the Whispering Woods, fought off a pack of goblins, and discovered an ancient shrine. Inside the shrine, they found a cryptic map."
  };

  console.log("Attempting to run summarizeAdventure with input:", JSON.stringify(input, null, 2));
  try {
    const output = await summarizeAdventure(input);
    console.log("summarizeAdventure successful. Output:", JSON.stringify(output, null, 2));
  } catch (error) {
    if (error instanceof Error) {
        console.error("summarizeAdventure failed:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
    } else {
        console.error("summarizeAdventure failed with an unknown error:", error);
    }
  }
}

testSummarizeAdventure();
