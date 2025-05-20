
'use server';

import type { Message, SeriesDetails, ProcessedPlayerInput, ClientGameStateUpdate } from '@/types';
import { generateSeriesDetails } from '@/ai/flows/generate-series-details';
import { summarizeAdventure } from '@/ai/flows/summarize-adventure';

interface ServerGameState {
  seriesSetupComplete: boolean;
  seriesDetails?: SeriesDetails;
  inventory: string[];
  currentLocation: string;
}

let currentGameState: ServerGameState = {
  seriesSetupComplete: false,
  inventory: [],
  currentLocation: 'Not yet determined',
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
      
      gameStateUpdate.seriesDetails = seriesDetails;
      gameStateUpdate.inventory = currentGameState.inventory;
      gameStateUpdate.currentLocation = currentGameState.currentLocation;

      let responseText = `## Series: ${seriesDetails.seriesTitle} ##\n\n`;
      responseText += `You are at: **${currentGameState.currentLocation}**\n\n`;
      responseText += `**Main Character: ${seriesDetails.mainCharacter.name}**\n${seriesDetails.mainCharacter.description}\n`;
      
      responseText += `**Stats:**\n`;
      const stats = seriesDetails.mainCharacter.stats;
      responseText += `  - Strength: ${stats.strength}\n`;
      responseText += `  - Dexterity: ${stats.dexterity}\n`;
      responseText += `  - Intelligence: ${stats.intelligence}\n`;
      if (stats.magicPower) responseText += `  - Magic Power: ${stats.magicPower}\n`;
      if (stats.luck) responseText += `  - Luck: ${stats.luck}\n`;
      if (stats.specialAbility) responseText += `  - Special Ability: ${stats.specialAbility}\n`;
      responseText += `\n`;

      responseText += `**Lorebook:**\n${seriesDetails.lorebook}\n\n`;
      responseText += `**Other Notable Characters:**\n`;
      seriesDetails.otherCharacters.forEach(char => {
        responseText += `- **${char.name}**: ${char.description}\n`;
      });
      responseText += `\n**Initial Inventory:**\n${currentGameState.inventory.map(item => `- ${item}`).join('\n')}\n`;
      responseText += `\n${seriesDetails.initialPromptForPlayer}`;
      
      return { responseText, gameStateUpdate };
    } catch (error) {
      console.error('Error generating series details:', error);
      currentGameState = { // Reset state
        seriesSetupComplete: false,
        inventory: [],
        currentLocation: 'Not yet determined',
      };
      return { responseText: 'I encountered an issue setting up that series. Please try a different series name or try again.' };
    }
  } else {
    // Placeholder for general story continuation.
    // Future: AI might respond with location changes, inventory updates, etc.
    // For now, we just pass the narrative text.
    try {
      const recentHistory = chatHistory.slice(-5).map(m => `${m.sender === 'player' ? 'Player' : 'Narrator'}: ${m.text}`).join('\n');
      const historyToSummarize = `Current Location: ${currentGameState.currentLocation}\nInventory: ${currentGameState.inventory.join(', ')}\n\n${recentHistory || "The adventure continues after series setup."}`;
      
      const combinedInputForAI = `Player action: "${playerInput}"\n\nContext:\n${currentGameState.seriesDetails?.seriesTitle ? `Series: ${currentGameState.seriesDetails.seriesTitle}\n` : ''}${currentGameState.seriesDetails?.mainCharacter.name ? `Playing as: ${currentGameState.seriesDetails.mainCharacter.name}\n` : ''}${historyToSummarize}`;
      
      const response = await summarizeAdventure({ adventureHistory: combinedInputForAI });
      // This flow doesn't currently update game state like inventory or location.
      // A more advanced flow would be needed.
      // For demonstration, if AI mentions "you pick up a shiny key", we could parse that.
      // Or have structured output from the AI.
      
      // Example: if AI says "You find a Rusty Sword and move to the Dark Cave"
      // We would parse this and update:
      // currentGameState.inventory.push("Rusty Sword");
      // currentGameState.currentLocation = "Dark Cave";
      // gameStateUpdate.inventory = currentGameState.inventory;
      // gameStateUpdate.currentLocation = currentGameState.currentLocation;

      return { responseText: `Following your action: "${playerInput}"\n\n${response.summary}`, gameStateUpdate };
    } catch (error) {
      console.error('Error in AI response:', error);
      return { responseText: `The threads of fate tangle... (AI response error). You said: "${playerInput}". Try rephrasing your action.` };
    }
  }
}
