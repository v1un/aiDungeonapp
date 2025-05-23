/**
 * @fileOverview LowDB-based persistence for game state
 * 
 * This module provides functions for persisting game state data using LowDB,
 * which offers better reliability and persistence between sessions.
 */

import { join } from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { ServerGameState } from '@/types/index';

// Define the base directory for data storage
const DATA_DIR = process.env.AI_DATA_DIR || join(process.cwd(), 'data');
const GAME_STATE_FILE = join(DATA_DIR, 'game-states.json');

// Define the database structure
interface GameStatesDB {
  gameStates: Record<string, ServerGameState>;
}

// Ensure data directory exists
async function ensureDataDirectory(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      console.log(`Created data directory: ${DATA_DIR}`);
    } catch (error) {
      console.error('Failed to create data directory:', error);
      throw error;
    }
  }
}

// Create the database adapter
const adapter = new JSONFile<GameStatesDB>(GAME_STATE_FILE);
const db = new Low<GameStatesDB>(adapter, { gameStates: {} });

// Track initialization status
let isInitialized = false;

/**
 * Initialize the database
 */
export async function initializeGameStateDB(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    // Ensure data directory exists
    await ensureDataDirectory();
    
    // Read the database
    await db.read();
    
    // Initialize with empty object if data doesn't exist yet
    db.data ||= { gameStates: {} };
    
    // Write to ensure file exists
    await db.write();
    
    isInitialized = true;
    console.log('Game state database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize game state database:', error);
    
    // Create a fresh DB in case of error
    db.data = { gameStates: {} };
    
    try {
      await db.write();
      isInitialized = true;
      console.log('Created fresh game state database after error');
    } catch (writeError) {
      console.error('Failed to create fresh database:', writeError);
      throw writeError;
    }
  }
}

/**
 * Ensure database is initialized before operations
 */
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    await initializeGameStateDB();
  }
}

/**
 * Get game state for a session
 * @param sessionId The session ID
 * @returns The game state for the session, or undefined if not found
 */
export async function getGameState(sessionId: string): Promise<ServerGameState | undefined> {
  await ensureInitialized();
  await db.read();
  return db.data?.gameStates?.[sessionId];
}

/**
 * Save game state for a session
 * @param sessionId The session ID
 * @param gameState The game state to save
 */
export async function saveGameState(sessionId: string, gameState: ServerGameState): Promise<void> {
  await ensureInitialized();
  await db.read();
  
  // Ensure gameStates object exists
  db.data.gameStates = db.data.gameStates || {};
  
  db.data.gameStates[sessionId] = gameState;
  await db.write();
}

/**
 * Delete game state for a session
 * @param sessionId The session ID
 */
export async function deleteGameState(sessionId: string): Promise<void> {
  await ensureInitialized();
  await db.read();
  
  if (db.data?.gameStates?.[sessionId]) {
    delete db.data.gameStates[sessionId];
    await db.write();
  }
}

/**
 * List all session IDs with saved game states
 */
export async function listGameStateSessions(): Promise<string[]> {
  await ensureInitialized();
  await db.read();
  return Object.keys(db.data?.gameStates || {});
}

/**
 * Clean up old game states
 * @param maxAgeDays Maximum age of game state data in days
 * @returns Number of sessions cleaned up
 */
export async function cleanupOldGameStates(maxAgeDays: number = 30): Promise<number> {
  await db.read();
  
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  let cleanedCount = 0;
  
  for (const [sessionId, gameState] of Object.entries(db.data.gameStates)) {
    // Skip if no timestamp or invalid timestamp
    if (!gameState.lastAccessed || typeof gameState.lastAccessed !== 'number') {
      continue;
    }
    
    const age = now - gameState.lastAccessed;
    if (age > maxAgeMs) {
      delete db.data.gameStates[sessionId];
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    await db.write();
    console.log(`Cleaned up ${cleanedCount} old game states`);
  }
  
  return cleanedCount;
}

// Initialize the database when this module is imported
initializeGameStateDB().catch(err => {
  console.error('Failed to initialize game state database on import:', err);
});

// Export the LowDB persistence API
export const gameStatePersistence = {
  get: getGameState,
  save: saveGameState,
  delete: deleteGameState,
  list: listGameStateSessions,
  cleanup: cleanupOldGameStates
};
