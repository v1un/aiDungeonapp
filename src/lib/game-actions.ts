// src/lib/game-actions.ts
'use server';

import type { Message } from '@/types';
import { generateCharacter } from '@/ai/flows/generate-character';
import { summarizeAdventure } from '@/ai/flows/summarize-adventure';
// Note: A more suitable flow like 'continueStory' would be ideal for general interactions.
// Using summarizeAdventure is a temporary placeholder for generating some AI text.

interface GameState {
  characterGenerated: boolean;
  // In a more complex system, this would hold character sheets, world state, etc.
  // For now, this is a simplified in-memory state for the server action's context.
}

// This state is per-server-instance and will reset on server restart or with multiple instances.
// A proper database or persistent store is needed for a real game.
let currentGameState: GameState = {
  characterGenerated: false,
};

export async function processPlayerInput(playerInput: string, chatHistory: Message[]): Promise<string> {
  if (!currentGameState.characterGenerated) {
    if (!playerInput.trim()) {
        return "Please provide a concept for your character to begin."
    }
    try {
      const character = await generateCharacter({ characterConcept: playerInput });
      currentGameState.characterGenerated = true; 
      return `Character Created:
Name: ${character.name}
Backstory: ${character.backstory}
Strength: ${character.stats.strength}, Dexterity: ${character.stats.dexterity}, Constitution: ${character.stats.constitution}, Intelligence: ${character.stats.intelligence}, Wisdom: ${character.stats.wisdom}, Charisma: ${character.stats.charisma}
Skills: ${character.skills.join(', ')}

The mists of Aethelgard part before you. What is your first action in this new world?`;
    } catch (error) {
      console.error('Error generating character:', error);
      return 'I encountered an issue creating your character. Please try describing your concept again.';
    }
  } else {
    // Placeholder for general story continuation.
    // Using summarizeAdventure to get *some* AI-generated text based on recent history.
    // This is not its intended use and ideally would be replaced by a dedicated story flow.
    try {
      const recentHistory = chatHistory.slice(-5).map(m => `${m.sender === 'player' ? 'Player' : 'Narrator'}: ${m.text}`).join('\n');
      const historyToSummarize = recentHistory || "The adventure continues after character creation.";
      
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
