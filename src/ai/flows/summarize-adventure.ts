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
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
