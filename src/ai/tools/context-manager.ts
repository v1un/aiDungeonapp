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

// Using Map to store context per session ID
const sessionStoryEvents = new Map<string, StoryEvent[]>();
const sessionCharacterRelationships = new Map<string, CharacterRelationship[]>();
const sessionWorldStates = new Map<string, WorldState>();

// Helper to get the current session ID 
const getCurrentSessionId = (): string => {
  // Use a default session ID if none is set
  // Access the currentSessionId from the lore-tools module
  const sessionId = (global as {currentSessionId?: string}).currentSessionId || 'default-session';
  return sessionId;
};

// Helper functions to get session-specific data
const getStoryEvents = (): StoryEvent[] => {
  const sessionId = getCurrentSessionId();
  if (!sessionStoryEvents.has(sessionId)) {
    sessionStoryEvents.set(sessionId, []);
  }
  return sessionStoryEvents.get(sessionId)!;
};

const getCharacterRelationships = (): CharacterRelationship[] => {
  const sessionId = getCurrentSessionId();
  if (!sessionCharacterRelationships.has(sessionId)) {
    sessionCharacterRelationships.set(sessionId, []);
  }
  return sessionCharacterRelationships.get(sessionId)!;
};

const getWorldState = (): WorldState => {
  const sessionId = getCurrentSessionId();
  if (!sessionWorldStates.has(sessionId)) {
    sessionWorldStates.set(sessionId, {
      location: '',
      timeOfDay: '',
      weather: '',
      recentEvents: [],
      currentThemes: []
    });
  }
  return sessionWorldStates.get(sessionId)!;
};

// Function to retrieve context
export async function retrieveContext(input: z.infer<typeof retrieveContextSchema>) {
  const { contextType, relevantCharacters, timeframe } = input;
  
  const result: {
    events?: StoryEvent[],
    relationships?: CharacterRelationship[],
    worldState?: WorldState,
    context?: Record<string, unknown>
  } = {};
  
  if (contextType === 'events' || contextType === 'all') {
    let events = [...getStoryEvents()];
    if (timeframe === 'recent') {
      // Only keep the 5 most recent events and any important events (>7 importance)
      events = events
        .sort((a, b) => b.timestamp - a.timestamp)
        .filter((event, index) => index < 5 || event.importance > 7);
    }
    result.events = events;
  }
  
  if (contextType === 'relationships' || contextType === 'all') {
    let relationships = [...getCharacterRelationships()];
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
    result.worldState = getWorldState();
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
    getStoryEvents().push(newEvent);
    return { success: true, message: 'Story event added' };
  }
  
  if (updateType === 'relationship' && input.relationship) {
    const { character1, character2, relationship, notes } = input.relationship;
    
    // Check if this relationship already exists
    const existingIndex = getCharacterRelationships().findIndex(
      r => (r.character1 === character1 && r.character2 === character2) ||
           (r.character1 === character2 && r.character2 === character1)
    );
    
    if (existingIndex >= 0) {
      // Update existing relationship
      getCharacterRelationships()[existingIndex] = { character1, character2, relationship, notes };
      return { success: true, message: 'Character relationship updated' };
    } else {
      // Add new relationship
      getCharacterRelationships().push({ character1, character2, relationship, notes });
      return { success: true, message: 'Character relationship added' };
    }
  }
  
  if (updateType === 'worldState' && input.worldState) {
    const { location, timeOfDay, weather, eventToAdd, themeToAdd } = input.worldState;
    
    const worldState = getWorldState();
    
    if (location) worldState.location = location;
    if (timeOfDay) worldState.timeOfDay = timeOfDay;
    if (weather) worldState.weather = weather;
    
    if (eventToAdd) {
      // Keep only the 10 most recent events
      worldState.recentEvents.unshift(eventToAdd);
      if (worldState.recentEvents.length > 10) {
        worldState.recentEvents.pop();
      }
    }
    
    if (themeToAdd && !worldState.currentThemes.includes(themeToAdd)) {
      // Keep only the 5 most recent themes
      worldState.currentThemes.unshift(themeToAdd);
      if (worldState.currentThemes.length > 5) {
        worldState.currentThemes.pop();
      }
    }
    
    return { success: true, message: 'World state updated' };
  }
  
  return { success: false, message: 'Invalid update request' };
}
