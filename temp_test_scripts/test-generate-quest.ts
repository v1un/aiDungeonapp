import { generateQuest, GenerateQuestInput } from '../src/ai/flows/generate-quest';
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

async function testGenerateQuest() {
  const input: GenerateQuestInput = {
    playerContext: "The player is a novice adventurer named Finn, currently in the village of Oakhaven. Series: The Dragon's Prophecy. Finn has just helped the blacksmith.",
    previousQuestCount: 1
  };

  console.log("Attempting to run generateQuest with input:", JSON.stringify(input, null, 2));
  try {
    const output = await generateQuest(input);
    console.log("generateQuest successful. Output:", JSON.stringify(output, null, 2));
  } catch (error) {
    if (error instanceof Error) {
        console.error("generateQuest failed:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
    } else {
        console.error("generateQuest failed with an unknown error:", error);
    }
  }
}

testGenerateQuest();
