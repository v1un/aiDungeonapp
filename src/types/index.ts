
import { z } from 'zod';

export interface Message {
  id: string;
  sender: 'player' | 'ai';
  text: string;
  timestamp: number;
  image?: string; // Optional: for future image generation feature
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

// Zod schema for Quest, aligned with the Quest type
export const QuestSchema = z.object({
  id: z.string().describe("A unique identifier for the quest."),
  title: z.string().describe('The title of the generated quest.'),
  description: z
    .string()
    .describe('A detailed description of the generated quest.'),
  objectives: z
    .array(z.string())
    .describe('A list of objectives for the generated quest.'),
  rewards: z
    .array(z.string())
    .describe('A list of possible rewards for completing the quest.'),
  status: z.enum(['active', 'completed', 'failed']).describe("The current status of the quest.").default('active'),
});


export interface SeriesDetails {
  seriesTitle: string;
  mainCharacter: MainCharacter;
  lorebook: string;
  otherCharacters: OtherCharacter[];
  initialPromptForPlayer: string;
  initialInventory?: string[];
  startingLocation?: string;
  initialQuest?: Quest; // Uses the Quest interface
}

// For client-side state management in ChatWindow
export interface ClientGameState {
  seriesDetails?: SeriesDetails;
  inventory: string[];
  currentLocation: string;
  activeQuests: Quest[]; // Uses the Quest interface
  userDisplayName?: string; // Added for user-set display name
}

// For updates from server to client
export interface ClientGameStateUpdate {
  seriesDetails?: SeriesDetails; // Full details on initial load
  inventory?: string[];
  currentLocation?: string;
  activeQuests?: Quest[]; // Uses the Quest interface
}

export interface ProcessedPlayerInput {
  responseText: string;
  gameStateUpdate?: ClientGameStateUpdate;
}

