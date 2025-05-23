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
  memoryEntries?: Array<{
    content: string;
    timestamp: number;
    importance: number;
  }>;
}

export interface OtherCharacter {
  name: string;
  description: string;
}

// New relationship models
export const RelationshipTypeEnum = z.enum([
  'ally', 'enemy', 'family', 'friend', 'rival', 'mentor', 'student', 
  'lover', 'acquaintance', 'business', 'political', 'unknown'
]);
export type RelationshipType = z.infer<typeof RelationshipTypeEnum>;

export const RelationshipSchema = z.object({
  characterId: z.string().describe("Unique identifier for the related character"),
  characterName: z.string().describe("Name of the character in this relationship"),
  type: RelationshipTypeEnum.describe("Type of relationship between the characters"),
  intensity: z.number().min(1).max(10).describe("Strength of the relationship from 1 (weak) to 10 (strong)"),
  description: z.string().describe("Brief description of the relationship history and dynamics"),
  history: z.array(
    z.object({
      event: z.string().describe("A significant interaction or event between the characters"),
      impact: z.number().min(-5).max(5).describe("Impact on relationship: negative (-5 to -1), neutral (0), positive (1 to 5)"),
      timestamp: z.number().describe("When this event occurred (Unix timestamp)")
    })
  ).optional().describe("History of significant interactions that have shaped this relationship")
});
export type Relationship = z.infer<typeof RelationshipSchema>;

// Updated OtherCharacter schema with relationships
export const OtherCharacterSchema = z.object({
  id: z.string().describe("Unique identifier for this character"),
  name: z.string().describe("The full name of this character"),
  description: z.string().describe("A brief description of this character"),
  relationships: z.array(RelationshipSchema).optional().describe("This character's relationships with others"),
  firstEncountered: z.number().optional().describe("When the player first met this character (Unix timestamp)"),
  lastInteraction: z.number().optional().describe("When the player last interacted with this character (Unix timestamp)"),
  isPermanent: z.boolean().optional().describe("Whether this is a permanent character in the world").default(true),
  memoryEntries: z.array(
    z.object({
      content: z.string().describe("Memory content - what happened or what was learned"),
      timestamp: z.number().describe("When this memory was created (Unix timestamp)"),
      importance: z.number().min(1).max(10).describe("How important this memory is (1-10)")
    })
  ).optional().describe("Important memories related to this character")
});
export type EnhancedOtherCharacter = z.infer<typeof OtherCharacterSchema>;

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
  entries: z.array(LoreEntrySchema).min(5).max(100).describe("A rich collection of specific lore entries. Aim for 5-100 detailed entries in total, distributed across various relevant categories to provide a deep and immersive understanding of the series' universe.")
});
export type Lorebook = z.infer<typeof LorebookSchema>;


export interface SeriesDetails {
  seriesTitle: string;
  mainCharacter: MainCharacter;
  lorebook: Lorebook;
  otherCharacters: EnhancedOtherCharacter[]; // Updated to use enhanced characters
  initialPromptForPlayer: string;
  initialInventory?: string[];
  startingLocation?: string;
  initialQuest?: Quest; // This is the full Quest object after system processing
  relationships?: { [characterId: string]: Relationship[] }; // Map character IDs to their relationships
  worldMemory?: {
    globalEvents: Array<{
      content: string;
      timestamp: number;
      characters: string[]; // Character IDs involved
      location: string;
      importance: number;
    }>;
  };
}

export interface ClientGameState {
  seriesDetails?: SeriesDetails;
  inventory: string[];
  currentLocation: string;
  activeQuests: Quest[];
  userDisplayName?: string;
}

export interface ServerGameState {
  seriesSetupComplete: boolean;
  seriesDetails?: SeriesDetails;
  inventory: string[];
  currentLocation: string;
  activeQuests: Quest[];
  lastAccessed?: number; // Timestamp for tracking session age
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

