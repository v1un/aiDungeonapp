import { 
  LoreEntity, 
  LoreEntitySchema, 
  TypedFaction, 
  TypedLocation,
  TypedCharacter, // Import new type
  TypedWorldDetail // Import new type
} from '@/ai/lorebook-schemas';
import { z } from 'zod';

// Using Zod schema for ILoreEntity to stay consistent with the rest of the AI type definitions.
export type ILoreEntity = LoreEntity; // Alias to the discriminated union

export interface IMemoryManager {
  addEntity(entity: ILoreEntity): Promise<void>; // Changed to Promise<void> as ID is part of entity
  getEntity(id: string, type?: string): Promise<ILoreEntity | null>; // type is optional, useful for discriminated union
  updateEntity(id: string, updates: Partial<Omit<ILoreEntity, 'id' | 'type'>>): Promise<ILoreEntity | null>; // Type is now part of entity
  getAllEntitiesOfType(type: string): Promise<ILoreEntity[]>;
  logEvent(eventSummary: string): Promise<void>;
  getRecentEvents(limit: number): Promise<string[]>;
}

export class InMemoryMemoryManager implements IMemoryManager {
  private entities: Map<string, ILoreEntity> = new Map(); // Store entities by ID (which is now part of ILoreEntity)
  private events: string[] = [];
  private readonly maxEvents = 100; // Cap the number of events stored

  async addEntity(entity: ILoreEntity): Promise<void> {
    // ID is now part of the entity itself, as defined in Typed schemas
    if (!entity.id) {
      console.error("[MemoryManager] Entity must have an ID to be added.", entity);
      throw new Error("Entity must have an ID.");
    }
    if (this.entities.has(entity.id)) {
      console.warn(`[MemoryManager] Entity with ID ${entity.id} already exists. Overwriting.`);
    }
    this.entities.set(entity.id, entity);
    // Use .name for Faction, Location, Character. For WorldDetail, use a generic description or its ID.
    const entityName = (entity as any).name || (entity as TypedWorldDetail).overallSettingDescription?.substring(0,30) || entity.id;
    console.log(`[MemoryManager] Added/Updated entity ${entity.id} of type ${entity.type}:`, entityName);
  }

  async getEntity(id: string, type?: string): Promise<ILoreEntity | null> {
    const entity = this.entities.get(id);
    if (!entity) {
      console.log(`[MemoryManager] Entity ${id} not found.`);
      return null;
    }
    if (type && entity.type !== type) {
      console.warn(`[MemoryManager] Entity ${id} found, but type mismatch. Expected ${type}, got ${entity.type}`);
      return null;
    }
    const entityName = (entity as any).name || (entity as TypedWorldDetail).overallSettingDescription?.substring(0,30) || entity.id;
    console.log(`[MemoryManager] Retrieved entity ${id} of type ${entity.type}:`, entityName);
    return entity;
  }

  async updateEntity(id: string, updates: Partial<Omit<ILoreEntity, 'id' | 'type'>>): Promise<ILoreEntity | null> {
    const existingEntity = this.entities.get(id);
    if (!existingEntity) {
      console.log(`[MemoryManager] Entity ${id} not found for update.`);
      return null;
    }

    // Perform type-safe update by spreading based on type
    let updatedData: ILoreEntity;
    switch (existingEntity.type) {
      case 'faction':
        updatedData = { ...existingEntity, ...updates as Partial<Omit<TypedFaction, 'id' | 'type'>> };
        break;
      case 'location':
        updatedData = { ...existingEntity, ...updates as Partial<Omit<TypedLocation, 'id' | 'type'>> };
        break;
      case 'character':
        updatedData = { ...existingEntity, ...updates as Partial<Omit<TypedCharacter, 'id' | 'type'>> };
        break;
      case 'worldDetail':
        updatedData = { ...existingEntity, ...updates as Partial<Omit<TypedWorldDetail, 'id' | 'type'>> };
        break;
      default:
        // This should not happen if all types in LoreEntitySchema are handled
        console.error(`[MemoryManager] Update failed: Unhandled entity type '${(existingEntity as any).type}' for id ${id}.`);
        return null;
    }
    
    // Validate against the specific schema (optional, but good for robustness)
    try {
      LoreEntitySchema.parse(updatedData); // This will throw if the update makes the entity invalid
      this.entities.set(id, updatedData);
      const entityName = (updatedData as any).name || (updatedData as TypedWorldDetail).overallSettingDescription?.substring(0,30) || updatedData.id;
      console.log(`[MemoryManager] Updated entity ${id} of type ${updatedData.type}:`, entityName);
      return updatedData;
    } catch (error) {
      console.error(`[MemoryManager] Update for entity ${id} resulted in invalid data:`, error);
      return null; // Or re-throw, or return existingEntity
    }
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
