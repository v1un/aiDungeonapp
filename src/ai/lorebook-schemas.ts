import { z } from 'zod';

// 1. WorldDetailSchema
export const WorldDetailSchema = z.object({
  overallSettingDescription: z.string().describe("A general overview of the world's setting, atmosphere, and primary characteristics."),
  keyHistoricalEvents: z.array(z.string()).describe("A list of pivotal historical events that have shaped the world."),
  majorGeographicalAreas: z.array(z.string()).describe("Names or descriptions of significant geographical regions or landmarks."),
  culturalNorms: z.array(z.string()).describe("Common cultural practices, traditions, or societal norms prevalent in the world."),
});
export type WorldDetail = z.infer<typeof WorldDetailSchema>;

// 2. FactionSchema
export const FactionSchema = z.object({
  name: z.string().describe("The name of the faction."),
  description: z.string().describe("A detailed description of the faction, its history, and its typical members."),
  goals: z.array(z.string()).describe("The primary objectives or aims of the faction."),
  leader: z.string().optional().describe("The current leader of the faction, if known."),
  allies: z.array(z.string()).describe("A list of other factions or groups considered allies."),
  enemies: z.array(z.string()).describe("A list of other factions or groups considered enemies."),
  relatedWorldEvents: z.array(z.string()).optional().describe("Historical or ongoing world events the faction is significantly involved in."),
});
export type Faction = z.infer<typeof FactionSchema>;

// 3. LocationSchema
export const LocationSchema = z.object({
  name: z.string().describe("The name of the location."),
  description: z.string().describe("A detailed description of the location, including its atmosphere and notable features."),
  historicalSignificance: z.string().optional().describe("The historical importance or past events associated with this location."),
  pointsOfInterest: z.array(z.string()).describe("Specific points of interest within or around the location (e.g., buildings, natural wonders)."),
  relatedWorldEvents: z.array(z.string()).optional().describe("Historical or ongoing world events that have impacted or are related to this location."),
});
export type Location = z.infer<typeof LocationSchema>;

// 4. LoreEntitySchema (Discriminated Union)
// For the discriminator, we'll add a 'type' field to each schema that will be part of the union.
export const TypedFactionSchema = FactionSchema.extend({
  type: z.literal('faction'),
});
export type TypedFaction = z.infer<typeof TypedFactionSchema>;

export const TypedLocationSchema = LocationSchema.extend({
  type: z.literal('location'),
});
export type TypedLocation = z.infer<typeof TypedLocationSchema>;

// Add other types here as they are created, e.g.:
// export const TypedImportantNPCSchema = ImportantNPCSchema.extend({ type: z.literal('npc') });
// export const TypedArtifactSchema = ArtifactSchema.extend({ type: z.literal('artifact') });

export const LoreEntitySchema = z.discriminatedUnion("type", [
  TypedFactionSchema,
  TypedLocationSchema,
  // Add other typed schemas here: TypedImportantNPCSchema, TypedArtifactSchema
]);
export type LoreEntity = z.infer<typeof LoreEntitySchema>;

// 5. LorebookSchema
export const LorebookSchema = z.object({
  worldDetails: WorldDetailSchema.optional().describe("Core details and overview of the game world."),
  factions: z.array(TypedFactionSchema).describe("A list of factions operating within the world."), // Using TypedFactionSchema
  locations: z.array(TypedLocationSchema).describe("A list of significant locations in the world."), // Using TypedLocationSchema
  // We can add more arrays here for other entity types later, e.g.:
  // importantNPCs: z.array(TypedImportantNPCSchema).optional(),
  // artifacts: z.array(TypedArtifactSchema).optional(),
});
export type Lorebook = z.infer<typeof LorebookSchema>;
