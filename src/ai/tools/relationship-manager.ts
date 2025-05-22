'use server';
/**
 * @fileOverview Tools for managing character relationships and memories
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { getCurrentGameState } from '@/lib/game-actions';
import { RelationshipSchema, RelationshipType } from '@/types';

// Schema for updating a relationship between characters
const UpdateRelationshipInputSchema = z.object({
  characterId1: z.string().describe("ID of the first character in the relationship"),
  characterId2: z.string().describe("ID of the second character in the relationship"),
  type: z.string().describe("Type of relationship (e.g. ally, enemy, family, friend, rival)"),
  intensity: z.number().min(1).max(10).describe("Strength of the relationship from 1 (weak) to 10 (strong)"),
  description: z.string().describe("Brief description of the current relationship status"),
  eventDescription: z.string().optional().describe("Description of the event that triggered this relationship change"),
  eventImpact: z.number().min(-5).max(5).optional().describe("Impact of event: negative (-5 to -1), neutral (0), positive (1 to 5)")
});
type UpdateRelationshipInput = z.infer<typeof UpdateRelationshipInputSchema>;

const UpdateRelationshipOutputSchema = z.object({
  success: z.boolean().describe("Whether the relationship was successfully updated"),
  message: z.string().describe("A message describing the result of the operation"),
  previousRelationship: RelationshipSchema.optional().describe("The previous relationship state if it existed"),
  currentRelationship: RelationshipSchema.optional().describe("The current relationship state after update")
});
type UpdateRelationshipOutput = z.infer<typeof UpdateRelationshipOutputSchema>;

// Implementation for updating relationships
async function updateRelationshipImplementation(input: UpdateRelationshipInput): Promise<UpdateRelationshipOutput> {
  const gameState = await getCurrentGameState();
  if (!gameState || !gameState.seriesDetails) {
    return { success: false, message: "No active game session found." };
  }

  // Initialize relationships if they don't exist
  if (!gameState.seriesDetails.relationships) {
    gameState.seriesDetails.relationships = {};
  }

  // Get current relationships for character 1
  const relationships1 = gameState.seriesDetails.relationships[input.characterId1] || [];
  
  // Check if relationship already exists
  let existingRelationship = relationships1.find(r => r.characterId === input.characterId2);
  const previousRelationship = existingRelationship ? { ...existingRelationship } : undefined;
  
  // Create event data if provided
  const newEvent = input.eventDescription ? {
    event: input.eventDescription,
    impact: input.eventImpact || 0,
    timestamp: Date.now()
  } : undefined;

  if (existingRelationship) {
    // Update existing relationship
    existingRelationship.type = input.type as RelationshipType;
    existingRelationship.intensity = input.intensity;
    existingRelationship.description = input.description;
    
    // Add new event to history if provided
    if (newEvent) {
      if (!existingRelationship.history) {
        existingRelationship.history = [];
      }
      existingRelationship.history.push(newEvent);
    }

    return {
      success: true,
      message: `Updated relationship between ${input.characterId1} and ${input.characterId2}`,
      previousRelationship,
      currentRelationship: { ...existingRelationship }
    };
  } else {
    // Create new relationship
    const newRelationship = {
      characterId: input.characterId2,
      characterName: findCharacterName(gameState, input.characterId2),
      type: input.type as RelationshipType,
      intensity: input.intensity,
      description: input.description,
      history: newEvent ? [newEvent] : []
    };

    // Add relationship to character 1's relationships
    relationships1.push(newRelationship);
    gameState.seriesDetails.relationships[input.characterId1] = relationships1;
    
    // Create the reverse relationship for character 2
    if (!gameState.seriesDetails.relationships[input.characterId2]) {
      gameState.seriesDetails.relationships[input.characterId2] = [];
    }
    
    const reverseRelationship = {
      characterId: input.characterId1,
      characterName: findCharacterName(gameState, input.characterId1),
      type: input.type as RelationshipType,
      intensity: input.intensity,
      description: input.description,
      history: newEvent ? [newEvent] : []
    };
    
    gameState.seriesDetails.relationships[input.characterId2].push(reverseRelationship);

    return {
      success: true,
      message: `Created new relationship between ${input.characterId1} and ${input.characterId2}`,
      currentRelationship: newRelationship
    };
  }
}

// Helper function to find a character's name from their ID
function findCharacterName(gameState: any, characterId: string): string {
  // Check if it's the main character
  if (characterId === 'main') {
    return gameState.seriesDetails.mainCharacter.name;
  }
  
  // Check other characters
  const character = gameState.seriesDetails.otherCharacters.find((c: any) => c.id === characterId);
  return character ? character.name : "Unknown Character";
}

// Schema for adding a memory to a character
const AddCharacterMemoryInputSchema = z.object({
  characterId: z.string().describe("ID of the character to add the memory to"),
  content: z.string().describe("The memory content - what happened or what was learned"),
  importance: z.number().min(1).max(10).describe("How important this memory is (1-10)")
});
type AddCharacterMemoryInput = z.infer<typeof AddCharacterMemoryInputSchema>;

const AddCharacterMemoryOutputSchema = z.object({
  success: z.boolean().describe("Whether the memory was successfully added"),
  message: z.string().describe("A message describing the result of the operation")
});
type AddCharacterMemoryOutput = z.infer<typeof AddCharacterMemoryOutputSchema>;

// Implementation for adding character memories
async function addCharacterMemoryImplementation(input: AddCharacterMemoryInput): Promise<AddCharacterMemoryOutput> {
  const gameState = await getCurrentGameState();
  if (!gameState || !gameState.seriesDetails) {
    return { success: false, message: "No active game session found." };
  }

  // Find the character
  let character;
  if (input.characterId === 'main') {
    // Special handling for main character memories
    if (!gameState.seriesDetails.mainCharacter.memoryEntries) {
      gameState.seriesDetails.mainCharacter.memoryEntries = [];
    }
    gameState.seriesDetails.mainCharacter.memoryEntries.push({
      content: input.content,
      timestamp: Date.now(),
      importance: input.importance
    });
    return { success: true, message: "Memory added to main character" };
  } else {
    // Find other character
    character = gameState.seriesDetails.otherCharacters.find((c: any) => c.id === input.characterId);
    if (!character) {
      return { success: false, message: `Character with ID ${input.characterId} not found` };
    }
    
    // Initialize memory entries if they don't exist
    if (!character.memoryEntries) {
      character.memoryEntries = [];
    }
    
    // Add the new memory
    character.memoryEntries.push({
      content: input.content,
      timestamp: Date.now(),
      importance: input.importance
    });
    
    return { success: true, message: `Memory added to ${character.name}` };
  }
}

// Schema for retrieving character memories
const RetrieveCharacterMemoriesInputSchema = z.object({
  characterId: z.string().describe("ID of the character to retrieve memories for"),
  relatedToCharacterId: z.string().optional().describe("Optional. Retrieve only memories related to this specific character"),
  minimumImportance: z.number().min(1).max(10).optional().describe("Optional. Minimum importance level (1-10) to filter memories"),
  limit: z.number().optional().describe("Optional. Maximum number of memories to retrieve")
});
type RetrieveCharacterMemoriesInput = z.infer<typeof RetrieveCharacterMemoriesInputSchema>;

const RetrieveCharacterMemoriesOutputSchema = z.object({
  success: z.boolean().describe("Whether memories were successfully retrieved"),
  characterName: z.string().describe("Name of the character whose memories were retrieved"),
  memories: z.array(z.object({
    content: z.string(),
    timestamp: z.number(),
    importance: z.number(),
    relativeTime: z.string().describe("Human-readable relative time (e.g., '2 days ago')")
  })).describe("List of memories retrieved"),
  message: z.string().describe("Additional information about the memory retrieval")
});
type RetrieveCharacterMemoriesOutput = z.infer<typeof RetrieveCharacterMemoriesOutputSchema>;

// Implementation for retrieving character memories
async function retrieveCharacterMemoriesImplementation(
  input: RetrieveCharacterMemoriesInput
): Promise<RetrieveCharacterMemoriesOutput> {
  const gameState = await getCurrentGameState();
  if (!gameState || !gameState.seriesDetails) {
    return { 
      success: false, 
      characterName: "Unknown",
      memories: [],
      message: "No active game session found."
    };
  }

  let memories = [];
  let characterName = "Unknown";

  // Get memories based on character ID
  if (input.characterId === 'main') {
    characterName = gameState.seriesDetails.mainCharacter.name;
    memories = gameState.seriesDetails.mainCharacter.memoryEntries || [];
  } else {
    const character = gameState.seriesDetails.otherCharacters.find((c: any) => c.id === input.characterId);
    if (!character) {
      return {
        success: false,
        characterName: "Unknown Character",
        memories: [],
        message: `Character with ID ${input.characterId} not found`
      };
    }
    
    characterName = character.name;
    memories = character.memoryEntries || [];
  }

  // Apply filters
  let filteredMemories = [...memories];
  
  // Filter by minimum importance if specified
  if (typeof input.minimumImportance === 'number') {
    const minImportance = input.minimumImportance;
    filteredMemories = filteredMemories.filter(m => m.importance >= minImportance);
  }
  
  // Filter by related character if specified
  if (input.relatedToCharacterId) {
    const relatedName = findCharacterName(gameState, input.relatedToCharacterId).toLowerCase();
    filteredMemories = filteredMemories.filter(m => 
      m.content.toLowerCase().includes(relatedName)
    );
  }
  
  // Sort by importance (highest first) and then by timestamp (newest first)
  filteredMemories.sort((a, b) => {
    if (a.importance !== b.importance) return b.importance - a.importance;
    return b.timestamp - a.timestamp;
  });
  
  // Limit results if specified
  if (input.limit && input.limit > 0) {
    filteredMemories = filteredMemories.slice(0, input.limit);
  }
  
  // Add relative time for each memory
  const enhancedMemories = filteredMemories.map(memory => ({
    ...memory,
    relativeTime: getRelativeTimeString(memory.timestamp)
  }));
  
  return {
    success: true,
    characterName,
    memories: enhancedMemories,
    message: `Retrieved ${enhancedMemories.length} memories for ${characterName}`
  };
}

// Helper function to convert timestamp to relative time string
function getRelativeTimeString(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}

// Export the tools
export const updateRelationshipTool = ai.defineTool(
  {
    name: "updateRelationshipTool",
    description: "Updates or creates a relationship between two characters, tracking their interactions and relationship dynamics.",
    inputSchema: UpdateRelationshipInputSchema,
    outputSchema: UpdateRelationshipOutputSchema
  },
  updateRelationshipImplementation
);

export const addCharacterMemoryTool = ai.defineTool(
  {
    name: "addCharacterMemoryTool",
    description: "Adds a new memory to a character's memory store, recording significant events or information the character has experienced or learned.",
    inputSchema: AddCharacterMemoryInputSchema,
    outputSchema: AddCharacterMemoryOutputSchema
  },
  addCharacterMemoryImplementation
);

export const retrieveCharacterMemoriesTool = ai.defineTool(
  {
    name: "retrieveCharacterMemoriesTool",
    description: "Retrieves memories for a specific character, with optional filtering by importance or related character.",
    inputSchema: RetrieveCharacterMemoriesInputSchema,
    outputSchema: RetrieveCharacterMemoriesOutputSchema
  },
  retrieveCharacterMemoriesImplementation
);
