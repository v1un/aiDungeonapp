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
  prompt: `You are a master storyteller crafting an epic tale summary. Transform the following adventure history into an engaging, immersive narrative that captures the emotional journey, key moments, and character growth.

ADVENTURE HISTORY:
{{{adventureHistory}}}

Create a summary that:
🌟 **Opens with a compelling hook** that immediately draws the reader in
⚡ **Highlights pivotal moments** with vivid, sensory-rich descriptions
💫 **Captures emotional stakes** and character development
🗡️ **Uses dynamic action language** that makes events feel immediate and exciting
🌍 **Incorporates world-building elements** that establish the setting's unique atmosphere
📜 **Maintains narrative flow** with smooth transitions between major events

Write in **second person perspective** ("You discovered..." / "Your journey led...") to maintain immersion. Use **markdown formatting** for emphasis (**bold** for crucial moments, *italics* for inner thoughts/emotions).

The summary should read like the opening of an epic adventure novel, making the reader excited to continue the story. Focus on transformation, growth, and the sense of an ongoing legend being written.

Example opening style: "🌟 **Your legend began** in the shadows of..."
Example emotional depth: "*Your heart pounded* as you realized..."
Example world integration: "The ancient magic of [World] responded to your..."`,
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
