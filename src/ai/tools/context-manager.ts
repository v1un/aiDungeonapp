'use server';

import { z } from '@/ai/genkit';
import { StoryEvent, CharacterRelationship, WorldState, retrieveContextSchema, updateContextSchema } from './context-manager-schemas';

/**
 * Context Manager Tool for maintaining narrative consistency
 * 
 * This tool helps the AI keep track of:
 * - Important story events
 * - Character relationships
 * - World state changes
 * - Narrative themes and tone
 * 
 * It includes session management to prevent memory leaks and provides
 * persistence capabilities for long-term storage.
 */

// Session metadata to track last access time
interface SessionMetadata {
  lastAccessed: number;
  created: number;
}

// Using Map to store context per session ID
const sessionStoryEvents = new Map<string, StoryEvent[]>();
const sessionCharacterRelationships = new Map<string, CharacterRelationship[]>();
const sessionWorldStates = new Map<string, WorldState>();
const sessionMetadata = new Map<string, SessionMetadata>();

// Configuration for session cleanup
const SESSION_CONFIG = {
  // Time after which inactive sessions are cleaned up (4 hours)
  INACTIVE_TIMEOUT_MS: 4 * 60 * 60 * 1000,
  // Maximum number of sessions to keep in memory
  MAX_SESSIONS: 1000,
  // How often to run cleanup (every 30 minutes)
  CLEANUP_INTERVAL_MS: 30 * 60 * 1000
};

/**
 * Updates the last accessed timestamp for a session
 * @param sessionId The session ID to update
 */
const touchSession = (sessionId: string): void => {
  if (!sessionMetadata.has(sessionId)) {
    sessionMetadata.set(sessionId, {
      lastAccessed: Date.now(),
      created: Date.now()
    });
  } else {
    const metadata = sessionMetadata.get(sessionId)!;
    metadata.lastAccessed = Date.now();
  }
};

/**
 * Cleans up inactive sessions to prevent memory leaks
 * This is called periodically and when the number of sessions exceeds the maximum
 */
const cleanupInactiveSessions = (): void => {
  console.log(`Running session cleanup. Current sessions: ${sessionMetadata.size}`);
  const now = Date.now();
  const sessionsToRemove: string[] = [];

  // Identify sessions that have been inactive for too long
  sessionMetadata.forEach((metadata, sessionId) => {
    const inactiveTime = now - metadata.lastAccessed;
    if (inactiveTime > SESSION_CONFIG.INACTIVE_TIMEOUT_MS) {
      sessionsToRemove.push(sessionId);
    }
  });

  // If we still have too many sessions, remove the oldest ones
  if (sessionMetadata.size - sessionsToRemove.length > SESSION_CONFIG.MAX_SESSIONS) {
    // Sort sessions by last accessed time (oldest first)
    const sortedSessions = Array.from(sessionMetadata.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Calculate how many more sessions need to be removed
    const additionalRemovalCount = sessionMetadata.size - sessionsToRemove.length - SESSION_CONFIG.MAX_SESSIONS;
    
    // Add the oldest sessions to the removal list
    for (let i = 0; i < additionalRemovalCount && i < sortedSessions.length; i++) {
      if (!sessionsToRemove.includes(sortedSessions[i][0])) {
        sessionsToRemove.push(sortedSessions[i][0]);
      }
    }
  }

  // Remove the identified sessions
  for (const sessionId of sessionsToRemove) {
    sessionStoryEvents.delete(sessionId);
    sessionCharacterRelationships.delete(sessionId);
    sessionWorldStates.delete(sessionId);
    sessionMetadata.delete(sessionId);
  }

  console.log(`Cleaned up ${sessionsToRemove.length} inactive sessions. Remaining: ${sessionMetadata.size}`);
};

// Set up periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupInactiveSessions, SESSION_CONFIG.CLEANUP_INTERVAL_MS);
  console.log(`Session cleanup scheduled every ${SESSION_CONFIG.CLEANUP_INTERVAL_MS / (60 * 1000)} minutes`);
}

// Import persistence utilities
import { persistence } from '@/ai/utils/persistence';

/**
 * Loads context data from persistent storage if available
 * @param sessionId The session ID
 */
async function loadContextFromStorage(sessionId: string): Promise<void> {
  try {
    // Only load if we don't already have this session in memory
    if (!sessionMetadata.has(sessionId)) {
      console.log(`Loading context data for session ${sessionId} from storage`);
      
      // Load story events
      const events = await persistence.load<StoryEvent[]>(sessionId, 'storyEvents');
      if (events) {
        sessionStoryEvents.set(sessionId, events);
      }
      
      // Load character relationships
      const relationships = await persistence.load<CharacterRelationship[]>(sessionId, 'characterRelationships');
      if (relationships) {
        sessionCharacterRelationships.set(sessionId, relationships);
      }
      
      // Load world state
      const worldState = await persistence.load<WorldState>(sessionId, 'worldState');
      if (worldState) {
        sessionWorldStates.set(sessionId, worldState);
      }
      
      // Set metadata
      sessionMetadata.set(sessionId, {
        lastAccessed: Date.now(),
        created: Date.now()
      });
      
      console.log(`Successfully loaded context data for session ${sessionId}`);
    }
  } catch (error) {
    console.error(`Failed to load context data for session ${sessionId}:`, error);
    // Continue with in-memory data
  }
}

/**
 * Saves context data to persistent storage
 * @param sessionId The session ID
 */
async function saveContextToStorage(sessionId: string): Promise<void> {
  try {
    console.log(`Saving context data for session ${sessionId} to storage`);
    
    // Save story events
    if (sessionStoryEvents.has(sessionId)) {
      await persistence.save(sessionId, 'storyEvents', sessionStoryEvents.get(sessionId));
    }
    
    // Save character relationships
    if (sessionCharacterRelationships.has(sessionId)) {
      await persistence.save(sessionId, 'characterRelationships', sessionCharacterRelationships.get(sessionId));
    }
    
    // Save world state
    if (sessionWorldStates.has(sessionId)) {
      await persistence.save(sessionId, 'worldState', sessionWorldStates.get(sessionId));
    }
    
    console.log(`Successfully saved context data for session ${sessionId}`);
  } catch (error) {
    console.error(`Failed to save context data for session ${sessionId}:`, error);
    // Continue without persistence
  }
}

// Helper to get the current session ID with loading from storage
const getCurrentSessionId = (): string => {
  // Use a default session ID if none is set
  const sessionId = (global as {currentSessionId?: string}).currentSessionId || 'default-session';
  
  // Update the session's last accessed time
  touchSession(sessionId);
  
  // Try to load from storage if this is a new session in memory
  if (!sessionStoryEvents.has(sessionId)) {
    // We can't await here, so we'll just trigger the load
    loadContextFromStorage(sessionId).catch(err => {
      console.error(`Failed to load context for session ${sessionId}:`, err);
    });
  }
  
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
  const sessionId = getCurrentSessionId();
  let updated = false;
  
  if (updateType === 'event' && input.event) {
    const newEvent: StoryEvent = {
      description: input.event.description,
      importance: input.event.importance,
      timestamp: Date.now()
    };
    getStoryEvents().push(newEvent);
    updated = true;
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
      updated = true;
      return { success: true, message: 'Character relationship updated' };
    } else {
      // Add new relationship
      getCharacterRelationships().push({ character1, character2, relationship, notes });
      updated = true;
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
    
    updated = true;
    return { success: true, message: 'World state updated' };
  }
  
  // Save to persistent storage if anything was updated
  if (updated) {
    // Don't await to avoid blocking
    saveContextToStorage(sessionId).catch(err => {
      console.error(`Failed to save context for session ${sessionId}:`, err);
    });
  }
  
  return { success: false, message: 'Invalid update request' };
}
