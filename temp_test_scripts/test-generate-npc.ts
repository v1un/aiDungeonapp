import { generateNpc, GenerateNpcInput } from '../src/ai/flows/generate-npc';
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

async function testGenerateNpc() {
  const input: GenerateNpcInput = {
    playerCharacterDescription: "A noble knight sworn to protect the innocent.",
    seriesTitle: "The Dragon's Prophecy",
    worldContext: "A high-fantasy world recovering from a recent dragon war. Magic is common, and ancient ruins dot the landscape.",
    existingNpcs: [
      { name: "Elara", description: "A wise old sorceress." },
      { name: "Grom", description: "A grumpy dwarven blacksmith." }
    ],
    currentLocation: "The village of Oakhaven",
    purpose: "Quest-giver for a mission to find a lost artifact."
  };

  console.log("Attempting to run generateNpc with input:", JSON.stringify(input, null, 2));
  try {
    const output = await generateNpc(input);
    console.log("generateNpc successful. Output:", JSON.stringify(output, null, 2));
  } catch (error) {
    if (error instanceof Error) {
        console.error("generateNpc failed:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
    } else {
        console.error("generateNpc failed with an unknown error:", error);
    }
  }
}

testGenerateNpc();
