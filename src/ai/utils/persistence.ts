'use server';

/**
 * @fileOverview Persistence utilities for AI data
 * 
 * This module provides functions for persisting AI-generated data to a database.
 * It currently uses a simple file-based storage system, but can be extended to use
 * a proper database in production.
 */

import fs from 'fs';
import path from 'path';

// Define the base directory for data storage
const DATA_DIR = process.env.AI_DATA_DIR || path.join(process.cwd(), 'data');
const SESSION_DATA_DIR = path.join(DATA_DIR, 'sessions');

// Ensure directories exist
function ensureDirectoriesExist() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SESSION_DATA_DIR)) {
    fs.mkdirSync(SESSION_DATA_DIR, { recursive: true });
  }
}

// Initialize directories
try {
  ensureDirectoriesExist();
} catch (error) {
  console.error('Failed to create data directories:', error);
}

/**
 * Saves data for a specific session
 * @param sessionId The session ID
 * @param key The data key
 * @param data The data to save
 * @returns Promise that resolves when the data is saved
 */
export async function saveSessionData<T>(
  sessionId: string,
  key: string,
  data: T
): Promise<void> {
  try {
    ensureDirectoriesExist();
    
    // Create session directory if it doesn't exist
    const sessionDir = path.join(SESSION_DATA_DIR, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    // Save data to file
    const filePath = path.join(sessionDir, `${key}.json`);
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(data, null, 2),
      'utf8'
    );
    
    console.log(`Saved ${key} data for session ${sessionId}`);
  } catch (error) {
    console.error(`Failed to save ${key} data for session ${sessionId}:`, error);
    throw new Error(`Failed to save ${key} data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Loads data for a specific session
 * @param sessionId The session ID
 * @param key The data key
 * @returns Promise that resolves with the loaded data, or null if not found
 */
export async function loadSessionData<T>(
  sessionId: string,
  key: string
): Promise<T | null> {
  try {
    const filePath = path.join(SESSION_DATA_DIR, sessionId, `${key}.json`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    // Load data from file
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Failed to load ${key} data for session ${sessionId}:`, error);
    return null;
  }
}

/**
 * Deletes data for a specific session
 * @param sessionId The session ID
 * @param key The data key (optional - if not provided, all session data is deleted)
 * @returns Promise that resolves when the data is deleted
 */
export async function deleteSessionData(
  sessionId: string,
  key?: string
): Promise<void> {
  try {
    const sessionDir = path.join(SESSION_DATA_DIR, sessionId);
    
    // Check if session directory exists
    if (!fs.existsSync(sessionDir)) {
      return;
    }
    
    if (key) {
      // Delete specific file
      const filePath = path.join(sessionDir, `${key}.json`);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`Deleted ${key} data for session ${sessionId}`);
      }
    } else {
      // Delete entire session directory
      await fs.promises.rm(sessionDir, { recursive: true, force: true });
      console.log(`Deleted all data for session ${sessionId}`);
    }
  } catch (error) {
    console.error(`Failed to delete ${key || 'all'} data for session ${sessionId}:`, error);
  }
}

/**
 * Lists all sessions with saved data
 * @returns Promise that resolves with an array of session IDs
 */
export async function listSessions(): Promise<string[]> {
  try {
    ensureDirectoriesExist();
    
    const files = await fs.promises.readdir(SESSION_DATA_DIR);
    return files.filter(file => {
      const stats = fs.statSync(path.join(SESSION_DATA_DIR, file));
      return stats.isDirectory();
    });
  } catch (error) {
    console.error('Failed to list sessions:', error);
    return [];
  }
}

/**
 * Cleans up old session data
 * @param maxAgeDays Maximum age of session data in days
 * @returns Promise that resolves with the number of sessions cleaned up
 */
export async function cleanupOldSessions(maxAgeDays: number = 30): Promise<number> {
  try {
    const sessions = await listSessions();
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    let cleanedCount = 0;
    
    for (const sessionId of sessions) {
      const sessionDir = path.join(SESSION_DATA_DIR, sessionId);
      const stats = fs.statSync(sessionDir);
      const age = now - stats.mtimeMs;
      
      if (age > maxAgeMs) {
        await deleteSessionData(sessionId);
        cleanedCount++;
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} old sessions`);
    return cleanedCount;
  } catch (error) {
    console.error('Failed to clean up old sessions:', error);
    return 0;
  }
}

/**
 * Exports session data to a JSON file
 * @param sessionId The session ID
 * @param outputPath The output file path
 * @returns Promise that resolves when the data is exported
 */
export async function exportSessionData(
  sessionId: string,
  outputPath: string
): Promise<void> {
  try {
    const sessionDir = path.join(SESSION_DATA_DIR, sessionId);
    
    // Check if session directory exists
    if (!fs.existsSync(sessionDir)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Get all data files
    const files = await fs.promises.readdir(sessionDir);
    const dataFiles = files.filter(file => file.endsWith('.json'));
    
    // Load all data
    const exportData: Record<string, unknown> = {};
    for (const file of dataFiles) {
      const key = file.replace('.json', '');
      const filePath = path.join(sessionDir, file);
      const data = await fs.promises.readFile(filePath, 'utf8');
      exportData[key] = JSON.parse(data);
    }
    
    // Write export file
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(exportData, null, 2),
      'utf8'
    );
    
    console.log(`Exported data for session ${sessionId} to ${outputPath}`);
  } catch (error) {
    console.error(`Failed to export data for session ${sessionId}:`, error);
    throw new Error(`Failed to export session data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Imports session data from a JSON file
 * @param sessionId The session ID
 * @param inputPath The input file path
 * @returns Promise that resolves when the data is imported
 */
export async function importSessionData(
  sessionId: string,
  inputPath: string
): Promise<void> {
  try {
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file ${inputPath} not found`);
    }
    
    // Load import data
    const importData = JSON.parse(await fs.promises.readFile(inputPath, 'utf8'));
    
    // Save each data key
    for (const [key, data] of Object.entries(importData)) {
      await saveSessionData(sessionId, key, data);
    }
    
    console.log(`Imported data for session ${sessionId} from ${inputPath}`);
  } catch (error) {
    console.error(`Failed to import data for session ${sessionId}:`, error);
    throw new Error(`Failed to import session data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Export a type-safe persistence API
export const persistence = {
  save: saveSessionData,
  load: loadSessionData,
  delete: deleteSessionData,
  list: listSessions,
  cleanup: cleanupOldSessions,
  export: exportSessionData,
  import: importSessionData
};