
// src/lib/game-actions.ts
'use server';

import type { Message } from '@/types';
import { generateSeriesDetails, type GenerateSeriesDetailsOutput } from '@/ai/flows/generate-series-details';
import { summarizeAdventure } from '@/ai/flows/summarize-adventure';
// Note: A more suitable flow like 'continueStory' would be ideal for general interactions.
// Using summarizeAdventure is a temporary placeholder for generating some AI text.

interface GameState {
  seriesSetupComplete: boolean;
  seriesDetails?: GenerateSeriesDetailsOutput; // Store details for potential future use
}

// This state is per-server-instance and will reset on server restart or with multiple instances.
// A proper database or persistent store is needed for a real game.
let currentGameState: GameState = {
  seriesSetupComplete: false,
};

export async function processPlayerInput(playerInput: string, chatHistory: Message[]): Promise<string> {
  if (!currentGameState.seriesSetupComplete) {
    if (!playerInput.trim()) {
        return "Please provide the name of a fictional series to begin.";
    }
    try {
      const seriesDetails = await generateSeriesDetails({ seriesName: playerInput });
      currentGameState.seriesSetupComplete = true;
      currentGameState.seriesDetails = seriesDetails; // Save for context

      let responseText = `## Series: ${seriesDetails.seriesTitle} ##\n\n`;
      responseText += `**Main Character: ${seriesDetails.mainCharacter.name}**\n${seriesDetails.mainCharacter.description}\n`;
      
      // Add stats display
      responseText += `**Stats:**\n`;
      responseText += `  - Strength: ${seriesDetails.mainCharacter.stats.strength}\n`;
      responseText += `  - Dexterity: ${seriesDetails.mainCharacter.stats.dexterity}\n`;
      responseText += `  - Intelligence: ${seriesDetails.mainCharacter.stats.intelligence}\n`;
      if (seriesDetails.mainCharacter.stats.magicPower) {
        responseText += `  - Magic Power: ${seriesDetails.mainCharacter.stats.magicPower}\n`;
      }
      if (seriesDetails.mainCharacter.stats.luck) {
        responseText += `  - Luck: ${seriesDetails.mainCharacter.stats.luck}\n`;
      }
      if (seriesDetails.mainCharacter.stats.specialAbility) {
        responseText += `  - Special Ability: ${seriesDetails.mainCharacter.stats.specialAbility}\n`;
      }
      responseText += `\n`; // Extra newline for spacing

      responseText += `**Lorebook:**\n${seriesDetails.lorebook}\n\n`;
      responseText += `**Other Notable Characters:**\n`;
      seriesDetails.otherCharacters.forEach(char => {
        responseText += `- **${char.name}**: ${char.description}\n`;
      });
      responseText += `\n${seriesDetails.initialPromptForPlayer}`;
      
      return responseText;
    } catch (error) {
      console.error('Error generating series details:', error);
      // Reset state if series setup fails
      currentGameState.seriesSetupComplete = false;
      currentGameState.seriesDetails = undefined;
      return 'I encountered an issue setting up that series. Please try a different series name or try again.';
    }
  } else {
    // Placeholder for general story continuation.
    try {
      const recentHistory = chatHistory.slice(-5).map(m => `${m.sender === 'player' ? 'Player' : 'Narrator'}: ${m.text}`).join('\n');
      const historyToSummarize = recentHistory || "The adventure continues after series setup.";
      
      const combinedInputForAI = `Player action: "${playerInput}"\nRecent events: ${historyToSummarize}\nSeries context: ${currentGameState.seriesDetails?.seriesTitle || 'Unknown Series'}`;
      
      const response = await summarizeAdventure({ adventureHistory: combinedInputForAI });
      // This will be a summary, not a direct narrative continuation.
      // A more fitting AI flow is needed for true dynamic storytelling.
      return `Following your action: "${playerInput}"\n\n${response.summary}`;
    } catch (error) {
      console.error('Error in AI response:', error);
      return `The threads of fate tangle... (AI response error). You said: "${playerInput}". Try rephrasing your action.`;
    }
  }
}
