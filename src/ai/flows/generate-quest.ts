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
  output: {schema: QuestSchema.omit({ id: true, status: true })},
  prompt: `🎮 You are an **Elite Quest Designer** specializing in creating **series-authentic adventures** that feel like they belong in the original work.

🌟 **SERIES AUTHENTICITY MANDATE**: 
Every quest element MUST feel like it could have been written by the original series creator. This is not negotiable.

🌟 **PLAYER CONTEXT**:
{{{playerContext}}}

{{#if previousQuestCount}}
📊 **Previous Quests Completed**: {{previousQuestCount}} (Design something fresh while maintaining series consistency)
{{/if}}

🎯 **MISSION**: Design a quest that seamlessly integrates with the established series lore, characters, and world-building while providing compelling gameplay.

✨ **SERIES AUTHENTICITY REQUIREMENTS**:
- **Canon Compliance**: All quest elements must align with established series lore
- **World-Accurate Terminology**: Use exact names, locations, and concepts from the series
- **Character Voice Consistency**: NPCs and dialogue must match established personalities
- **Power System Accuracy**: Respect the series' unique magic/ability systems and limitations
- **Cultural Authenticity**: Reflect the series' societal structures and customs
- **Tonal Consistency**: Match the original series' narrative style and emotional depth

🏗️ **QUEST COMPONENTS**:

📜 **TITLE**: 
- Use series-appropriate naming conventions
- Reference established lore or terminology
- Should feel like an episode/chapter title from the original work

📖 **DESCRIPTION**: 
- **Written in the series' narrative style**
- Use **series-specific terminology** naturally
- Include **canon-accurate world details**
- Reference **established locations and cultures**
- **Second person perspective** that matches series tone
- **Markdown formatting** for emphasis consistent with series style

🎯 **OBJECTIVES** (2-4 series-authentic goals):
- Must be **achievable within series world rules**
- Reference **established locations, characters, or systems**
- Use **series-appropriate challenge types**
- Progress should feel like **natural story development**

🏆 **REWARDS** (1-3 series-meaningful prizes):
- **Canonical items, abilities, or knowledge** from the series
- Should **advance character development** in series-appropriate ways
- Must **respect the series' power progression systems**
- Tie directly to **established world lore and mechanics**

💡 **SERIES-SPECIFIC DESIGN PRINCIPLES**:
- Every quest should feel like a **deleted scene** from the original work
- Include **moral dilemmas** that reflect the series' themes
- NPCs should **behave authentically** to their established personalities
- Challenge difficulty should **match the series' power scaling**
- Story consequences should **align with series causality**

Remember: This quest should be indistinguishable from content created by the original series author.`,
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
