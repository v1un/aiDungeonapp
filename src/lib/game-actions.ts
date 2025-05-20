// src/lib/game-actions.ts
'use server';

import type { Message } from '@/types';
import { generateSeriesDetails } from '@/ai/flows/generate-series-details';
import { summarizeAdventure } from '@/ai/flows/summarize-adventure';
// Note: A more suitable flow like 'continueStory' would be ideal for general interactions.
// Using summarizeAdventure is a temporary placeholder for generating some AI text.

interface GameState {
  seriesSetupComplete: boolean;
  // In a more complex system, this would hold character sheets, world state, etc.
  // For now, this is a simplified in-memory state for the server action's context.
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

      let responseText = `## Series: ${seriesDetails.seriesTitle} ##\n\n`;
      responseText += `**Main Character: ${seriesDetails.mainCharacter.name}**\n${seriesDetails.mainCharacter.description}\n\n`;
      responseText += `**Lorebook:**\n${seriesDetails.lorebook}\n\n`;
      responseText += `**Other Notable Characters:**\n`;
      seriesDetails.otherCharacters.forEach(char => {
        responseText += `- **${char.name}**: ${char.description}\n`;
      });
      responseText += `\n${seriesDetails.initialPromptForPlayer}`;
      
      return responseText;
    } catch (error) {
      console.error('Error generating series details:', error);
      return 'I encountered an issue setting up that series. Please try a different series name or try again.';
    }
  } else {
    // Placeholder for general story continuation.
    // Using summarizeAdventure to get *some* AI-generated text based on recent history.
    // This is not its intended use and ideally would be replaced by a dedicated story flow.
    try {
      const recentHistory = chatHistory.slice(-5).map(m => `${m.sender === 'player' ? 'Player' : 'Narrator'}: ${m.text}`).join('\n');
      const historyToSummarize = recentHistory || "The adventure continues after series setup.";
      
      // summarizeAdventure expects adventureHistory.
      // We'll use the player's input and a snippet of history.
      const combinedInputForAI = `Player action: "${playerInput}"\nRecent events: ${historyToSummarize}`;
      
      const response = await summarizeAdventure({ adventureHistory: combinedInputForAI });
      return response.summary; // This will be a summary, not a direct narrative continuation.
                                // A more fitting AI flow is needed for true dynamic storytelling.
    } catch (error) {
      console.error('Error in AI response:', error);
      return `The threads of fate tangle... (AI response error). You said: "${playerInput}". Try rephrasing your action.`;
    }
  }
}
