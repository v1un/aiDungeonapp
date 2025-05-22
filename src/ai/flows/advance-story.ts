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
import { retrieveLoreInfoTool, addLocationToLorebookTool, enrichLorebookTool } from '@/ai/lore-tools'; // Import from flattened lore-tools file
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
    retrieveLocationTool,
    addLocationToLorebookTool,
    enrichLorebookTool
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
3.  **Lore Integration (CRITICALLY IMPORTANT)**:
    *   **Actively Use Provided Lore**: When I provide lore information in the prompt, make sure to incorporate these details naturally into your narrative to maintain world consistency. Don't ignore the lore context I've included.
    *   **For Additional Lore Needs**: If the player asks about or interacts with a specific person, place, item, or concept from "{{seriesTitle}}", or if your narrative needs to describe something that should be in the established lore:
        *   **Use the 'retrieveLoreInfoTool'**: Formulate a concise \`searchTerm\` (and optionally a \`categoryHint\`) to query the lorebook.
        *   **Integrate Information Naturally**: Weave the information returned by the tool seamlessly into your narrative response, as if you already knew these details. Never say "According to the lorebook..." or similar phrases.
    *   **When Discovering New Locations**: If the player discovers or creates a significant new location that deserves to be remembered:
        *   **Use the 'addLocationToLorebookTool'**: Add the location with a rich description and appropriate category.
    *   **Automatic Lorebook Enrichment**: 
        *   **Use the 'enrichLorebookTool'** with your narrative response to automatically extract key information about the world, characters, events, items, or locations. This ensures the lorebook stays updated with all significant world elements.
        *   When you create significant new narrative elements, always try to update the lorebook.
    *   **World Building**: Consistently reference established lore elements to create a cohesive world experience. When no specific lore exists for something important, create plausible details that align with the existing world.
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
    try {
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
        // Continue without context if retrieval fails
        contextResult = { context: {} };
      }

      // Check if we have location details from world-building
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
        // Continue without location details
      }

      // Generate narrative branches based on the player's input
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
        // Continue without branches
      }

      // Select the appropriate branch based on player action
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
          // Continue without selected branch
        }
      }

      // Use the selected branch to guide our story generation
      let narrativeGuidance = "";
      if (selectedBranch) {
        narrativeGuidance = `Based on the player's action, this outcome seems most appropriate: 
        ${selectedBranch.consequence} 
        
        The narrative should incorporate this hook: ${selectedBranch.narrativeHook}`;
      }

      // Generate environmental details if we have location information
      let environmentDetails = "";
      if (locationDetails && locationDetails.location) {
        try {
          const envInput = {
            currentLocation: input.currentLocation,
            timeProgression: 1, // Minimal time progression
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

      // Enhanced lorebook integration for better context
      let loreInfo = "";
      try {
        // Extract key terms from player input
        const playerInputTerms = input.playerInput
          .split(/\s+/)
          .filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'your', 'what', 'where', 'when', 'which', 'there', 'their', 'these', 'those', 'about'].includes(word.toLowerCase()));
        
        // Context-aware term extraction - consider current location and quest objectives
        const contextTerms = [];
        if (input.currentLocation) {
          contextTerms.push(input.currentLocation);
        }
        
        // Extract key terms from active quests
        if (input.activeQuests && input.activeQuests.length > 0) {
          const activeQuest = input.activeQuests[0]; // Focus on the most relevant quest
          if (activeQuest.title) {
            const questTitle = activeQuest.title.split(/\s+/).filter(w => w.length > 4);
            contextTerms.push(...questTitle);
          }
        }

        // Combine all potential search terms, prioritizing player input
        const allTerms = [...playerInputTerms, ...contextTerms];
        
        // If we have terms to search for
        if (allTerms.length > 0) {
          const mainSearchResults: string[] = [];
          const secondarySearchResults: string[] = [];
          
          // First try direct search with player input terms - up to 2 terms
          for (let i = 0; i < Math.min(2, playerInputTerms.length); i++) {
            const searchTerm = playerInputTerms[i];
            try {
              const loreResult = await retrieveLoreInfoTool({
                searchTerm: searchTerm
              });
              
              if (loreResult && loreResult.found) {
                mainSearchResults.push(loreResult.relevantInfo);
              }
            } catch (err) {
              console.log(`Error searching for term ${searchTerm}:`, err);
            }
          }
          
          // Then try context terms if we haven't found enough main results
          if (mainSearchResults.length < 2 && contextTerms.length > 0) {
            for (let i = 0; i < Math.min(2, contextTerms.length); i++) {
              const searchTerm = contextTerms[i];
              try {
                const loreResult = await retrieveLoreInfoTool({
                  searchTerm: searchTerm
                });
                
                if (loreResult && loreResult.found) {
                  secondarySearchResults.push(loreResult.relevantInfo);
                }
              } catch (err) {
                console.log(`Error searching for context term ${searchTerm}:`, err);
              }
            }
          }
          
          // Combine the results, prioritizing direct search results
          loreInfo = [...mainSearchResults, ...secondarySearchResults].join('\n\n---\n\n');
        }
      } catch (error) {
        console.log("Enhanced lore retrieval failed:", error);
      }

      // Prepare comprehensive context to ensure rich narrative responses
      const additionalContext = [
        // Location is critical for spatial awareness
        locationDetails && locationDetails.location ? `CURRENT LOCATION DETAILS:\n${locationDetails.location.description}` : '',
        
        // Environmental elements for immersion
        environmentDetails ? `ENVIRONMENTAL CONTEXT:\n${environmentDetails}` : '',
        
        // Narrative guidance from the system
        narrativeGuidance ? `NARRATIVE GUIDANCE:\n${narrativeGuidance}` : '',
        
        // Critical lorebook information - double importance
        loreInfo ? `IMPORTANT LOREBOOK CONTEXT (MUST USE THIS INFORMATION):\n${loreInfo}` : ''
      ].filter(Boolean).join("\n\n====================\n\n");

      // Process through the AI with the standard input
      // Note: We can't easily add enhanced system instructions due to the type constraints,
      // but we can provide context in the chat history
      const enhancedHistory = `${input.chatHistorySummary}\n\n[SYSTEM: ${additionalContext}]`;
      
      const { output } = await prompt({
        ...input,
        chatHistorySummary: enhancedHistory
      });

      if (!output) {
        throw new Error('AI failed to generate a story advancement.');
      }

      // Update context with new information
      try {
        // Update world state with location if changed
        if (output.updatedLocation) {
          await updateContextTool({
            updateType: "worldState", 
            worldState: {
              location: output.updatedLocation
            }
          });
        }
        
        // Add the player action as an event
        await updateContextTool({
          updateType: "event",
          event: {
            description: `Actor: ${input.mainCharacter.name}, Action: ${input.playerInput}, Location: ${input.currentLocation}, Outcome: ${output.narrativeResponse.substring(0, 100)}...`,
            importance: 1
          }
        });
      } catch (error) {
        console.log("Context update failed:", error);
      }

      // Automatically enrich the lorebook with the narrative response
      try {
        if (output && output.narrativeResponse) {
          // Determine the most appropriate context type based on player input and response
          let contextType: 'world' | 'character' | 'event' | 'item' | 'location' | 'custom' = 'world';
          
          if (input.playerInput.toLowerCase().includes('talk') || 
              input.playerInput.toLowerCase().includes('speak') || 
              input.playerInput.toLowerCase().includes('ask') ||
              output.narrativeResponse.includes('said') ||
              output.narrativeResponse.includes('replied')) {
            contextType = 'character';
          } else if (input.playerInput.toLowerCase().includes('go') || 
                    input.playerInput.toLowerCase().includes('travel') || 
                    input.playerInput.toLowerCase().includes('enter') ||
                    output.updatedLocation) {
            contextType = 'location';
          } else if (input.playerInput.toLowerCase().includes('take') || 
                    input.playerInput.toLowerCase().includes('pick up') || 
                    input.playerInput.toLowerCase().includes('use') ||
                    output.updatedInventory) {
            contextType = 'item';
          }
          
          await enrichLorebookTool({
            content: output.narrativeResponse,
            contextType: contextType
          });
        }
      } catch (error) {
        console.log("Auto-enrichment of lorebook failed:", error);
        // Don't block the response if enrichment fails
      }

      return output;
    } catch (error) {
      console.error("Error in advanceStoryFlow:", error);
      // Fallback response if something goes wrong
      return {
        narrativeResponse: `*The narrator pauses for a moment...*\n\nYour action leads to unexpected developments. As ${input.mainCharacter.name}, you find yourself adapting to the situation, drawing on your experience and instincts.\n\n*What do you do next?*`
      };
    }
  }
);
