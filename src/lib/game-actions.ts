'use server';

import type { Message, SeriesDetails, ProcessedPlayerInput, ClientGameStateUpdate, Quest } from '@/types';
import { generateSeriesDetails } from '@/ai/flows/generate-series-details';
import { advanceStory, type AdvanceStoryInput } from '@/ai/flows/advance-story'; // Updated import

interface ServerGameState {
  seriesSetupComplete: boolean;
  seriesDetails?: SeriesDetails;
  inventory: string[];
  currentLocation: string;
  activeQuests: Quest[];
}

// Store game states by session ID
const gameStates = new Map<string, ServerGameState>();

// Default game state for new sessions
const createDefaultGameState = (): ServerGameState => ({
  seriesSetupComplete: false,
  inventory: [],
  currentLocation: 'Not yet determined',
  activeQuests: [],
});

// Function to allow Genkit tools to access current game state for a session
export async function getCurrentGameState(sessionId?: string): Promise<ServerGameState> {
  if (!sessionId) {
    return createDefaultGameState();
  }
  
  if (!gameStates.has(sessionId)) {
    gameStates.set(sessionId, createDefaultGameState());
  }
  
  return gameStates.get(sessionId)!;
}

// This is a workaround for passing session context to tools
// Using interface declaration instead of namespace
interface Global {
  currentSessionId?: string;
}

// Set the current session ID for tools to use
export async function setCurrentToolSessionId(sessionId?: string) {
  (global as Global).currentSessionId = sessionId;
}

/**
 * Process player input and update game state accordingly
 * @param playerInput The text input from the player
 * @param chatHistory The message history of the current session
 * @param sessionId The ID of the current game session
 * @returns Processed player input with AI response and game state updates
 */
export async function processPlayerInput(
  playerInput: string, 
  chatHistory: Message[], 
  sessionId?: string
): Promise<ProcessedPlayerInput> {
  // Set the current session ID for tools to use
  setCurrentToolSessionId(sessionId);
  
  // Ensure we have a valid session ID
  if (!sessionId) {
    console.warn("No session ID provided to processPlayerInput");
    return { 
      responseText: "Session error: Please refresh the page and try again." 
    };
  }
  
  // Get or create the game state for this session
  if (!gameStates.has(sessionId)) {
    gameStates.set(sessionId, createDefaultGameState());
  }
  
  const currentGameState = gameStates.get(sessionId)!;
  const gameStateUpdate: ClientGameStateUpdate = {};

  if (!currentGameState.seriesSetupComplete) {
    if (!playerInput.trim()) {
      return { responseText: "Please provide the name of a fictional series to begin." };
    }
    try {
      const seriesDetails = await generateSeriesDetails({ seriesName: playerInput, useCache: true });
      
      // Flag to track if this was from cache (we'll know if an error occurred but we still got details)
      let isFromCache = false;
      
      try {
        // Small trick to detect if we're using cached content:
        // Try to generate without cache, if it fails it means the original was from cache
        await generateSeriesDetails({ seriesName: playerInput, useCache: false });
      } catch (error) {
        isFromCache = true;
      }
      
      currentGameState.seriesSetupComplete = true;
      // Ensure all otherCharacters have a defined string id and relationships have valid types
      const fixedSeriesDetails: SeriesDetails = {
        ...seriesDetails,
        otherCharacters: (seriesDetails.otherCharacters || []).map((char, idx) => ({
          ...char,
          id: char.id ?? `char-${idx}`,
        })),
        // Ensure relationships have valid types from the enum
        relationships: seriesDetails.relationships ? Object.fromEntries(
          Object.entries(seriesDetails.relationships).map(([key, relations]) => [
            key,
            // Check if relations is an array before trying to map over it
            Array.isArray(relations) ? relations.map(rel => {
              // Check if this is a Relationship object or a nested structure
              if ('characterId' in rel && !('relationships' in rel)) {
                return {
                  description: rel.description || "Unknown relationship",
                  type: ['ally', 'enemy', 'family', 'friend', 'rival', 'mentor', 'student', 
                        'lover', 'acquaintance', 'business', 'political', 'unknown'].includes(rel.type) 
                        ? rel.type as "unknown" | "ally" | "enemy" | "family" | "friend" | "rival" | 
                          "mentor" | "student" | "lover" | "acquaintance" | "business" | "political"
                        : 'unknown',
                  characterId: rel.characterId || "",
                  characterName: rel.characterName || "Unknown Character",
                  intensity: rel.intensity || 5,
                  history: rel.history || []
                };
              } else {
                // Handle the case where rel has a different structure
                return {
                  description: "Unknown relationship",
                  type: 'unknown' as "unknown",
                  characterId: 'characterId' in rel ? rel.characterId : "",
                  characterName: "Unknown Character",
                  intensity: 5,
                  history: []
                };
              }
            }) : []
          ])
        ) : undefined,
        // Fix worldMemory structure to match the expected type
        worldMemory: seriesDetails.worldMemory ? {
          globalEvents: seriesDetails.worldMemory.globalEvents || []
        } : undefined
      };
      currentGameState.seriesDetails = fixedSeriesDetails;
      currentGameState.inventory = seriesDetails.initialInventory || [];
      currentGameState.currentLocation = seriesDetails.startingLocation || 'An Unknown Place';
      currentGameState.activeQuests = [];
      
      if (seriesDetails.initialQuest) {
        // Add the initialQuest to active quests
        currentGameState.activeQuests.push(seriesDetails.initialQuest);
      }
      
      gameStateUpdate.seriesDetails = fixedSeriesDetails;
      gameStateUpdate.inventory = currentGameState.inventory;
      gameStateUpdate.currentLocation = currentGameState.currentLocation;
      gameStateUpdate.activeQuests = currentGameState.activeQuests;

      let responseText = `The world of **${seriesDetails.seriesTitle}** materializes around you. You are **${seriesDetails.mainCharacter.name}**, and right now...\n\n`;
      responseText += `${seriesDetails.initialPromptForPlayer}`;
      
      // Add a notice if we're using cached content
      if (isFromCache) {
        responseText += `\n\n*(Note: Using a cached version of this world due to temporary AI service issues. Content was generated during a previous session.)*`;
      }
      
      responseText += `\n\n*(Character details, inventory, and your current quest are in the Game Info sidebar. Click the book icon to explore the full **Lorebook** with detailed information about this world!)*`;
      
      return { responseText, gameStateUpdate };
    } catch (error) {
      console.error('Error generating series details:', error);
      gameStates.set(sessionId, createDefaultGameState()); // Reset the state on error
      
      gameStateUpdate.seriesDetails = undefined;
      gameStateUpdate.inventory = [];
      gameStateUpdate.currentLocation = 'Not yet determined';
      gameStateUpdate.activeQuests = [];
      
      // Provide more specific error messages based on error type
      let errorMessage = 'I encountered an issue setting up that series. Please try a different series name or try again.';
      
      // Check for specific error types to provide better guidance
      if (error instanceof Error) {
        // API service errors (temporary issues)
        if (error.message.includes('500 Internal Server Error') || 
            error.message.includes('503 Service Unavailable')) {
          errorMessage = 'The AI service is currently experiencing issues. This is likely a temporary problem. ' + 
                        'Please try again in a few minutes.';
        }
        // Rate limiting or quota errors
        else if (error.message.includes('429 Too Many Requests')) {
          errorMessage = 'We\'ve hit the AI service rate limits. Please try again in a few minutes.';
        }
        // Network or connection errors
        else if (error.message.includes('network') || error.message.includes('connection') || 
                 error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
          errorMessage = 'There seems to be a network issue connecting to the AI service. ' +
                        'Please check your internet connection and try again.';
        }
      }
      
      return { 
        responseText: errorMessage,
        gameStateUpdate 
      };
    }
  } else {
    // Story continuation logic using the new advanceStory flow
    try {
      const recentHistory = chatHistory.slice(-5).map(m => `${m.sender === 'player' ? currentGameState.seriesDetails?.mainCharacter.name || 'Player' : 'Narrator'}: ${m.text}`).join('\n');
      
      const advanceStoryInput: AdvanceStoryInput = {
        playerInput: playerInput,
        chatHistorySummary: recentHistory || "The adventure has just begun.",
        mainCharacter: { // Pass simplified main character details
            name: currentGameState.seriesDetails!.mainCharacter.name,
            description: currentGameState.seriesDetails!.mainCharacter.description,
        },
        currentLocation: currentGameState.currentLocation,
        inventory: currentGameState.inventory,
        activeQuests: currentGameState.activeQuests.map(q => ({ // Pass simplified active quest details
            title: q.title,
            description: q.description,
            objectives: q.objectives,
        })),
        seriesTitle: currentGameState.seriesDetails!.seriesTitle,
      };
      
      const aiResponse = await advanceStory(advanceStoryInput);
      
      // Update server game state based on AI response
      if (aiResponse.updatedLocation) {
        currentGameState.currentLocation = aiResponse.updatedLocation;
        gameStateUpdate.currentLocation = currentGameState.currentLocation;
      }
      if (aiResponse.updatedInventory) {
        currentGameState.inventory = aiResponse.updatedInventory;
        gameStateUpdate.inventory = currentGameState.inventory;
      }
      // Basic quest progress handling (can be expanded)
      if (aiResponse.questProgress) {
        if (aiResponse.questProgress.questCompleted && aiResponse.questProgress.questId) {
          const questIdToUpdate = currentGameState.activeQuests.find(q=> q.title.includes(aiResponse.questProgress!.questId!))?.id || aiResponse.questProgress.questId;
          currentGameState.activeQuests = currentGameState.activeQuests.map(q => 
            q.id === questIdToUpdate ? { ...q, status: 'completed' } : q
          );
        }
        // For now, we're not dynamically adding new quests described by AI's `newQuest` field.
        // That would require a separate call to generate a full quest object.
        // We also don't have fine-grained objective tracking update from AI yet.
        gameStateUpdate.activeQuests = [...currentGameState.activeQuests]; // Send updated list
      }
      
      return { responseText: aiResponse.narrativeResponse, gameStateUpdate };
    } catch (error) {
      console.error('Error in AI story advancement:', error);
      return { responseText: `The mists of possibility swirl unpredictably... (AI response error). You said: "${playerInput}". Perhaps try a different approach?` };
    }
  }
}
