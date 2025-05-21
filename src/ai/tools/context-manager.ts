'use server';

import { z } from 'genkit';
import { StoryEvent, CharacterRelationship, WorldState, retrieveContextSchema, updateContextSchema } from './context-manager-schemas';

/**
 * Context Manager Tool for maintaining narrative consistency
 * 
 * This tool helps the AI keep track of:
 * - Important story events
 * - Character relationships
 * - World state changes
 * - Narrative themes and tone
 */

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
