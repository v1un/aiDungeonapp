'use server';
/**
 * @fileOverview AI agent for advancing the story in the text-based RPG.
 * 
 * This module provides the core story advancement functionality for the AI Dungeon game.
 * It uses a variety of specialized tools to maintain narrative consistency, generate
 * branching storylines, and create a dynamic, responsive game world.
 *
 * @module advanceStory
 * @requires genkit
 * @requires @/ai/tools
 * 
 * Key exports:
 * - advanceStory - A function that handles story progression based on player input
 * - AdvanceStoryInput - The input type for the advanceStory function
 * - AdvanceStoryOutput - The return type for the advanceStory function
 */

import { ai, z } from '@/ai/genkit';
import type { /* Quest as _Quest, MainCharacter as _MainCharacter */ } from '@/types';

// Import all tools from the centralized tools registry
import { 
  // Lore tools
  retrieveLoreInfoTool,
  addLocationToLorebookTool,
  enrichLorebookTool,
  
  // Context management
  retrieveContextTool,
  updateContextTool,
  
  // Narrative branching
  generateBranchesTool,
  selectBranchTool,
  
  // World building
  generateLocationTool,
  generateEnvironmentTool,
  retrieveLocationTool,
  
  // Relationship management
  updateRelationshipTool,
  addCharacterMemoryTool,
  retrieveCharacterMemoriesTool
} from '@/ai/tools';

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
  seriesTitle: z.string().describe("The title of the series the game is based on."),
  presentCharacters: z.array(z.object({
    id: z.string().describe("The unique ID of the character present in the current scene."),
    name: z.string().describe("The name of the character."),
    description: z.string().optional().describe("Brief description of the character.")
  })).optional().describe("Characters currently present in the scene that the player may interact with.")
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
    enrichLorebookTool,
    updateRelationshipTool,
    addCharacterMemoryTool,
    retrieveCharacterMemoriesTool
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
    *   **Character Relationships and Memory**:
        *   **Use the 'retrieveCharacterMemoriesTool'**: Before characters react to the player, retrieve their memories to ensure consistent characterization and realistic reactions based on past interactions.
        *   **Use the 'addCharacterMemoryTool'**: When significant interactions occur, record them as memories for relevant characters with appropriate importance levels (1-10).
        *   **Use the 'updateRelationshipTool'**: When interactions affect relationships between characters, update the relationship details accordingly, including type, intensity, description, and specific event details.
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

/**
 * Error class for AI flow errors
 * Provides structured error information for better debugging and handling
 */
class AIFlowError extends Error {
  public readonly component: string;
  public readonly severity: 'critical' | 'warning' | 'info';
  public readonly originalError?: Error;

  constructor(message: string, component: string, severity: 'critical' | 'warning' | 'info' = 'warning', originalError?: Error) {
    super(message);
    this.name = 'AIFlowError';
    this.component = component;
    this.severity = severity;
    this.originalError = originalError;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIFlowError);
    }
  }
}

/**
 * Utility function to safely execute tool calls with proper error handling
 * @param toolName Name of the tool being called (for logging)
 * @param toolFn The tool function to call
 * @param params Parameters to pass to the tool
 * @param fallbackValue Value to return if the tool call fails
 * @returns Result of the tool call or fallback value
 */
async function safeToolCall<T, R>(
  toolName: string, 
  toolFn: (params: T) => Promise<R>, 
  params: T, 
  fallbackValue: R,
  isCritical = false
): Promise<R> {
  try {
    return await toolFn(params);
  } catch (error) {
    const severity = isCritical ? 'critical' : 'warning';
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`${severity.toUpperCase()} - ${toolName} failed: ${errorMessage}`);
    
    // Throw critical errors, return fallback for non-critical
    if (isCritical) {
      throw new AIFlowError(
        `Critical tool failure: ${toolName} - ${errorMessage}`,
        toolName,
        'critical',
        error instanceof Error ? error : new Error(String(error))
      );
    }
    
    return fallbackValue;
  }
}

const advanceStoryFlow = ai.defineFlow(
  {
    name: 'advanceStoryFlow',
    inputSchema: AdvanceStoryInputSchema,
    outputSchema: AdvanceStoryOutputSchema,
  },
  async (input) => {
    // Track performance metrics
    const startTime = Date.now();
    const metrics = {
      toolCalls: 0,
      toolErrors: 0,
      totalDuration: 0
    };
    
    try {
      console.log(`Starting story advancement for input: "${input.playerInput.substring(0, 50)}..."`);
      
      // First, try to retrieve any existing context from our context manager
      const contextResult = await safeToolCall(
        'retrieveContext',
        retrieveContextTool,
        {
          contextType: "all",
          timeframe: "recent"
        },
        { context: {} }
      );
      metrics.toolCalls++;
      
      // Log successful context retrieval
      if (contextResult.context && Object.keys(contextResult.context).length > 0) {
        console.log("Successfully retrieved context with keys:", Object.keys(contextResult.context).join(", "));
      }

      // Check if we have location details from world-building
      let locationDetails;
      if (input.currentLocation) {
        locationDetails = await safeToolCall(
          'retrieveLocation',
          retrieveLocationTool,
          {
            locationName: input.currentLocation,
            includeHidden: false
          },
          undefined
        );
        metrics.toolCalls++;
      }

      // Generate narrative branches based on the player's input
      const branchInput = {
        currentSituation: input.chatHistorySummary,
        playerOptions: [input.playerInput],
        storyGenre: input.seriesTitle,
        currentCharacters: contextResult.context?.importantNPCs || [],
        tonePreference: contextResult.context?.tonePreference || "dramatic"
      };
      
      const branches = await safeToolCall(
        'generateBranches',
        generateBranchesTool,
        branchInput,
        { branches: [] }
      );
      metrics.toolCalls++;

      // Select the appropriate branch based on player action
      let selectedBranch;
      if (branches && branches.branches && branches.branches.length > 0) {
        const branchSelection = await safeToolCall(
          'selectBranch',
          selectBranchTool,
          {
            playerAction: input.playerInput,
            relevantFactors: [
              input.currentLocation,
              ...(input.activeQuests.map(q => q.title) || []),
              ...(contextResult.context?.worldState ? [contextResult.context.worldState] : [])
            ],
            preferTone: contextResult.context?.tonePreference
          },
          { selectedBranch: null, needsNewBranches: false }
        );
        metrics.toolCalls++;
        
        if (branchSelection && branchSelection.selectedBranch) {
          selectedBranch = branchSelection.selectedBranch;
          console.log(`Selected narrative branch: "${selectedBranch.consequence.substring(0, 50)}..."`);
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
        const envInput = {
          currentLocation: input.currentLocation,
          timeProgression: 1, // Minimal time progression
          currentWeather: contextResult.context?.worldState?.weather || undefined,
          currentTimeOfDay: contextResult.context?.worldState?.timeOfDay || undefined,
          desiredMood: "immersive"
        };
        
        const environment = await safeToolCall(
          'generateEnvironment',
          generateEnvironmentTool,
          envInput,
          { environmentalElements: [], timeHasProgressed: false }
        );
        metrics.toolCalls++;
        
        if (environment && environment.environmentalElements && environment.environmentalElements.length > 0) {
          environmentDetails = environment.environmentalElements
            .map((e: { type: string; description: string }) => `${e.type}: ${e.description}`)
            .join("\n");
          console.log(`Generated ${environment.environmentalElements.length} environmental elements`);
        }
      }

      // Enhanced lorebook integration for better context
      let loreInfo = "";
      
      // Extract key terms from player input with improved NLP-like approach
      const playerInputTerms = input.playerInput
        .split(/\s+/)
        .filter(word => {
          // More sophisticated filtering - longer words and exclude common stop words
          const cleanWord = word.toLowerCase().replace(/[.,?!;:'"()]/g, '');
          return cleanWord.length > 3 && 
                 !['this', 'that', 'with', 'from', 'your', 'what', 'where', 'when', 'which', 
                   'there', 'their', 'these', 'those', 'about', 'have', 'will', 'would', 'could',
                   'should', 'been', 'being', 'because', 'before', 'after', 'under', 'over'].includes(cleanWord);
        });
      
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
          
          const loreResult = await safeToolCall(
            'retrieveLoreInfo',
            retrieveLoreInfoTool,
            { searchTerm },
            { found: false, relevantInfo: "" }
          );
          metrics.toolCalls++;
          
          if (loreResult && loreResult.found) {
            mainSearchResults.push(loreResult.relevantInfo);
            console.log(`Found lore information for term: ${searchTerm}`);
          }
        }
        
        // Then try context terms if we haven't found enough main results
        if (mainSearchResults.length < 2 && contextTerms.length > 0) {
          for (let i = 0; i < Math.min(2, contextTerms.length); i++) {
            const searchTerm = contextTerms[i];
            
            const loreResult = await safeToolCall(
              'retrieveLoreInfo',
              retrieveLoreInfoTool,
              { searchTerm },
              { found: false, relevantInfo: "" }
            );
            metrics.toolCalls++;
            
            if (loreResult && loreResult.found) {
              secondarySearchResults.push(loreResult.relevantInfo);
              console.log(`Found contextual lore information for term: ${searchTerm}`);
            }
          }
        }
        
        // Combine the results, prioritizing direct search results
        loreInfo = [...mainSearchResults, ...secondarySearchResults].join('\n\n---\n\n');
        
        if (loreInfo) {
          console.log(`Retrieved ${mainSearchResults.length + secondarySearchResults.length} lore entries`);
        }
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
      const enhancedHistory = `${input.chatHistorySummary}\n\n[SYSTEM: ${additionalContext}]`;
      
      console.log("Generating AI response with enhanced context...");
      const startAITime = Date.now();
      
      // This is a critical operation, so we'll use a longer timeout and more retries
      const promptResult = await safeToolCall(
        'advanceStoryPrompt',
        async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await prompt(<any>{
            ...input,
            chatHistorySummary: enhancedHistory
          });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        undefined as any, // Assuming undefined is a valid fallback, will refine if more context is available
        undefined,
        true // Mark as critical
      );
      
      const aiResponseTime = Date.now() - startAITime;
      console.log(`AI response generated in ${aiResponseTime}ms`);
      metrics.toolCalls++;

      if (!promptResult?.output) {
        throw new AIFlowError(
          'AI failed to generate a story advancement.',
          'advanceStoryPrompt',
          'critical'
        );
      }

      const output = promptResult.output;

      // Update context with new information
      console.log("Updating game context with new information...");
      
      // Update world state with location if changed
      if (output.updatedLocation) {
        await safeToolCall(
          'updateContext-location',
          updateContextTool,
          {
            updateType: "worldState", 
            worldState: {
              location: output.updatedLocation
            }
          },
          { success: false, message: "Failed to update location" }
        );
        metrics.toolCalls++;
        console.log(`Updated location to: ${output.updatedLocation}`);
      }
      
      // Add the player action as an event
      await safeToolCall(
        'updateContext-event',
        updateContextTool,
        {
          updateType: "event",
          event: {
            description: `Actor: ${input.mainCharacter.name}, Action: ${input.playerInput}, Location: ${input.currentLocation}, Outcome: ${output.narrativeResponse.substring(0, 100)}...`,
            importance: 5 // Increased importance for better context retention
          }
        },
        { success: false, message: "Failed to add event" }
      );
      metrics.toolCalls++;
      
      // Process character interactions if present characters are defined
      if (input.presentCharacters && input.presentCharacters.length > 0) {
        await handleCharacterInteractions(
          input.presentCharacters,
          input.mainCharacter.name,
          input.playerInput,
          output.narrativeResponse,
          input.currentLocation
        );
      }

      // Enrich the lorebook with new information from the narrative
      await safeToolCall(
        'enrichLorebook',
        enrichLorebookTool,
        {
          contextType: "custom",
          content: output.narrativeResponse,
          customCategory: "narrative"
        },
        { message: "Failed to enrich lorebook", entriesAdded: 0, entriesUpdated: 0, categories: [] }
      );
      metrics.toolCalls++;

      // Calculate and log performance metrics
      metrics.totalDuration = Date.now() - startTime;
      console.log(`Story advancement completed in ${metrics.totalDuration}ms with ${metrics.toolCalls} tool calls`);

      return output;
    } catch (error) {
      // Calculate final metrics even in error case
      metrics.totalDuration = Date.now() - startTime;
      
      // Enhanced error logging with structured information
      if (error instanceof AIFlowError) {
        console.error(`AI Flow Error [${error.severity}] in ${error.component}: ${error.message}`);
        if (error.originalError) {
          console.error('Original error:', error.originalError);
        }
      } else {
        console.error('Unhandled story advancement error:', error);
      }
      
      // Log performance metrics even in failure case
      console.log(`Failed story advancement took ${metrics.totalDuration}ms with ${metrics.toolCalls} tool calls`);
      
      // Provide a more graceful fallback for non-critical errors
      if (error instanceof AIFlowError && error.severity !== 'critical') {
        return {
          narrativeResponse: `Something unexpected happened as you ${input.playerInput}. The world seems to pause momentarily, as if gathering its thoughts. (The AI encountered a temporary issue. Please try again.)`,
          updatedLocation: undefined,
          updatedInventory: undefined,
          questProgress: undefined
        };
      }
      
      // Re-throw critical errors
      throw error;
    }
  }
);

/**
 * Processes interactions between the main character and other characters present in the scene.
 * Updates character memories and relationship dynamics based on narrative events.
 */
async function handleCharacterInteractions(
  presentCharacters: Array<{ id: string; name: string; description?: string }>,
  mainCharacterName: string,
  playerInput: string,
  narrativeResponse: string,
  location: string
): Promise<void> {
  try {
    // Process each character present in the scene
    for (const character of presentCharacters) {
      try {
        // Skip if character has no ID or name
        if (!character.id || !character.name) continue;
        
        // Add a memory to the character about this interaction
        const interactionSummary = summarizeInteraction(playerInput, narrativeResponse, character.name);
        const interactionImpact = determineInteractionImpact(narrativeResponse, character.name);
        const interactionType = determineInteractionType(playerInput, narrativeResponse, character.name);
        
        // Skip if no meaningful interaction detected
        if (interactionSummary && interactionSummary !== '') {
          // For significant interactions (impact > 1), create a memory
          const importance = Math.abs(interactionImpact) + 3; // Scale from 3-8 based on impact
          
          // Add memory to the character
          await safeToolCall(
            'addCharacterMemory',
            addCharacterMemoryTool,
            {
              characterId: character.id,
              content: `At ${location}, ${interactionSummary} This interaction was ${interactionImpact > 0 ? 'positive' : interactionImpact < 0 ? 'negative' : 'neutral'}.`,
              importance: importance
            },
            { success: false, message: "Failed to add character memory" }
          );
          
          // Also add memory for the main character
          await safeToolCall(
            'addMainCharacterMemory',
            addCharacterMemoryTool,
            {
              characterId: 'main',
              content: `At ${location}, I interacted with ${character.name}. ${interactionSummary}`,
              importance: importance
            },
            { success: false, message: "Failed to add main character memory" }
          );
          
          // For more significant interactions, update the relationship
          if (Math.abs(interactionImpact) >= 2) {
            // Retrieve previous memories to inform relationship updates
            // const previousMemories = await safeToolCall( // This line is removed to fix the unused variable warning
            //   'retrieveCharacterMemories',
            //   retrieveCharacterMemoriesTool,
            //   {
            //     characterId: 'main',
            //     limit: 3
            //   },
            //   { memories: [], success: false, message: "Failed to retrieve memories", characterName: "" }
            // );
            
            // Update the relationship with this new interaction
            await safeToolCall(
              'updateRelationship',
              updateRelationshipTool,
              {
                characterId1: 'main',
                characterId2: character.id,
                type: interactionType,
                intensity: calculateRelationshipIntensity(interactionType, interactionImpact),
                description: generateRelationshipDescription('main', character.name, interactionType, interactionImpact),
                eventDescription: interactionSummary,
                eventImpact: interactionImpact
              },
              { success: false, message: "Failed to update relationship" }
            );
          }
        }
      } catch (error) {
        console.log(`Failed to update memory or relationship for character ${character.name}:`, error);
      }
    }
  } catch (error) {
    console.log("Character interaction processing failed:", error);
  }
}

// Helper functions for character interactions
function determineInteractionType(playerInput: string, narrativeResponse: string, characterName: string): string {
  const combinedText = (playerInput + ' ' + narrativeResponse).toLowerCase();
  const charName = characterName.toLowerCase();
  
  // Check for hostile interactions
  if (combinedText.includes('attack') || combinedText.includes('fight') || combinedText.includes('threaten') ||
      combinedText.includes('kill') || combinedText.includes('hurt') || combinedText.includes('steal from')) {
    if (combinedText.includes(charName + ' attacks') || 
        combinedText.includes('attacks ' + charName) ||
        combinedText.includes(charName + ' fights') ||
        combinedText.includes('fights ' + charName)) {
      return 'enemy';
    }
  }
  
  // Check for friendly interactions
  if (combinedText.includes('help') || combinedText.includes('assist') || combinedText.includes('support') ||
      combinedText.includes('heal') || combinedText.includes('gift') || combinedText.includes('give to')) {
    return 'ally';
  }
  
  // Check for romantic interactions
  if (combinedText.includes('love') || combinedText.includes('kiss') || combinedText.includes('embrace') ||
      combinedText.includes('romantic') || combinedText.includes('flirt')) {
    return 'lover';
  }
  
  // Default to the most common case - acquaintance
  return 'acquaintance';
}

function determineInteractionImpact(narrativeResponse: string, characterName: string): number {
  const text = narrativeResponse.toLowerCase();
  const charName = characterName.toLowerCase();
  
  // Check for positive interaction markers
  const positiveMarkers = ['smile', 'thank', 'grateful', 'happy', 'pleased', 'appreciate', 
                          'laugh', 'joy', 'friendship', 'trust', 'help', 'respect'];
  const positiveCount = positiveMarkers.filter(marker => 
    text.includes(charName + ' ' + marker) || 
    text.includes(marker + 's ' + charName) || 
    text.includes(marker + 'ed ' + charName)
  ).length;
  
  // Check for negative interaction markers
  const negativeMarkers = ['frown', 'angry', 'upset', 'disappointed', 'worried', 'frightened', 
                          'scared', 'threaten', 'hurt', 'distrust', 'suspicion', 'hate'];
  const negativeCount = negativeMarkers.filter(marker => 
    text.includes(charName + ' ' + marker) || 
    text.includes(marker + 's ' + charName) || 
    text.includes(marker + 'ed ' + charName)
  ).length;
  
  // Calculate impact score from -5 to +5
  const impact = Math.min(5, Math.max(-5, positiveCount - negativeCount));
  return impact;
}

function summarizeInteraction(playerInput: string, narrativeResponse: string, characterName: string): string {
  // Extract relevant sentences mentioning the character
  const sentences = narrativeResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const relevantSentences = sentences.filter(s => 
    s.toLowerCase().includes(characterName.toLowerCase())
  );
  
  if (relevantSentences.length > 0) {
    // Return 1-2 relevant sentences as a summary
    return relevantSentences.slice(0, 2).join('. ') + '.';
  }
  
  // Fallback summary
  return `${characterName} was present when the player ${playerInput.substring(0, 30)}...`;
}

function calculateRelationshipIntensity(type: string, impact: number): number {
  // Base intensity based on type
  let baseIntensity = 5; // Default medium intensity
  
  if (type === 'lover') baseIntensity = 7;
  else if (type === 'enemy') baseIntensity = 6;
  else if (type === 'ally') baseIntensity = 6;
  
  // Modify based on impact
  return Math.min(10, Math.max(1, baseIntensity + Math.floor(impact / 2)));
}

function generateRelationshipDescription(char1Name: string, char2Name: string, type: string, impact: number): string {
  const impactText = impact > 2 ? "positively" : 
                    impact < -2 ? "negatively" : 
                    "somewhat";
  
  switch(type) {
    case 'ally':
      return `${char1Name} considers ${char2Name} an ally. Their recent interactions have ${impactText} affected their relationship.`;
    case 'enemy':
      return `${char1Name} sees ${char2Name} as an adversary. Recent events have ${impactText} reinforced this view.`;
    case 'lover':
      return `${char1Name} has romantic feelings toward ${char2Name}. Recent interactions have ${impactText} affected these feelings.`;
    default:
      return `${char1Name} and ${char2Name} have interacted, with ${impactText} effects on their relationship.`;
  }
}
