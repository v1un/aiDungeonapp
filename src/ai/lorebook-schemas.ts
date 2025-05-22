import { z } from 'zod';

// --- BASE SCHEMAS (as previously defined, without id/type) ---

// 1. WorldDetailSchema (Base)
export const WorldDetailSchema = z.object({
  overallSettingDescription: z.string().describe("A general overview of the world's setting, atmosphere, and primary characteristics."),
  keyHistoricalEvents: z.array(z.string()).describe("A list of pivotal historical events that have shaped the world."),
  majorGeographicalAreas: z.array(z.string()).describe("Names or descriptions of significant geographical regions or landmarks."),
  culturalNorms: z.array(z.string()).describe("Common cultural practices, traditions, or societal norms prevalent in the world."),
});
export type WorldDetail = z.infer<typeof WorldDetailSchema>;

// 2. FactionSchema (Base)
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

// 3. LocationSchema (Base)
export const LocationSchema = z.object({
  name: z.string().describe("The name of the location."),
  description: z.string().describe("A detailed description of the location, including its atmosphere and notable features."),
  historicalSignificance: z.string().optional().describe("The historical importance or past events associated with this location."),
  pointsOfInterest: z.array(z.string()).describe("Specific points of interest within or around the location (e.g., buildings, natural wonders)."),
  relatedWorldEvents: z.array(z.string()).optional().describe("Historical or ongoing world events that have impacted or are related to this location."),
});
export type Location = z.infer<typeof LocationSchema>;

// 4. CharacterSchema (Base - derived from GenerateCharacterOutputSchema)
export const CharacterSchema = z.object({
  name: z.string().describe('The name of the character.'),
  backstory: z.string().describe('A detailed backstory for the character.'),
  stats: z
    .object({
      strength: z.number().describe('The strength stat of the character.'),
      dexterity: z.number().describe('The dexterity stat of the character.'),
      constitution: z
        .number()
        .describe('The constitution stat of the character.'),
      intelligence: z
        .number()
        .describe('The intelligence stat of the character.'),
      wisdom: z.number().describe('The wisdom stat of the character.'),
      charisma: z.number().describe('The charisma stat of the character.'),
    })
    .describe('The core stats of the character.'),
  skills: z.array(z.string()).describe('A list of skills the character possesses.'),
});
export type Character = z.infer<typeof CharacterSchema>;


// --- TYPED SCHEMAS (for LoreEntity discriminated union) ---

export const TypedWorldDetailSchema = WorldDetailSchema.extend({
  id: z.string().describe("Unique identifier for this world detail entry."),
  type: z.literal('worldDetail'),
});
export type TypedWorldDetail = z.infer<typeof TypedWorldDetailSchema>;

export const TypedFactionSchema = FactionSchema.extend({
  id: z.string().describe("Unique identifier for this faction."),
  type: z.literal('faction'),
});
export type TypedFaction = z.infer<typeof TypedFactionSchema>;

export const TypedLocationSchema = LocationSchema.extend({
  id: z.string().describe("Unique identifier for this location."),
  type: z.literal('location'),
});
export type TypedLocation = z.infer<typeof TypedLocationSchema>;

export const TypedCharacterSchema = CharacterSchema.extend({
  id: z.string().describe("Unique identifier for this character."),
  type: z.literal('character'),
});
export type TypedCharacter = z.infer<typeof TypedCharacterSchema>;


// --- LoreEntitySchema (Discriminated Union) ---
export const LoreEntitySchema = z.discriminatedUnion("type", [
  TypedWorldDetailSchema,
  TypedFactionSchema,
  TypedLocationSchema,
  TypedCharacterSchema,
  // Add other typed schemas here as they are created
]);
export type LoreEntity = z.infer<typeof LoreEntitySchema>;


// --- LorebookSchema (Main container for lore) ---
export const LorebookSchema = z.object({
  // Storing the typed version of WorldDetail, though a Lorebook might only have one.
  // Consider if this should be TypedWorldDetail directly instead of an array.
  // For now, keeping it as a single optional entry. If multiple world states are needed, an array would be better.
  worldDetails: TypedWorldDetailSchema.optional().describe("Core details and overview of the game world, including its ID and type."),
  factions: z.array(TypedFactionSchema).describe("A list of factions operating within the world."),
  locations: z.array(TypedLocationSchema).describe("A list of significant locations in the world."),
  characters: z.array(TypedCharacterSchema).optional().describe("A list of significant characters in the world."),
  // We can add more arrays here for other entity types later, e.g.:
  // importantNPCs: z.array(TypedImportantNPCSchema).optional(),
  // artifacts: z.array(TypedArtifactSchema).optional(),
});
export type Lorebook = z.infer<typeof LorebookSchema>;
