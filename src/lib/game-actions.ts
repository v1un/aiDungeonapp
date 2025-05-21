
'use server';

import type { Message, SeriesDetails, ProcessedPlayerInput, ClientGameStateUpdate, Quest, Lorebook } from '@/types';
import { generateSeriesDetails } from '@/ai/flows/generate-series-details';
import { advanceStory, type AdvanceStoryInput } from '@/ai/flows/advance-story'; // Updated import

interface ServerGameState {
  seriesSetupComplete: boolean;
  seriesDetails?: SeriesDetails;
  inventory: string[];
  currentLocation: string;
  activeQuests: Quest[];
}

let currentGameState: ServerGameState = {
  seriesSetupComplete: false,
  inventory: [],
  currentLocation: 'Not yet determined',
  activeQuests: [],
};

// Function to allow Genkit tools to access current game state
export async function getCurrentGameState(): Promise<ServerGameState> {
  return currentGameState;
}


export async function processPlayerInput(playerInput: string, chatHistory: Message[]): Promise<ProcessedPlayerInput> {
  const gameStateUpdate: ClientGameStateUpdate = {};

  if (!currentGameState.seriesSetupComplete) {
    if (!playerInput.trim()) {
      return { responseText: "Please provide the name of a fictional series to begin." };
    }
    try {
      const seriesDetails = await generateSeriesDetails({ seriesName: playerInput });
      currentGameState.seriesSetupComplete = true;
      currentGameState.seriesDetails = seriesDetails;
      currentGameState.inventory = seriesDetails.initialInventory || [];
      currentGameState.currentLocation = seriesDetails.startingLocation || 'An Unknown Place';
      currentGameState.activeQuests = [];
      if (seriesDetails.initialQuest) {
        // Ensure the initialQuest is fully formed Quest object
        currentGameState.activeQuests.push({
            id: seriesDetails.initialQuest.id || `quest-init-${Date.now()}`, // Ensure ID
            status: seriesDetails.initialQuest.status || 'active', // Ensure status
            ...seriesDetails.initialQuest
        } as Quest);
      }
      
      gameStateUpdate.seriesDetails = seriesDetails;
      gameStateUpdate.inventory = currentGameState.inventory;
      gameStateUpdate.currentLocation = currentGameState.currentLocation;
      gameStateUpdate.activeQuests = currentGameState.activeQuests;

      let responseText = `The world of **${seriesDetails.seriesTitle}** materializes around you. You are **${seriesDetails.mainCharacter.name}**, and right now...\n\n`;
      responseText += `${seriesDetails.initialPromptForPlayer}`;
      responseText += `\n\n*(Character details, inventory, and your current quest are in the Game Info sidebar. You can explore the full **Lorebook** via the button there too!)*`;
      
      return { responseText, gameStateUpdate };
    } catch (error) {
      console.error('Error generating series details:', error);
      currentGameState = { 
        seriesSetupComplete: false,
        inventory: [],
        currentLocation: 'Not yet determined',
        activeQuests: [],
      };
      gameStateUpdate.seriesDetails = undefined;
      gameStateUpdate.inventory = [];
      gameStateUpdate.currentLocation = 'Not yet determined';
      gameStateUpdate.activeQuests = [];
      return { 
        responseText: 'I encountered an issue setting up that series. Please try a different series name or try again.',
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
