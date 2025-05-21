
'use server';

import type { Message, SeriesDetails, ProcessedPlayerInput, ClientGameStateUpdate, Quest } from '@/types';
import { generateSeriesDetails } from '@/ai/flows/generate-series-details';
import { summarizeAdventure } from '@/ai/flows/summarize-adventure';
// Placeholder for future dynamic quest generation
// import { generateQuest } from '@/ai/flows/generate-quest';

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
        currentGameState.activeQuests.push(seriesDetails.initialQuest as Quest);
      }
      
      gameStateUpdate.seriesDetails = seriesDetails; // Send full details for client state and lorebook page
      gameStateUpdate.inventory = currentGameState.inventory;
      gameStateUpdate.currentLocation = currentGameState.currentLocation;
      gameStateUpdate.activeQuests = currentGameState.activeQuests;

      // Refined initial response text
      let responseText = `The world of **${seriesDetails.seriesTitle}** materializes around you. You are **${seriesDetails.mainCharacter.name}**, and right now...\n\n`;
      responseText += `${seriesDetails.initialPromptForPlayer}`;
      responseText += `\n\n*(You can check your character's status, inventory, and current quest in the Game Info sidebar.)*`;
      
      return { responseText, gameStateUpdate };
    } catch (error) {
      console.error('Error generating series details:', error);
      currentGameState = { 
        seriesSetupComplete: false,
        inventory: [],
        currentLocation: 'Not yet determined',
        activeQuests: [],
      };
      // Clear seriesDetails from gameStateUpdate if error occurs
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
    // Story continuation logic
    try {
      // Simple summarization for now
      const recentHistory = chatHistory.slice(-5).map(m => `${m.sender === 'player' ? currentGameState.seriesDetails?.mainCharacter.name || 'Player' : 'Narrator'}: ${m.text}`).join('\n');
      const historyToSummarize = `Current Location: ${currentGameState.currentLocation}\nInventory: ${currentGameState.inventory.join(', ')}\nActive Quests: ${currentGameState.activeQuests.map(q => q.title).join(', ')}\n\nAs ${currentGameState.seriesDetails?.mainCharacter.name}, I said: "${playerInput}"\n\nRecent events:\n${recentHistory || "The adventure continues."}`;
      
      const combinedInputForAI = `Continue the story based on the player's input. Player input: "${playerInput}"\n\nGame Context:\nSeries: ${currentGameState.seriesDetails?.seriesTitle}\nPlayer is: ${currentGameState.seriesDetails?.mainCharacter.name}\n${historyToSummarize}\n\nNarrate the outcome of the player's action and describe the current situation. Be engaging and descriptive.`;
      
      // Using summarizeAdventure as a placeholder for a more advanced story continuation flow
      const response = await summarizeAdventure({ adventureHistory: combinedInputForAI }); 
      
      // This flow doesn't currently update game state like inventory, location, or quest status.
      // A more advanced flow would be needed with structured output for game state changes.
      // Example: if AI response implies quest objective completion, update quest status here.
      
      return { responseText: response.summary, gameStateUpdate };
    } catch (error) {
      console.error('Error in AI response:', error);
      return { responseText: `The threads of fate tangle... (AI response error). You said: "${playerInput}". Try rephrasing your action.` };
    }
  }
}
