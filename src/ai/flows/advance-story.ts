
'use server';
/**
 * @fileOverview AI agent for advancing the story in the text-based RPG.
 * It uses a lore retrieval tool to maintain consistency and provide details.
 *
 * - advanceStory - A function that handles story progression.
 * - AdvanceStoryInput - The input type for the advanceStory function.
 * - AdvanceStoryOutput - The return type for the advanceStory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { retrieveLoreInfoTool } from '@/ai/tools/retrieve-lore-info';
import type { Quest, MainCharacter } from '@/types';

const AdvanceStoryInputSchema = z.object({
  playerInput: z.string().describe("The player's latest action or dialogue."),
  chatHistorySummary: z.string().describe("A brief summary of the last 3-5 turns of conversation."),
  mainCharacter: z.object({ // Simplified MainCharacter for context
    name: z.string(),
    description: z.string(),
  }).describe("Details of the main character the player is controlling."),
  currentLocation: z.string().describe("The character's current location in the game world."),
  inventory: z.array(z.string()).describe("The character's current inventory items."),
  activeQuests: z.array(z.object({ // Simplified Quest for context
    title: z.string(),
    description: z.string(),
    objectives: z.array(z.string()),
  })).describe("The character's currently active quests and their objectives."),
  seriesTitle: z.string().describe("The title of the series the game is based on.")
});
export type AdvanceStoryInput = z.infer<typeof AdvanceStoryInputSchema>;

const AdvanceStoryOutputSchema = z.object({
  narrativeResponse: z.string().describe("The AI's narrative continuation of the story, describing the outcome of the player's action, character reactions, and changes in the environment. Should be engaging and use markdown for emphasis."),
  updatedLocation: z.string().optional().describe("If the character's location changed as a result of the action, provide the new location name."),
  updatedInventory: z.array(z.string()).optional().describe("If the character's inventory changed (item gained or lost), provide the full updated list of items."),
  questProgress: z.object({
    questId: z.string().optional().describe("ID of the quest if its status or objectives changed."),
    updatedObjective: z.string().optional().describe("A specific objective that was completed or made progress on."),
    questCompleted: z.boolean().optional().describe("Whether an active quest was completed."),
    newQuest: z.string().optional().describe("Title of a new quest if one was triggered.") // For simplicity, not full new quest object from AI
  }).optional().describe("Updates to quest status or objectives based on the player's action.")
});
export type AdvanceStoryOutput = z.infer<typeof AdvanceStoryOutputSchema>;

export async function advanceStory(input: AdvanceStoryInput): Promise<AdvanceStoryOutput> {
  return advanceStoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'advanceStoryPrompt',
  input: {schema: AdvanceStoryInputSchema},
  output: {schema: AdvanceStoryOutputSchema},
  tools: [retrieveLoreInfoTool],
  prompt: `You are a master storyteller and Game Master for an immersive text-based RPG set in the world of **{{seriesTitle}}**.
The player is controlling **{{mainCharacter.name}}** ({{mainCharacter.description}}).

Current Situation:
- Location: {{currentLocation}}
- Inventory: {{#if inventory}}{{#each inventory}}- {{this}}\n{{/each}}{{else}}Empty{{/if}}
- Active Quests:
  {{#if activeQuests}}
  {{#each activeQuests}}
  - **{{title}}**: {{description}} (Objectives: {{#each objectives}}[{{this}}]{{/each}})
  {{/each}}
  {{else}}
  No active quests.
  {{/if}}

Recent Events (Chat History Summary):
{{{chatHistorySummary}}}

Player's Action: "{{playerInput}}"

Your Task:
1.  **Narrate the Outcome**: Describe what happens as a result of the player's action. Be descriptive, engaging, and maintain the tone of "{{seriesTitle}}". Use markdown for emphasis (*italics* for thoughts, **bold** for key actions or names).
2.  **World Interaction**: If the player interacts with an object, talks to an NPC (even if not explicitly named, infer if appropriate), or explores, describe the results.
3.  **Lore Consistency**:
    *   If the player asks about a specific person, place, item, or concept from "{{seriesTitle}}", or if your narrative needs to describe something that is likely detailed in the established lore (e.g., the history of a location, the abilities of a character, how a magic system works):
    *   **Use the 'retrieveLoreInfoTool'**: Formulate a concise \`searchTerm\` (and optionally a \`categoryHint\`) to query the lorebook.
    *   **Integrate Information**: Weave the information returned by the tool naturally into your narrative response. Do not just state "The tool said...".
    *   If the tool finds no information, acknowledge that the detail might be unknown or not prominent in the established lore, and continue the narrative plausibly.
4.  **State Changes (IMPORTANT - REFLECT IN OUTPUT SCHEMA)**:
    *   **Location**: If the player's action leads them to a new distinct named location, set \`updatedLocation\`.
    *   **Inventory**: If the player gains or loses an item, provide the *complete updated list* in \`updatedInventory\`.
    *   **Quests**:
        *   If an objective of an active quest is clearly completed, mention it in the narrative and reflect this in \`questProgress\`.
        *   If an entire quest is completed, state it and set \`questProgress.questCompleted = true\`.
        *   If a new minor quest or task is naturally triggered by events, you can suggest it in the narrative and note its title in \`questProgress.newQuest\`. (For now, the system will handle full quest creation based on this title later if needed).
5.  **NPC Reactions**: If NPCs are present, describe their reactions to the player's actions or dialogue. If no NPCs are detailed in context, you can introduce minor, unstated characters if plausible for the scene (e.g., 'a shopkeeper', 'a guard').

Avoid simply saying "You can't do that." Instead, describe why an action might fail or have unintended consequences. Keep the story moving forward.
`,
});

const advanceStoryFlow = ai.defineFlow(
  {
    name: 'advanceStoryFlow',
    inputSchema: AdvanceStoryInputSchema,
    outputSchema: AdvanceStoryOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate a story advancement.');
    }
    return output;
  }
);
