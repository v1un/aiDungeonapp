'use server';

/**
 * @fileOverview Summarizes the player's past adventures using GenAI.
 *
 * - summarizeAdventure - A function that generates a short summary of the player's past adventures.
 * - SummarizeAdventureInput - The input type for the summarizeAdventure function.
 * - SummarizeAdventureOutput - The return type for the summarizeAdventure function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config(); // For .env
dotenv.config({ path: '.env.local', override: true }); // For .env.local

const SummarizeAdventureInputSchema = z.object({
  adventureHistory: z
    .string()
    .describe("The player's past adventure history."),
});
export type SummarizeAdventureInput = z.infer<typeof SummarizeAdventureInputSchema>;

const SummarizeAdventureOutputSchema = z.object({
  summary: z.string().describe('A short summary of the past adventures.'),
});
export type SummarizeAdventureOutput = z.infer<typeof SummarizeAdventureOutputSchema>;

export async function summarizeAdventure(input: SummarizeAdventureInput): Promise<SummarizeAdventureOutput> {
  return summarizeAdventureFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeAdventurePrompt',
  input: {schema: SummarizeAdventureInputSchema},
  output: {schema: SummarizeAdventureOutputSchema},
  prompt: `Summarize the following adventure history in a concise and engaging way:

{{{adventureHistory}}}`,
});

const summarizeAdventureFlow = ai.defineFlow(
  {
    name: 'summarizeAdventureFlow',
    inputSchema: SummarizeAdventureInputSchema,
    outputSchema: SummarizeAdventureOutputSchema,
  },
  async (input: SummarizeAdventureInput): Promise<SummarizeAdventureOutput> => {
    const aiProvider = process.env.AI_PROVIDER || 'googleai';
    let result;

    if (aiProvider === 'ollama') {
      result = await gemmaSummarizeAdventurePrompt(input);
    } else {
      result = await prompt(input); // Existing prompt for Gemini
    }
    
    if (!result || !result.output) {
      console.error(`Summarize adventure flow (${aiProvider}) returned undefined or null output.`);
      return { summary: "Failed to generate summary." };
    }
    return result.output;
  }
);

// Define gemmaSummarizeAdventurePrompt - for this flow, it can be very similar or identical to the original
// as summarization is a basic task and the original prompt is simple.
// We define it separately for clarity and to ensure no tools are accidentally associated if the main `prompt` changes.
const gemmaSummarizeAdventurePrompt = ai.definePrompt({
  name: 'gemmaSummarizeAdventurePrompt', // Different name
  input: {schema: SummarizeAdventureInputSchema},
  output: {schema: SummarizeAdventureOutputSchema}, // Gemma should be able to produce this simple structure
  // NO TOOLS
  prompt: `Summarize the following adventure history in a concise and engaging way:

{{{adventureHistory}}}`,
});
