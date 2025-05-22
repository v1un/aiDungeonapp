import { LoreEntity, LoreEntitySchema, TypedFaction, TypedLocation } from '@/ai/lorebook-schemas'; // Assuming LoreEntitySchema is the most generic
import { z } from 'zod';

// Using Zod schema for ILoreEntity to stay consistent with the rest of the AI type definitions.
// This also provides runtime validation if needed.
export type ILoreEntity = LoreEntity; // Alias to the discriminated union

export interface IMemoryManager {
  addEntity(entity: ILoreEntity): Promise<string>; // Return ID of added entity
  getEntity(id: string, type: string): Promise<ILoreEntity | null>;
  updateEntity(id: string, type: string, updates: Partial<Omit<ILoreEntity, 'type'>>): Promise<ILoreEntity | null>;
  getAllEntitiesOfType(type: string): Promise<ILoreEntity[]>;
  logEvent(eventSummary: string): Promise<void>;
  getRecentEvents(limit: number): Promise<string[]>;
}

// Simple ID generation for in-memory store
let nextId = 1;
function generateId(): string {
  return `mem-${nextId++}`;
}

export class InMemoryMemoryManager implements IMemoryManager {
  private entities: Map<string, ILoreEntity> = new Map(); // Store entities by ID
  private events: string[] = [];
  private readonly maxEvents = 100; // Cap the number of events stored

  async addEntity(entity: ILoreEntity): Promise<string> {
    const id = generateId();
    // Add an 'id' field to the entity itself for easier retrieval/management if it doesn't have one.
    // However, LoreEntitySchema doesn't define 'id'. We'll manage IDs externally in this map.
    this.entities.set(id, entity);
    console.log(`[MemoryManager] Added entity ${id} of type ${entity.type}:`, entity.name);
    return id;
  }

  async getEntity(id: string, type: string): Promise<ILoreEntity | null> {
    const entity = this.entities.get(id);
    if (entity && entity.type === type) {
      console.log(`[MemoryManager] Retrieved entity ${id} of type ${type}:`, entity.name);
      return entity;
    }
    if (entity && entity.type !== type) {
      console.warn(`[MemoryManager] Entity ${id} found, but type mismatch. Expected ${type}, got ${entity.type}`);
      return null;
    }
    console.log(`[MemoryManager] Entity ${id} of type ${type} not found.`);
    return null;
  }

  async updateEntity(id: string, type: string, updates: Partial<Omit<ILoreEntity, 'type'>>): Promise<ILoreEntity | null> {
    const existingEntity = this.entities.get(id);
    if (existingEntity && existingEntity.type === type) {
      // Perform type-safe update
      let updatedEntity: ILoreEntity;
      if (existingEntity.type === 'faction' && type === 'faction') {
         updatedEntity = { ...existingEntity, ...updates as Partial<TypedFaction> };
      } else if (existingEntity.type === 'location' && type === 'location') {
         updatedEntity = { ...existingEntity, ...updates as Partial<TypedLocation> };
      } else {
        console.error(`[MemoryManager] Update failed: Unhandled entity type '${existingEntity.type}' for id ${id}.`);
        return null;
      }
      
      // Validate against the specific schema (optional, but good for robustness)
      try {
        LoreEntitySchema.parse(updatedEntity); // This will throw if the update makes the entity invalid
        this.entities.set(id, updatedEntity);
        console.log(`[MemoryManager] Updated entity ${id} of type ${type}:`, updatedEntity.name);
        return updatedEntity;
      } catch (error) {
        console.error(`[MemoryManager] Update for entity ${id} resulted in invalid data:`, error);
        return null; // Or re-throw, or return existingEntity
      }

    }
    if (existingEntity && existingEntity.type !== type) {
        console.warn(`[MemoryManager] Entity ${id} found, but type mismatch for update. Expected ${type}, got ${existingEntity.type}`);
        return null;
    }
    console.log(`[MemoryManager] Entity ${id} of type ${type} not found for update.`);
    return null;
  }

  async getAllEntitiesOfType(type: string): Promise<ILoreEntity[]> {
    const filteredEntities = Array.from(this.entities.values()).filter(entity => entity.type === type);
    console.log(`[MemoryManager] Retrieved ${filteredEntities.length} entities of type ${type}.`);
    return filteredEntities;
  }

  async logEvent(eventSummary: string): Promise<void> {
    this.events.push(eventSummary);
    if (this.events.length > this.maxEvents) {
      this.events.shift(); // Remove the oldest event
    }
    console.log(`[MemoryManager] Logged event: "${eventSummary}"`);
  }

  async getRecentEvents(limit: number): Promise<string[]> {
    const start = Math.max(0, this.events.length - limit);
    const recent = this.events.slice(start);
    console.log(`[MemoryManager] Retrieved ${recent.length} recent events (limit ${limit}).`);
    return recent;
  }
}

// Export a singleton instance of the memory manager
export const memoryManager = new InMemoryMemoryManager();
