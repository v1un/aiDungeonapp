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
import { retrieveLoreInfoTool } from '@/ai/lore-tools'; // Import from flattened lore-tools file
import dotenv from 'dotenv';

// Load environment variables
dotenv.config(); // For .env
dotenv.config({ path: '.env.local', override: true }); // For .env.local
import type { /* Quest as _Quest, MainCharacter as _MainCharacter */ } from '@/types';

// Import our new advanced storytelling tools
import { retrieveContextTool, updateContextTool } from '@/ai/tools/context-manager-tools';
import { generateBranchesTool, selectBranchTool } from '@/ai/tools/narrative-branching-tools';
import { 
  generateLocationTool,
  generateEnvironmentTool,
  retrieveLocationTool 
} from '@/ai/tools/world-building-tools';

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
  tools: [
    retrieveLoreInfoTool,
    retrieveContextTool,
    updateContextTool,
    generateBranchesTool,
    selectBranchTool,
    generateLocationTool,
    generateEnvironmentTool,
    retrieveLocationTool
  ],
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
  async (input: AdvanceStoryInput): Promise<AdvanceStoryOutput> => {
    try {
      const aiProvider = process.env.AI_PROVIDER || 'googleai';
      let finalOutput: AdvanceStoryOutput;

      if (aiProvider === 'ollama') {
        // Gemma (Ollama) Path - Tool-less
        const gemmaResult = await gemmaAdvanceStoryPrompt(input);
        const narrativeResponse = typeof gemmaResult === 'string' ? gemmaResult : (gemmaResult as any).narrativeResponse || '';
        
        // Basic parsing attempts
        let updatedLocation: string | undefined;
        const locationMatch = narrativeResponse.match(/New Location: (.*?)(?:\n|$)/i);
        if (locationMatch && locationMatch[1]) {
          updatedLocation = locationMatch[1].trim();
        }

        let updatedInventory: string[] | undefined;
        const inventoryUpdateMatch = narrativeResponse.match(/Inventory Update: (.*?)(?:\n|$)/i);
        if (inventoryUpdateMatch && inventoryUpdateMatch[1]) {
          const inventoryChanges = inventoryUpdateMatch[1].trim();
          // This is very naive. A real parser would need to handle "gained X", "lost Y", "now has Z, W".
          // For now, let's assume it just lists the new inventory if it changes significantly.
          // Or, if it says "gained X", add to existing; "lost Y", remove from existing.
          // This part will require significant refinement if complex inventory updates are common.
          // As a simple placeholder, if "gained" or "lost" is mentioned, we could try to update.
          // For this initial implementation, we'll keep it simple: if the line exists, we'll take the text as a general description.
          // A more robust solution would involve Gemma providing a structured list, or more complex regex.
          // For now, we'll just pass the string as a sign that inventory changed, but not the items themselves.
          // This means updatedInventory might not be a list of strings as schema expects if parsing is hard.
          // Let's try a slightly more specific parsing for simple gain/loss.
          const gainedItems: string[] = [];
          const lostItems: string[] = [];
          const gainedMatches = inventoryChanges.matchAll(/gained ([^,.]+)/gi);
          for (const match of gainedMatches) {
            gainedItems.push(match[1].trim());
          }
          const lostMatches = inventoryChanges.matchAll(/lost ([^,.]+)/gi);
          for (const match of lostMatches) {
            lostItems.push(match[1].trim());
          }

          if (gainedItems.length > 0 || lostItems.length > 0) {
            // Create a new inventory based on changes
            let currentInventory = [...input.inventory];
            currentInventory = currentInventory.filter(item => !lostItems.includes(item));
            currentInventory.push(...gainedItems);
            updatedInventory = [...new Set(currentInventory)]; // Ensure unique items
          } else if (inventoryChanges.toLowerCase().includes("now has:") || inventoryChanges.toLowerCase().includes("inventory is now:")) {
            // If it's a full list
            const newItemsPart = inventoryChanges.substring(inventoryChanges.indexOf(':') + 1).trim();
            updatedInventory = newItemsPart.split(',').map(item => item.trim()).filter(item => item.length > 0);
          }
        }


        let questProgress: AdvanceStoryOutput['questProgress'] = {}; // Init as empty object
        const questCompletedMatch = narrativeResponse.match(/Quest '?(.*?)'? completed/i);
        if (questCompletedMatch && questCompletedMatch[1]) {
          questProgress.questCompleted = true;
          // Try to find questId if title matches an active quest
          const activeQuest = input.activeQuests.find(q => q.title.toLowerCase() === questCompletedMatch[1].trim().toLowerCase());
          questProgress.questId = activeQuest?.title; // Using title as ID as per simplified schema
          questProgress.updatedObjective = "Completed"; // Generic update
        }

        const questUpdatedMatch = narrativeResponse.match(/Quest '?(.*?)'? updated: (.*?)(?:\n|$)/i);
        if (questUpdatedMatch && questUpdatedMatch[1] && questUpdatedMatch[2]) {
           const activeQuest = input.activeQuests.find(q => q.title.toLowerCase() === questUpdatedMatch[1].trim().toLowerCase());
          questProgress.questId = activeQuest?.title;
          questProgress.updatedObjective = questUpdatedMatch[2].trim();
        }
        
        const newQuestMatch = narrativeResponse.match(/New Quest: '?(.*?)'?/i);
        if (newQuestMatch && newQuestMatch[1]) {
          questProgress.newQuest = newQuestMatch[1].trim();
        }
        // Ensure questProgress is undefined if empty
        if(Object.keys(questProgress).length === 0) questProgress = undefined;


        finalOutput = {
          narrativeResponse,
          updatedLocation,
          updatedInventory,
          questProgress,
        };

      } else {
        // Google AI (Gemini) Path - Tool-based (existing logic)
        // The existing logic for Gemini path involves multiple tool calls and context enrichment.
        // We'll keep that as is.
        // First, try to retrieve any existing context from our context manager
        let contextResult;
        try {
          contextResult = await retrieveContextTool({
            contextType: "all",
            timeframe: "recent"
          });
        } catch (/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
                 error) {
          console.log("Context retrieval failed or empty, proceeding without context");
          contextResult = { context: {} };
        }

        let locationDetails;
        try {
          if (input.currentLocation) {
            locationDetails = await retrieveLocationTool({
              locationName: input.currentLocation,
              includeHidden: false
            });
          }
        } catch (error) {
          console.log("Failed to retrieve location details:", error);
        }

        let branches;
        try {
          const branchInput = {
            currentSituation: input.chatHistorySummary,
            playerOptions: [input.playerInput],
            storyGenre: input.seriesTitle,
            currentCharacters: contextResult.context?.importantNPCs || [],
            tonePreference: contextResult.context?.tonePreference || "dramatic"
          };
          branches = await generateBranchesTool(branchInput);
        } catch (error) {
          console.log("Branch generation failed:", error);
        }

        let selectedBranch;
        if (branches && branches.branches && branches.branches.length > 0) {
          try {
            const branchSelection = await selectBranchTool({
              playerAction: input.playerInput,
              relevantFactors: [
                input.currentLocation,
                ...(input.activeQuests.map(q => q.title) || []),
                ...(contextResult.context?.worldState ? [contextResult.context.worldState] : [])
              ],
              preferTone: contextResult.context?.tonePreference
            });
            if (branchSelection && branchSelection.selectedBranch) {
              selectedBranch = branchSelection.selectedBranch;
            }
          } catch (error) {
            console.log("Branch selection failed:", error);
          }
        }
        
        let narrativeGuidance = "";
        if (selectedBranch) {
          narrativeGuidance = `Based on the player's action, this outcome seems most appropriate: 
          ${selectedBranch.consequence} 
          
          The narrative should incorporate this hook: ${selectedBranch.narrativeHook}`;
        }

        let environmentDetails = "";
        if (locationDetails && locationDetails.location) {
          try {
            const envInput = {
              currentLocation: input.currentLocation,
              timeProgression: 1,
              currentWeather: contextResult.context?.worldState?.weather || undefined,
              currentTimeOfDay: contextResult.context?.worldState?.timeOfDay || undefined,
              desiredMood: "immersive"
            };
            const environment = await generateEnvironmentTool(envInput);
            if (environment && environment.environmentalElements) {
              environmentDetails = environment.environmentalElements
                .map((e: { type: string; description: string }) => `${e.type}: ${e.description}`)
                .join("\n");
            }
          } catch (error) {
            console.log("Environment generation failed:", error);
          }
        }
        
        let loreInfo = "";
        try {
          const terms = input.playerInput.split(/\s+/).filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'your', 'what', 'where', 'when', 'which'].includes(word.toLowerCase()));
          if (terms.length > 0) {
            const searchTerm = terms[Math.floor(Math.random() * terms.length)];
            const loreResult = await retrieveLoreInfoTool({ searchTerm: searchTerm });
            if (loreResult && loreResult.found) {
              loreInfo = loreResult.relevantInfo;
            }
          }
        } catch (error) {
          console.log("Lore retrieval failed:", error);
        }

        const additionalContext = [
          locationDetails && locationDetails.location ? `Location Description: ${locationDetails.location.description}` : '',
          environmentDetails ? `Environmental Context:\n${environmentDetails}` : '',
          narrativeGuidance ? `Narrative Guidance:\n${narrativeGuidance}` : '',
          loreInfo ? `Relevant Lore Information:\n${loreInfo}` : ''
        ].filter(Boolean).join("\n\n");
        
        const enhancedHistory = `${input.chatHistorySummary}\n\n[SYSTEM: ${additionalContext}]`;
        
        const geminiToolResult = await prompt({ // existing 'prompt' is the tool-enabled one
          ...input,
          chatHistorySummary: enhancedHistory
        });

        if (!geminiToolResult.output) {
          throw new Error('AI (Gemini) failed to generate a story advancement.');
        }
        finalOutput = geminiToolResult.output;

        // Update context with new information (only for Gemini path as it uses tools)
        try {
          if (finalOutput.updatedLocation) {
            await updateContextTool({
              updateType: "worldState", 
              worldState: { location: finalOutput.updatedLocation }
            });
          }
          await updateContextTool({
            updateType: "event",
            event: {
              description: `Actor: ${input.mainCharacter.name}, Action: ${input.playerInput}, Location: ${input.currentLocation}, Outcome: ${finalOutput.narrativeResponse.substring(0, 100)}...`,
              importance: 1
            }
          });
        } catch (error) {
          console.log("Context update failed for Gemini path:", error);
        }
      }

      return finalOutput;

    } catch (error) {
      console.error("Error in advanceStoryFlow:", error);
      // Fallback response if something goes wrong
      return {
        narrativeResponse: `*The narrator pauses for a moment...*\n\nYour action, "${input.playerInput}", leads to unexpected developments. As ${input.mainCharacter.name}, you find yourself adapting to the situation, drawing on your experience and instincts.\n\n*What do you do next?*`
      };
    }
  }
);

// New prompt for Gemma (Ollama) - tool-less
const GemmaAdvanceStoryOutputSchema = z.object({ // Simple schema for Gemma's direct output
  narrativeResponse: z.string(),
});

const gemmaAdvanceStoryPrompt = ai.definePrompt({
  name: 'gemmaAdvanceStoryPrompt',
  input: { schema: AdvanceStoryInputSchema },
  // No explicit output schema here means the result will be the raw string from the model.
  // We could use GemmaAdvanceStoryOutputSchema if we wanted Genkit to try and parse it into an object {narrativeResponse: "..."}
  // For now, let's keep it simple and expect a raw string, which we handle in the 'ollama' path.
  // output: { schema: GemmaAdvanceStoryOutputSchema }, 
  
  // NO TOOLS for Gemma
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
Narrate a comprehensive and engaging outcome of the player's action. Your response should be a single piece of narrative text.
Within this narrative, you MUST explicitly describe the following, if they occur as a result of the action:
1.  **Narrative Outcome**: Describe what happens. Be descriptive and maintain the tone of "{{seriesTitle}}". Use markdown for emphasis (*italics* for thoughts, **bold** for key actions or names).
2.  **Location Changes**: If the character moves to a new distinct location, state it clearly. For example: "New Location: The Dragon's Lair."
3.  **Inventory Changes**: If the player gains or loses items, describe this. For example: "Inventory Update: You gained a Rusty Sword. You lost 3 Gold Coins." or "Inventory Update: Your inventory is now: Torch, Map."
4.  **Quest Progression**: If an active quest is updated or completed, or if a new quest is triggered, describe it. For example: "Quest 'Find the Artifact' updated: You found the hidden inscription." or "Quest 'Rescue the Villager' completed!" or "New Quest: 'Explore the Whispering Caves'."
5.  **NPC Reactions**: If NPCs are present or involved, describe their reactions.

CRITICAL: Format your response so that these specific changes are easy to identify using the suggested keywords (e.g., "New Location:", "Inventory Update:", "Quest ... updated/completed", "New Quest:").

Example of how to structure important changes within your narrative:
"...the old chest creaks open. Inside, you find a gleaming amulet!
Inventory Update: You gained a Gleaming Amulet.
New Location: Secret Chamber.
Quest 'The Hidden Relic' updated: You found the Amulet of Ancients.
The ghostly guardian nods, its task fulfilled, and fades away..."

Keep the story moving forward. Avoid simply saying "You can't do that." Instead, describe why an action might fail or have unintended consequences.
`,
});
