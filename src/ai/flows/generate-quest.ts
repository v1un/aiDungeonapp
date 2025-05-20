
'use server';

/**
 * @fileOverview AI agent that generates a new quest.
 *
 * - generateQuest - A function that generates a new quest.
 * - GenerateQuestInput - The input type for the generateQuest function.
 * - GenerateQuestOutput - The return type for the generateQuest function (equivalent to Quest type).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Quest } from '@/types'; // Import the Quest type
import { QuestSchema } from '@/types'; // Import the QuestSchema

// Input schema for generating a quest (can be expanded later)
const GenerateQuestInputSchema = z.object({
  playerContext: z.string().describe('Information about the player, their current situation, and the game world (e.g., series name, character details, current location).'),
  previousQuestCount: z.number().optional().describe('Number of quests already completed or active, to vary difficulty or type.'),
});
export type GenerateQuestInput = z.infer<typeof GenerateQuestInputSchema>;

// Output schema is the Quest itself
export type GenerateQuestOutput = Quest; // Using the imported Quest type

// This function is a placeholder for now, more for defining the structure.
// In a full implementation, it would be called by game logic to create new quests.
export async function generateQuest(input: GenerateQuestInput): Promise<GenerateQuestOutput> {
  // For now, this just demonstrates calling the flow.
  // A real implementation would pass more dynamic context.
  const quest = await generateQuestFlow(input);
  return {
    ...quest,
    id: `quest-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Ensure unique ID
    status: 'active' // Default status
  };
}

const generateQuestPrompt = ai.definePrompt({
  name: 'generateQuestPrompt',
  input: {schema: GenerateQuestInputSchema},
  output: {schema: QuestSchema.omit({ id: true, status: true })}, // AI generates content, ID/status managed by system
  prompt: `You are a master storyteller and game designer for text-based RPGs.
Given the player's context, generate a compelling and fitting quest.

Player Context:
{{{playerContext}}}

Based on this, devise a quest with:
- A captivating title.
- An engaging description that sets the scene and goal.
- A clear list of 2-4 objectives the player must achieve.
- A list of 1-3 thematic rewards for completing the quest.

The quest should feel like a natural extension of the player's current situation and the series they are in.
If {{previousQuestCount}} is provided and greater than 0, try to make this quest different from typical early-game quests.
`,
});

const generateQuestFlow = ai.defineFlow(
  {
    name: 'generateQuestFlow',
    inputSchema: GenerateQuestInputSchema,
    outputSchema: QuestSchema.omit({ id: true, status: true }),
  },
  async (input) => {
    const {output} = await generateQuestPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate quest details.');
    }
    return output;
  }
);
