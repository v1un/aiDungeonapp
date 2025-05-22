
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
export type Quest = z.infer<typeof QuestSchema>;

export const LoreEntrySchema = z.object({
  name: z.string().describe("The name or title of the lore entry (e.g., a specific location, character, event, or concept)."),
  description: z.string().describe("A detailed description of this lore entry, potentially using markdown for emphasis. Aim for 2-4 sentences per entry."),
  category: z.string().describe("A general category for this lore entry (e.g., 'Locations', 'Key Characters & NPCs', 'Historical Events', 'Magic Systems & Unique Technologies', 'Factions & Organizations', 'Creatures & Races', 'Cultural Notes', 'Important Items & Artifacts').")
});
export type LoreEntry = z.infer<typeof LoreEntrySchema>;

export const LorebookSchema = z.object({
  overallSummary: z.string().describe("A 2-3 paragraph comprehensive summary of the series' world, its primary conflict, central themes, and significant historical context."),
  entries: z.array(LoreEntrySchema).min(25).max(50).describe("A rich collection of specific lore entries. Aim for 25-50 detailed entries in total, distributed across various relevant categories to provide a deep and immersive understanding of the series' universe.")
});
export type Lorebook = z.infer<typeof LorebookSchema>;


export interface SeriesDetails {
  seriesTitle: string;
  mainCharacter: MainCharacter;
  lorebook: Lorebook;
  otherCharacters: OtherCharacter[];
  initialPromptForPlayer: string;
  initialInventory?: string[];
  startingLocation?: string;
  initialQuest?: Quest; // This is the full Quest object after system processing
}

export interface ClientGameState {
  seriesDetails?: SeriesDetails;
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

// New type for managing multiple game sessions
export interface GameSession {
  id: string;
  name: string; // Typically the series title, or "New Game"
  lastPlayed: number; // Timestamp for sorting
  gameState: ClientGameState;
  messages: Message[];
}

    