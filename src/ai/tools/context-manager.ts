'use server';

import { z } from 'genkit';
import { ai } from '@/ai/genkit';

/**
 * Context Manager Tool for maintaining narrative consistency
 * 
 * This tool helps the AI keep track of:
 * - Important story events
 * - Character relationships
 * - World state changes
 * - Narrative themes and tone
 */

interface StoryEvent {
  description: string;
  timestamp: number;
  importance: number; // 1-10 scale
}

interface CharacterRelationship {
  character1: string;
  character2: string;
  relationship: string; // e.g., "friends", "enemies", "mentor/student"
  notes: string;
}

interface WorldState {
  location: string;
  timeOfDay: string;
  weather: string;
  recentEvents: string[];
  currentThemes: string[];
}

// In-memory storage that persists through the server lifetime
// In a production app, this would be stored in a database
let storyEvents: StoryEvent[] = [];
let characterRelationships: CharacterRelationship[] = [];
let currentWorldState: WorldState = {
  location: '',
  timeOfDay: '',
  weather: '',
  recentEvents: [],
  currentThemes: []
};

// Tool schema for retrieving context
export const retrieveContextSchema = z.object({
  contextType: z.enum(['events', 'relationships', 'worldState', 'all']).describe(
    'Type of context to retrieve: story events, character relationships, world state, or all'
  ),
  relevantCharacters: z.array(z.string()).optional().describe(
    'Optional list of character names to filter relationships'
  ),
  timeframe: z.enum(['recent', 'all']).optional().default('recent').describe(
    'Whether to return only recent events or all tracked events'
  )
});

// Tool schema for updating context
export const updateContextSchema = z.object({
  updateType: z.enum(['event', 'relationship', 'worldState']).describe(
    'Type of context to update: add a story event, update a character relationship, or update world state'
  ),
  event: z.object({
    description: z.string().describe('Description of the story event'),
    importance: z.number().min(1).max(10).describe('Importance on a scale of 1-10')
  }).optional().describe('Story event to add (required if updateType is "event")'),
  relationship: z.object({
    character1: z.string().describe('First character in the relationship'),
    character2: z.string().describe('Second character in the relationship'),
    relationship: z.string().describe('Description of their relationship'),
    notes: z.string().describe('Additional notes about the relationship')
  }).optional().describe('Character relationship to update (required if updateType is "relationship")'),
  worldState: z.object({
    location: z.string().optional().describe('Current location'),
    timeOfDay: z.string().optional().describe('Current time of day'),
    weather: z.string().optional().describe('Current weather'),
    eventToAdd: z.string().optional().describe('New event to add to recent events'),
    themeToAdd: z.string().optional().describe('New theme to add to current themes')
  }).optional().describe('World state to update (required if updateType is "worldState")')
});

// Function to retrieve context
export async function retrieveContext(input: z.infer<typeof retrieveContextSchema>) {
  const { contextType, relevantCharacters, timeframe } = input;
  
  let result: any = {};
  
  if (contextType === 'events' || contextType === 'all') {
    let events = [...storyEvents];
    if (timeframe === 'recent') {
      // Only keep the 5 most recent events and any important events (>7 importance)
      events = events
        .sort((a, b) => b.timestamp - a.timestamp)
        .filter((event, index) => index < 5 || event.importance > 7);
    }
    result.events = events;
  }
  
  if (contextType === 'relationships' || contextType === 'all') {
    let relationships = [...characterRelationships];
    if (relevantCharacters && relevantCharacters.length > 0) {
      // Filter relationships to only include the specified characters
      relationships = relationships.filter(rel => 
        relevantCharacters.includes(rel.character1) || 
        relevantCharacters.includes(rel.character2)
      );
    }
    result.relationships = relationships;
  }
  
  if (contextType === 'worldState' || contextType === 'all') {
    result.worldState = currentWorldState;
  }
  
  return result;
}

// Function to update context
export async function updateContext(input: z.infer<typeof updateContextSchema>) {
  const { updateType } = input;
  
  if (updateType === 'event' && input.event) {
    const newEvent: StoryEvent = {
      description: input.event.description,
      importance: input.event.importance,
      timestamp: Date.now()
    };
    storyEvents.push(newEvent);
    return { success: true, message: 'Story event added' };
  }
  
  if (updateType === 'relationship' && input.relationship) {
    const { character1, character2, relationship, notes } = input.relationship;
    
    // Check if this relationship already exists
    const existingIndex = characterRelationships.findIndex(
      r => (r.character1 === character1 && r.character2 === character2) ||
           (r.character1 === character2 && r.character2 === character1)
    );
    
    if (existingIndex >= 0) {
      // Update existing relationship
      characterRelationships[existingIndex] = { character1, character2, relationship, notes };
      return { success: true, message: 'Character relationship updated' };
    } else {
      // Add new relationship
      characterRelationships.push({ character1, character2, relationship, notes });
      return { success: true, message: 'Character relationship added' };
    }
  }
  
  if (updateType === 'worldState' && input.worldState) {
    const { location, timeOfDay, weather, eventToAdd, themeToAdd } = input.worldState;
    
    if (location) currentWorldState.location = location;
    if (timeOfDay) currentWorldState.timeOfDay = timeOfDay;
    if (weather) currentWorldState.weather = weather;
    
    if (eventToAdd) {
      // Keep only the 10 most recent events
      currentWorldState.recentEvents.unshift(eventToAdd);
      if (currentWorldState.recentEvents.length > 10) {
        currentWorldState.recentEvents.pop();
      }
    }
    
    if (themeToAdd && !currentWorldState.currentThemes.includes(themeToAdd)) {
      // Keep only the 5 most recent themes
      currentWorldState.currentThemes.unshift(themeToAdd);
      if (currentWorldState.currentThemes.length > 5) {
        currentWorldState.currentThemes.pop();
      }
    }
    
    return { success: true, message: 'World state updated' };
  }
  
  return { success: false, message: 'Invalid update request' };
}

// Define the tools for the AI to use
export const retrieveContextTool = ai.defineTool(
  {
    name: "retrieveContext",
    description: "Retrieve story context to maintain narrative consistency",
    inputSchema: retrieveContextSchema,
    outputSchema: z.any(),
  },
  retrieveContext
);

export const updateContextTool = ai.defineTool(
  {
    name: "updateContext",
    description: "Update story context with new events, relationships, or world state changes",
    inputSchema: updateContextSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string()
    }),
  },
  updateContext
);
