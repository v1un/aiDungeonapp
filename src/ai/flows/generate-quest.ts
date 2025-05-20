'use server';

/**
 * @fileOverview AI agent that generates a new quest for the player based on their current location and character stats.
 *
 * - generateQuest - A function that generates a new quest.
 * - GenerateQuestInput - The input type for the generateQuest function.
 * - GenerateQuestOutput - The return type for the generateQuest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuestInputSchema = z.object({
  location: z.string().describe('The current location of the player.'),
  characterStats: z.string().describe('The character stats of the player.'),
});
export type GenerateQuestInput = z.infer<typeof GenerateQuestInputSchema>;

const GenerateQuestOutputSchema = z.object({
  questTitle: z.string().describe('The title of the generated quest.'),
  questDescription: z
    .string()
    .describe('A detailed description of the generated quest.'),
  questObjectives: z
    .array(z.string())
    .describe('A list of objectives for the generated quest.'),
  possibleRewards: z
    .array(z.string())
    .describe('A list of possible rewards for completing the quest.'),
});
export type GenerateQuestOutput = z.infer<typeof GenerateQuestOutputSchema>;

export async function generateQuest(input: GenerateQuestInput): Promise<GenerateQuestOutput> {
  return generateQuestFlow(input);
}

const generateQuestPrompt = ai.definePrompt({
  name: 'generateQuestPrompt',
  input: {schema: GenerateQuestInputSchema},
  output: {schema: GenerateQuestOutputSchema},
  prompt: `You are a fantasy quest generator. Based on the player's current location and character stats, you will generate a new quest for the player.

Current Location: {{{location}}}
Character Stats: {{{characterStats}}}

Quest should fit to the player current location and stats.

Quest Title:
Quest Description:
Quest Objectives (as a list of objectives):
Possible Rewards (as a list of rewards):`,
});

const generateQuestFlow = ai.defineFlow(
  {
    name: 'generateQuestFlow',
    inputSchema: GenerateQuestInputSchema,
    outputSchema: GenerateQuestOutputSchema,
  },
  async input => {
    const {output} = await generateQuestPrompt(input);
    return output!;
  }
);
