
import { z } from 'zod';

export interface Message {
  id: string;
  sender: 'player' | 'ai';
  text: string;
  timestamp: number;
  image?: string; 
}

export interface CharacterStats {
  strength: string;
  dexterity: string;
  intelligence: string;
  magicPower?: string;
  luck?: string;
  specialAbility?: string;
}

export interface MainCharacter {
  name: string;
  description: string;
  stats: CharacterStats;
}

export interface OtherCharacter {
  name: string;
  description: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  rewards: string[];
  status: 'active' | 'completed' | 'failed';
}

export const QuestSchema = z.object({
  id: z.string().describe("A unique identifier for the quest."),
  title: z.string().describe('The title of the generated quest.'),
  description: z
    .string()
    .describe('A detailed description of the generated quest from the main character\'s perspective.'),
  objectives: z
    .array(z.string())
    .min(2).max(4)
    .describe('A list of 2-4 clear, actionable objectives for the quest.'),
  rewards: z
    .array(z.string())
    .min(1).max(3)
    .describe('A list of 1-3 thematic rewards for completing the quest (e.g., item, information, new contact).'),
  status: z.enum(['active', 'completed', 'failed']).describe("The current status of the quest.").default('active'),
});


export interface SeriesDetails {
  seriesTitle: string;
  mainCharacter: MainCharacter;
  lorebook: string; // This will be a more detailed, multi-paragraph summary
  otherCharacters: OtherCharacter[];
  initialPromptForPlayer: string;
  initialInventory?: string[];
  startingLocation?: string;
  initialQuest?: Quest; 
}

export interface ClientGameState {
  seriesDetails?: SeriesDetails; // Now holds the richer SeriesDetails
  inventory: string[];
  currentLocation: string;
  activeQuests: Quest[]; 
  userDisplayName?: string; 
}

export interface ClientGameStateUpdate {
  seriesDetails?: SeriesDetails; 
  inventory?: string[];
  currentLocation?: string;
  activeQuests?: Quest[]; 
}

export interface ProcessedPlayerInput {
  responseText: string;
  gameStateUpdate?: ClientGameStateUpdate;
}
