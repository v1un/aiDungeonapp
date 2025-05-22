import { generateCharacter, GenerateCharacterInput } from '../src/ai/flows/generate-character';
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

async function testGenerateCharacter() {
  const input: GenerateCharacterInput = {
    characterConcept: "A stealthy rogue with a hidden agenda, skilled in poisons and disguise.",
    seriesTitle: "The Serpent's Shadow",
    worldContext: "A medieval city full of political intrigue, secret societies, and ancient magic. The city is ruled by a council of merchants, but dark forces conspire in the shadows."
  };

  // Input validation is done internally by the flow, no need to call .parse() here

  console.log("Attempting to run generateCharacter with input:", JSON.stringify(input, null, 2));
  try {
    const output = await generateCharacter(input);
    console.log("generateCharacter successful. Output:", JSON.stringify(output, null, 2));
  } catch (error) {
    if (error instanceof Error) {
        console.error("generateCharacter failed:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
    } else {
        console.error("generateCharacter failed with an unknown error:", error);
    }
  }
}

testGenerateCharacter();
