
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
      currentGameState.inventory = seriesDetails.initialInventory || ['Your Pockets (empty)'];
      currentGameState.currentLocation = seriesDetails.startingLocation || 'An Unknown Place';
      currentGameState.activeQuests = [];
      if (seriesDetails.initialQuest) {
        // The generateSeriesDetails flow already adds an ID and status
        currentGameState.activeQuests.push(seriesDetails.initialQuest as Quest);
      }
      
      gameStateUpdate.seriesDetails = seriesDetails;
      gameStateUpdate.inventory = currentGameState.inventory;
      gameStateUpdate.currentLocation = currentGameState.currentLocation;
      gameStateUpdate.activeQuests = currentGameState.activeQuests;

      let responseText = `## Series: ${seriesDetails.seriesTitle} ##\n\n`;
      responseText += `You are at: **${currentGameState.currentLocation}**\n\n`;
      responseText += `**Playing as: ${seriesDetails.mainCharacter.name}**\n${seriesDetails.mainCharacter.description}\n`;
      
      responseText += `**Stats:**\n`;
      const stats = seriesDetails.mainCharacter.stats;
      responseText += `  - Strength: ${stats.strength}\n`;
      responseText += `  - Dexterity: ${stats.dexterity}\n`;
      responseText += `  - Intelligence: ${stats.intelligence}\n`;
      if (stats.magicPower) responseText += `  - Magic Power: ${stats.magicPower}\n`;
      if (stats.luck) responseText += `  - Luck: ${stats.luck}\n`;
      if (stats.specialAbility) responseText += `  - Special Ability: ${stats.specialAbility}\n`;
      responseText += `\n`;

      if (currentGameState.activeQuests.length > 0) {
        const mainQuest = currentGameState.activeQuests[0];
        responseText += `**Current Main Quest: ${mainQuest.title}**\n`;
        responseText += `${mainQuest.description}\n`;
        responseText += `Objectives:\n${mainQuest.objectives.map(obj => `- ${obj}`).join('\n')}\n\n`;
      }

      responseText += `**Lorebook Snippet:**\n${seriesDetails.lorebook.substring(0, 300)}...\n\n`; // Keep initial message shorter
      // responseText += `**Other Notable Characters:**\n`;
      // seriesDetails.otherCharacters.forEach(char => {
      //   responseText += `- **${char.name}**: ${char.description}\n`;
      // });
      // responseText += `\n**Initial Inventory:**\n${currentGameState.inventory.map(item => `- ${item}`).join('\n')}\n`;
      responseText += `\n${seriesDetails.initialPromptForPlayer}`;
      
      return { responseText, gameStateUpdate };
    } catch (error) {
      console.error('Error generating series details:', error);
      currentGameState = { // Reset state
        seriesSetupComplete: false,
        inventory: [],
        currentLocation: 'Not yet determined',
        activeQuests: [],
      };
      return { responseText: 'I encountered an issue setting up that series. Please try a different series name or try again.' };
    }
  } else {
    // Story continuation logic
    try {
      // Simple summarization for now
      const recentHistory = chatHistory.slice(-5).map(m => `${m.sender === 'player' ? currentGameState.seriesDetails?.mainCharacter.name || 'Player' : 'Narrator'}: ${m.text}`).join('\n');
      const historyToSummarize = `Current Location: ${currentGameState.currentLocation}\nInventory: ${currentGameState.inventory.join(', ')}\nActive Quests: ${currentGameState.activeQuests.map(q => q.title).join(', ')}\n\n${recentHistory || "The adventure continues."}`;
      
      const combinedInputForAI = `Player input: "${playerInput}"\n\nContext:\nSeries: ${currentGameState.seriesDetails?.seriesTitle}\nPlaying as: ${currentGameState.seriesDetails?.mainCharacter.name}\n${historyToSummarize}`;
      
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
