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

export interface SeriesDetails {
  seriesTitle: string;
  mainCharacter: MainCharacter;
  lorebook: string;
  otherCharacters: OtherCharacter[];
  initialPromptForPlayer: string;
  initialInventory?: string[];
  startingLocation?: string;
}

// For client-side state management in ChatWindow
export interface ClientGameState {
  seriesDetails?: SeriesDetails;
  inventory: string[];
  currentLocation: string;
}

// For updates from server to client
export interface ClientGameStateUpdate {
  seriesDetails?: SeriesDetails; // Full details on initial load
  inventory?: string[];
  currentLocation?: string;
  // Add other specific updates as needed, e.g., new single item, stat change
}

export interface ProcessedPlayerInput {
  responseText: string;
  gameStateUpdate?: ClientGameStateUpdate;
}
