import { z } from 'genkit';

export interface StoryEvent {
  description: string;
  timestamp: number;
  importance: number; // 1-10 scale
}

export interface CharacterRelationship {
  character1: string;
  character2: string;
  relationship: string; // e.g., "friends", "enemies", "mentor/student"
  notes: string;
}

export interface WorldState {
  location: string;
  timeOfDay: string;
  weather: string;
  recentEvents: string[];
  currentThemes: string[];
}

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
