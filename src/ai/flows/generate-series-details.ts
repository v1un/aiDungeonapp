'use server';
/**
 * @fileOverview Generates details for a fictional series in multiple parts for better reliability and caching.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { LorebookSchema, LoreEntrySchema } from '@/types';
import { generateLorebookFlow as importedGenerateLorebookFlow } from './generate-lorebook-flow';

// Progress tracking for series generation
interface GenerationProgress {
  step: string;
  totalSteps: number;
  currentStep: number;
  details?: string;
  status: 'pending' | 'in-progress' | 'complete' | 'failed';
  startTime: number;
  endTime?: number;
}

let currentGenerationProgress: GenerationProgress | null = null;

// Function to track generation progress
function updateGenerationProgress(
  step: string, 
  totalSteps: number, 
  currentStep: number, 
  status: 'pending' | 'in-progress' | 'complete' | 'failed',
  details?: string
): void {
  currentGenerationProgress = {
    step,
    totalSteps,
    currentStep,
    status,
    details,
    startTime: currentGenerationProgress?.startTime || Date.now(),
    ...(status === 'complete' || status === 'failed' ? { endTime: Date.now() } : {})
  };
  
  // Log progress to console
  const progressPercent = Math.floor((currentStep / totalSteps) * 100);
  console.log(
    `[Generation Progress] ${progressPercent}% - Step ${currentStep}/${totalSteps}: ${step} - ${status}${details ? ` (${details})` : ''}`
  );
}

// Function to get current generation progress
export async function getGenerationProgress(): Promise<GenerationProgress | null> {
  return currentGenerationProgress;
}

const seriesCachePath = '@/lib/series-cache';

const GenerateSeriesDetailsInputSchema = z.object({
  seriesName: z.string().describe('The name of the fictional series (e.g., "Re:Zero", "Star Wars", "Harry Potter").'),
  useCache: z.boolean().optional().describe('Whether to use cached data as a fallback. Default is true.').default(true),
  parts: z.array(z.enum(['basic', 'lorebook', 'characters', 'quest', 'worldMemory'])).optional().describe('Which parts to generate. If not specified, generates all parts.')
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type GenerateSeriesDetailsInput = z.infer<typeof GenerateSeriesDetailsInputSchema>;

// Schema for basic series information
const BasicSeriesInfoSchema = z.object({
  seriesTitle: z.string().describe("The canonical, official title of the series."),
  mainCharacter: z.object({
    name: z.string().describe("The full name of the primary protagonist."),
    description: z.string().describe("A detailed description of the main character (2-3 sentences), focusing on their personality, core motivations, iconic abilities/traits relevant at the series' start, and perhaps a key internal conflict they face early on. Use markdown for emphasis (e.g., **bold** for names or key traits, *italics* for thoughts or nuances)."),
    stats: z.object({
      strength: z.string().describe("A thematic or descriptive value for the character's physical strength (e.g., 'Average', 'Overwhelmingly Powerful', 'Weak but Resilient'). Be creative and true to the series."),
      dexterity: z.string().describe("A thematic or descriptive value for the character's agility, reflexes, or nimbleness."),
      intelligence: z.string().describe("A thematic or descriptive value for the character's intellect, knowledge, or cunning."),
      magicPower: z.string().optional().describe("A thematic or descriptive value for magical aptitude, if applicable. Use 'N/A' if not, or describe its nature (e.g., 'Untapped Potential', 'Master of Elemental Magic')."),
      luck: z.string().optional().describe("A thematic or descriptive value for the character's fortune or typical luck (e.g., 'Cursed', 'Surprisingly Fortunate', 'Average')."),
      specialAbility: z.string().optional().describe("A concise description of a notable special ability or unique trait pivotal to the character, especially early in the series (e.g., 'Return by Death - Resets time upon death', 'Force Sensitivity - Untrained').")
    }).describe("Key thematic stats or attributes. These should be fitting and descriptive, reflecting the character's portrayal at the beginning of the series."),
    memoryEntries: z.array(
      z.object({
        content: z.string().describe("Memory content - what happened or what was learned"),
        timestamp: z.number().describe("When this memory was created (Unix timestamp)"),
        importance: z.number().min(1).max(10).describe("How important this memory is (1-10)")
      })
    ).optional().describe("Important memories related to the main character")
  }).describe("Detailed information about the main protagonist."),
  initialInventory: z.array(z.string()).optional().describe("A list of 2-3 thematic starting items for the main character, directly relevant to their situation at the very beginning of the series.").default([]),
  startingLocation: z.string().optional().describe("The specific, named location where the story or player interaction begins, from the main character's perspective at the series' outset.").default("An Unfamiliar Place")
});

// Schema for character network
const CharacterNetworkSchema = z.object({
  otherCharacters: z.array(
    z.object({
      name: z.string().describe("The full name of an important supporting character, antagonist, or key figure present or relevant early in the series."),
      description: z.string().describe("A brief description (1-2 sentences) of this character, their relationship to the main character (if any), their primary goal/role at the series' start, and a defining trait. Use markdown for emphasis."),
      id: z.string().optional().describe("Unique identifier for this character - system generated"),
      isPermanent: z.boolean().optional().describe("Whether this is a permanent character in the world").default(true),
      firstEncountered: z.number().optional().describe("When the player first met this character (Unix timestamp)"),
      lastInteraction: z.number().optional().describe("When the player last interacted with this character (Unix timestamp)"),
      memoryEntries: z.array(
        z.object({
          content: z.string().describe("Memory content - what happened or what was learned"),
          timestamp: z.number().describe("When this memory was created (Unix timestamp)"),
          importance: z.number().min(1).max(10).describe("How important this memory is (1-10)")
        })
      ).optional().describe("Important memories related to this character")
    })
  ).min(3).max(5).describe("A list of 3 to 5 other notable characters crucial to the initial stages of the series."),
  relationships: z.object({
    main: z.array(
      z.object({
        characterId: z.string().describe("ID of the character this relationship is with"),
        characterName: z.string().describe("Name of the character this relationship is with"),
        type: z.string().describe("Type of relationship (ally, enemy, family, mentor, student, lover, business, acquaintance)"),
        intensity: z.number().min(1).max(10).describe("Intensity of the relationship (1-10)"),
        description: z.string().describe("Description of the relationship"),
        history: z.array(
          z.object({
            event: z.string().describe("Description of an event that affected this relationship"),
            impact: z.number().min(-5).max(5).describe("How this event affected the relationship (-5 to +5)"),
            timestamp: z.number().describe("When this event occurred (Unix timestamp)")
          })
        ).describe("History of events that shaped this relationship")
      })
    ).describe("Relationships between the main character and other characters"),
    additionalCharacters: z.array(
      z.object({
        characterId: z.string().describe("The character who has these relationships"),
        relationships: z.array(
          z.object({
            characterId: z.string().describe("ID of the character this relationship is with"),
            characterName: z.string().describe("Name of the character this relationship is with"),
            type: z.string().describe("Type of relationship"),
            intensity: z.number().min(1).max(10).describe("Intensity of the relationship"),
            description: z.string().describe("Description of the relationship"),
            history: z.array(
              z.object({
                event: z.string().describe("Description of an event that affected this relationship"),
                impact: z.number().min(-5).max(5).describe("How this event affected the relationship"),
                timestamp: z.number().describe("When this event occurred")
              })
            ).describe("History of events that shaped this relationship")
          })
        ).describe("All relationships for this character")
      })
    ).optional().describe("Relationships between additional characters")
  }).optional().describe("Character relationship network")
});

// Schema for quest and interaction
const QuestInteractionSchema = z.object({
  initialQuest: z.object({
    title: z.string().describe('The title of the generated quest.'),
    description: z.string().describe('A detailed description of the generated quest from the main character\'s perspective.'),
    objectives: z.array(z.string()).min(2).max(4).describe('A list of 2-4 clear, actionable objectives for the quest.'),
    rewards: z.array(z.string()).min(1).max(3).describe('A list of 1-3 thematic rewards for completing the quest (e.g., item, information, new contact).'),
    id: z.string().describe("A unique identifier for the quest.").default(() => `quest-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    status: z.enum(['active', 'completed', 'failed']).describe("The current status of the quest.").default('active')
  }).describe("An initial main quest. This quest must be an *immediate* challenge or goal for the main character, directly stemming from their `startingLocation` and initial predicament."),
  initialPromptForPlayer: z.string().describe("A compelling, direct question or immediate choice to present to the player to start their interaction. This prompt should seamlessly flow from the `startingLocation` and the `initialQuest` description, putting the player in the MC's shoes.")
});

// Schema for world memory
const WorldMemorySchema = z.object({
  worldMemory: z.object({
    globalEvents: z.array(
      z.object({
        content: z.string().describe("Description of a world event"),
        timestamp: z.number().describe("When this event occurred (Unix timestamp)"),
        characters: z.array(z.string()).describe("Character IDs involved"),
        location: z.string().describe("Where this event occurred"),
        importance: z.number().min(1).max(10).describe("How important this event is (1-10)")
      })
    ).optional()
  }).optional().describe("Collection of world-level memories and events")
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GenerateSeriesDetailsOutputSchema = z.object({
  seriesTitle: z.string().describe("The canonical, official title of the series."),
  mainCharacter: z.object({
    name: z.string().describe("The full name of the primary protagonist."),
    description: z.string().describe("A detailed description of the main character (2-3 sentences), focusing on their personality, core motivations, iconic abilities/traits relevant at the series' start, and perhaps a key internal conflict they face early on. Use markdown for emphasis (e.g., **bold** for names or key traits, *italics* for thoughts or nuances)."),
    stats: z.object({
      strength: z.string().describe("A thematic or descriptive value for the character's physical strength (e.g., 'Average', 'Overwhelmingly Powerful', 'Weak but Resilient'). Be creative and true to the series."),
      dexterity: z.string().describe("A thematic or descriptive value for the character's agility, reflexes, or nimbleness."),
      intelligence: z.string().describe("A thematic or descriptive value for the character's intellect, knowledge, or cunning."),
      magicPower: z.string().optional().describe("A thematic or descriptive value for magical aptitude, if applicable. Use 'N/A' if not, or describe its nature (e.g., 'Untapped Potential', 'Master of Elemental Magic')."),
      luck: z.string().optional().describe("A thematic or descriptive value for the character's fortune or typical luck (e.g., 'Cursed', 'Surprisingly Fortunate', 'Average')."),
      specialAbility: z.string().optional().describe("A concise description of a notable special ability or unique trait pivotal to the character, especially early in the series (e.g., 'Return by Death - Resets time upon death', 'Force Sensitivity - Untrained').")
    }).describe("Key thematic stats or attributes. These should be fitting and descriptive, reflecting the character's portrayal at the beginning of the series."),
    memoryEntries: z.array(
      z.object({
        content: z.string().describe("Memory content - what happened or what was learned"),
        timestamp: z.number().describe("When this memory was created (Unix timestamp)"),
        importance: z.number().min(1).max(10).describe("How important this memory is (1-10)")
      })
    ).optional().describe("Important memories related to the main character")
  }).describe("Detailed information about the main protagonist."),
  lorebook: LorebookSchema.describe("A structured and comprehensive lorebook for the series."),
  otherCharacters: z.array(
    z.object({
      name: z.string().describe("The full name of an important supporting character, antagonist, or key figure present or relevant early in the series."),
      description: z.string().describe("A brief description (1-2 sentences) of this character, their relationship to the main character (if any), their primary goal/role at the series' start, and a defining trait. Use markdown for emphasis."),
      id: z.string().optional().describe("Unique identifier for this character - system generated"),
      isPermanent: z.boolean().optional().describe("Whether this is a permanent character in the world").default(true),
      firstEncountered: z.number().optional().describe("When the player first met this character (Unix timestamp)"),
      lastInteraction: z.number().optional().describe("When the player last interacted with this character (Unix timestamp)"),
      memoryEntries: z.array(
        z.object({
          content: z.string().describe("Memory content - what happened or what was learned"),
          timestamp: z.number().describe("When this memory was created (Unix timestamp)"),
          importance: z.number().min(1).max(10).describe("How important this memory is (1-10)")
        })
      ).optional().describe("Important memories related to this character")
    })
  ).min(3).max(5).describe("A list of 3 to 5 other notable characters crucial to the initial stages of the series."),
  relationships: z.object({
    main: z.array(
      z.object({
        characterId: z.string().describe("ID of the character this relationship is with"),
        characterName: z.string().describe("Name of the character this relationship is with"),
        type: z.string().describe("Type of relationship (ally, enemy, family, mentor, student, lover, business, acquaintance)"),
        intensity: z.number().min(1).max(10).describe("Intensity of the relationship (1-10)"),
        description: z.string().describe("Description of the relationship"),
        history: z.array(
          z.object({
            event: z.string().describe("Description of an event that affected this relationship"),
            impact: z.number().min(-5).max(5).describe("How this event affected the relationship (-5 to +5)"),
            timestamp: z.number().describe("When this event occurred (Unix timestamp)")
          })
        ).describe("History of events that shaped this relationship")
      })
    ).describe("Relationships between the main character and other characters"),
    additionalCharacters: z.array(
      z.object({
        characterId: z.string().describe("The character who has these relationships"),
        relationships: z.array(
          z.object({
            characterId: z.string().describe("ID of the character this relationship is with"),
            characterName: z.string().describe("Name of the character this relationship is with"),
            type: z.string().describe("Type of relationship"),
            intensity: z.number().min(1).max(10).describe("Intensity of the relationship"),
            description: z.string().describe("Description of the relationship"),
            history: z.array(
              z.object({
                event: z.string().describe("Description of an event that affected this relationship"),
                impact: z.number().min(-5).max(5).describe("How this event affected the relationship"),
                timestamp: z.number().describe("When this event occurred")
              })
            ).describe("History of events that shaped this relationship")
          })
        ).describe("All relationships for this character")
      })
    ).optional().describe("Relationships between additional characters")
  }).optional().describe("Character relationship network"),
  initialInventory: z.array(z.string()).optional().describe("A list of 2-3 thematic starting items for the main character, directly relevant to their situation at the very beginning of the series. e.g., ['Tattered Clothes', 'A Mysterious Locket', 'Empty Water Canteen']. If none, can be an empty array or omit.").default([]),
  startingLocation: z.string().optional().describe("The specific, named location where the story or player interaction begins, from the main character's perspective at the series' outset. e.g., 'A Dusty Alley in the Lower District of Lugnica', 'Inside the Millennium Falcon Cockpit', 'The Forbidden Forest Edge'. Default to 'An Unfamiliar Place' if truly ambiguous for the series start.").default("An Unfamiliar Place"),
  initialQuest: z.object({
    title: z.string().describe('The title of the generated quest.'),
    description: z.string().describe('A detailed description of the generated quest from the main character\'s perspective.'),
    objectives: z.array(z.string()).min(2).max(4).describe('A list of 2-4 clear, actionable objectives for the quest.'),
    rewards: z.array(z.string()).min(1).max(3).describe('A list of 1-3 thematic rewards for completing the quest (e.g., item, information, new contact).'),
    id: z.string().describe("A unique identifier for the quest.").default(() => `quest-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    status: z.enum(['active', 'completed', 'failed']).describe("The current status of the quest.").default('active')
  }).describe("An initial main quest. This quest must be an *immediate* challenge or goal for the main character, directly stemming from their `startingLocation` and initial predicament as described in `initialPromptForPlayer`. It should guide the player's very first actions."),
  initialPromptForPlayer: z.string().describe("A compelling, direct question or immediate choice to present to the player to start their interaction. This prompt should seamlessly flow from the `startingLocation` and the `initialQuest` description, putting the player in the MC's shoes. e.g., 'The alley is dark, and the thugs are closing in on the silver-haired girl. What do you shout, or what is your first move?' or 'The escape pod has crashed. Alarms are blaring. Your first priority is...? What do you do?' Use markdown for emphasis and atmosphere."),
  worldMemory: z.object({
    globalEvents: z.array(
      z.object({
        content: z.string().describe("Description of a world event"),
        timestamp: z.number().describe("When this event occurred (Unix timestamp)"),
        characters: z.array(z.string()).describe("Character IDs involved"),
        location: z.string().describe("Where this event occurred"),
        importance: z.number().min(1).max(10).describe("How important this event is (1-10)")
      })
    ).optional()
  }).optional().describe("Collection of world-level memories and events")
}).describe("Comprehensive details generated for a fictional series to set up an RPG-like experience.");
export type GenerateSeriesDetailsOutput = z.infer<typeof GenerateSeriesDetailsOutputSchema>;

// Individual generation functions
export async function generateBasicSeriesInfo(input: Pick<GenerateSeriesDetailsInput, 'seriesName' | 'useCache'>): Promise<z.infer<typeof BasicSeriesInfoSchema>> {
  const cacheKey = `${input.seriesName}-basic`;
  
  if (input.useCache && typeof window !== 'undefined') {
    try {
      const { getCachedSeriesDetails } = await import(seriesCachePath);
      const cachedData = getCachedSeriesDetails(cacheKey);
      if (cachedData) return cachedData;
    } catch (error) {
      console.warn('Failed to check cache for basic info:', error);
    }
  }

  const result = await generateBasicSeriesInfoFlow({ seriesName: input.seriesName });
  
  if (typeof window !== 'undefined') {
    try {
      const { cacheSeriesDetails } = await import(seriesCachePath);
      cacheSeriesDetails(cacheKey, result);
    } catch (error) {
      console.warn('Failed to cache basic info:', error);
    }
  }
  
  return result;
}

export async function generateLorebook(input: Pick<GenerateSeriesDetailsInput, 'seriesName' | 'useCache'>): Promise<{ lorebook: z.infer<typeof LorebookSchema> }> {
  const cacheKey = `${input.seriesName}-lorebook`;
  
  if (input.useCache && typeof window !== 'undefined') {
    try {
      const { getCachedSeriesDetails } = await import(seriesCachePath);
      const cachedData = getCachedSeriesDetails(cacheKey);
      if (cachedData) return cachedData;
    } catch (error) {
      console.warn('Failed to check cache for lorebook:', error);
    }
  }

  const result = await importedGenerateLorebookFlow({ seriesName: input.seriesName });
  
  if (typeof window !== 'undefined') {
    try {
      const { cacheSeriesDetails } = await import(seriesCachePath);
      cacheSeriesDetails(cacheKey, result);
    } catch (error) {
      console.warn('Failed to cache lorebook:', error);
    }
  }
  
  return result;
}

export async function generateCharacterNetwork(
  input: Pick<GenerateSeriesDetailsInput, 'seriesName' | 'useCache'>,
  mainCharacterName: string
): Promise<z.infer<typeof CharacterNetworkSchema>> {
  const cacheKey = `${input.seriesName}-characters`;
  
  if (input.useCache && typeof window !== 'undefined') {
    try {
      const { getCachedSeriesDetails } = await import(seriesCachePath);
      const cachedData = getCachedSeriesDetails(cacheKey);
      if (cachedData) return cachedData;
    } catch (error) {
      console.warn('Failed to check cache for characters:', error);
    }
  }

  const result = await generateCharacterNetworkFlow({ 
    seriesName: input.seriesName,
    mainCharacterName 
  });
  
  // Process characters with IDs and relationships
  const processedResult = processCharacterNetwork(result, mainCharacterName);
  
  if (typeof window !== 'undefined') {
    try {
      const { cacheSeriesDetails } = await import(seriesCachePath);
      cacheSeriesDetails(cacheKey, processedResult);
    } catch (error) {
      console.warn('Failed to cache characters:', error);
    }
  }
  
  return processedResult;
}

export async function generateQuestInteraction(
  input: Pick<GenerateSeriesDetailsInput, 'seriesName' | 'useCache'>,
  context: { mainCharacterName: string; startingLocation: string }
): Promise<z.infer<typeof QuestInteractionSchema>> {
  const cacheKey = `${input.seriesName}-quest`;
  
  if (input.useCache && typeof window !== 'undefined') {
    try {
      const { getCachedSeriesDetails } = await import(seriesCachePath);
      const cachedData = getCachedSeriesDetails(cacheKey);
      if (cachedData) return cachedData;
    } catch (error) {
      console.warn('Failed to check cache for quest:', error);
    }
  }

  const result = await generateQuestInteractionFlow({ 
    seriesName: input.seriesName,
    ...context 
  });
  
  // Add system-generated quest ID and status
  const processedResult = {
    ...result,
    initialQuest: {
      ...result.initialQuest,
      id: `quest-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'active' as const
    }
  };
  
  if (typeof window !== 'undefined') {
    try {
      const { cacheSeriesDetails } = await import(seriesCachePath);
      cacheSeriesDetails(cacheKey, processedResult);
    } catch (error) {
      console.warn('Failed to cache quest:', error);
    }
  }
  
  return processedResult;
}

export async function generateWorldMemory(
  input: Pick<GenerateSeriesDetailsInput, 'seriesName' | 'useCache'>,
  characterIds: string[]
): Promise<z.infer<typeof WorldMemorySchema>> {
  const cacheKey = `${input.seriesName}-worldmemory`;
  
  if (input.useCache && typeof window !== 'undefined') {
    try {
      const { getCachedSeriesDetails } = await import(seriesCachePath);
      const cachedData = getCachedSeriesDetails(cacheKey);
      if (cachedData) return cachedData;
    } catch (error) {
      console.warn('Failed to check cache for world memory:', error);
    }
  }

  const result = await generateWorldMemoryFlow({ 
    seriesName: input.seriesName,
    characterIds 
  });
  
  if (typeof window !== 'undefined') {
    try {
      const { cacheSeriesDetails } = await import(seriesCachePath);
      cacheSeriesDetails(cacheKey, result);
    } catch (error) {
      console.warn('Failed to cache world memory:', error);
    }
  }
  
  return result;
}

// Main generation function that orchestrates all parts
export async function generateSeriesDetails(input: GenerateSeriesDetailsInput): Promise<GenerateSeriesDetailsOutput> {
  const MAX_RETRIES = 3;
  const partsToGenerate = input.parts || ['basic', 'lorebook', 'characters', 'quest', 'worldMemory'];
  
  try {
    console.log(`Generating series details for "${input.seriesName}" in ${partsToGenerate.length} parts using batched approach`);
    
    // Step 1: Generate basic info first (required for other parts)
    console.log(`[1/${partsToGenerate.length}] Generating basic info for "${input.seriesName}"...`);
    updateGenerationProgress('Generating basic info', partsToGenerate.length, 1, 'in-progress');
    const basicInfo = await retryOperation(
      () => generateBasicSeriesInfo(input),
      MAX_RETRIES,
      'basic series info'
    );
    console.log(`Basic info for "${input.seriesName}" generated successfully: ${basicInfo.seriesTitle}, ${basicInfo.mainCharacter.name}`);
    updateGenerationProgress('Generating basic info', partsToGenerate.length, 1, 'complete');
    
    // Generate remaining components in batches to avoid overwhelming the API
    let lorebookResult = null;
    let characterNetworkResult = null;
    let questResult = null;
    let worldMemoryResult = null;
    
    // Step 2: Generate lorebook (this already has internal batching for entries)
    if (partsToGenerate.includes('lorebook')) {
      console.log(`[2/${partsToGenerate.length}] Generating lorebook for "${input.seriesName}" using batched approach...`);
      updateGenerationProgress('Generating lorebook', partsToGenerate.length, 2, 'in-progress');
      lorebookResult = await retryOperation(
        () => generateLorebook(input),
        MAX_RETRIES,
        'lorebook'
      );
      console.log(`Lorebook for "${input.seriesName}" generated successfully with ${lorebookResult?.lorebook?.entries?.length || 0} entries`);
      updateGenerationProgress('Generating lorebook', partsToGenerate.length, 2, 'complete');
      
      // Short delay before next major component generation to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 3: Generate character network
    if (partsToGenerate.includes('characters')) {
      console.log(`[3/${partsToGenerate.length}] Generating character network for "${input.seriesName}"...`);
      updateGenerationProgress('Generating character network', partsToGenerate.length, 3, 'in-progress');
      characterNetworkResult = await retryOperation(
        () => generateCharacterNetwork(input, basicInfo.mainCharacter.name),
        MAX_RETRIES,
        'character network'
      );
      console.log(`Character network for "${input.seriesName}" generated successfully with ${characterNetworkResult?.otherCharacters?.length || 0} characters`);
      updateGenerationProgress('Generating character network', partsToGenerate.length, 3, 'complete');
      
      // Short delay before next major component generation
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 4: Generate quest interaction after we have character and location info
    if (partsToGenerate.includes('quest')) {
      console.log(`[4/${partsToGenerate.length}] Generating quest interaction for "${input.seriesName}"...`);
      updateGenerationProgress('Generating quest interaction', partsToGenerate.length, 4, 'in-progress');
      questResult = await retryOperation(
        () => generateQuestInteraction(input, {
          mainCharacterName: basicInfo.mainCharacter.name,
          startingLocation: basicInfo.startingLocation
        }),
        MAX_RETRIES,
        'quest and interaction'
      );
      console.log(`Quest "${questResult?.initialQuest?.title || 'Unknown'}" for "${input.seriesName}" generated successfully`);
      updateGenerationProgress('Generating quest interaction', partsToGenerate.length, 4, 'complete');
      
      // Short delay before next major component generation
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 5: Generate world memory after we have character IDs
    if (partsToGenerate.includes('worldMemory') && characterNetworkResult) {
      console.log(`[5/${partsToGenerate.length}] Generating world memory for "${input.seriesName}"...`);
      updateGenerationProgress('Generating world memory', partsToGenerate.length, 5, 'in-progress');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const characterIds = characterNetworkResult.otherCharacters?.map((char: any) => char.id).filter(Boolean) || [];
      worldMemoryResult = await retryOperation(
        () => generateWorldMemory(input, characterIds),
        MAX_RETRIES,
        'world memory'
      );
      console.log(`World memory for "${input.seriesName}" generated successfully`);
      updateGenerationProgress('Generating world memory', partsToGenerate.length, 5, 'complete');
    }
    
    // Combine all results
    updateGenerationProgress('Finalizing generation', partsToGenerate.length, partsToGenerate.length, 'in-progress', 'Combining all components');
    
    const fullOutput: GenerateSeriesDetailsOutput = {
      ...basicInfo,
      lorebook: lorebookResult?.lorebook || { overallSummary: '', entries: [] },
      otherCharacters: characterNetworkResult?.otherCharacters || [],
      relationships: characterNetworkResult?.relationships || { main: [], additionalCharacters: [] },
      initialQuest: questResult?.initialQuest || {
        title: 'Default Quest',
        description: 'A default quest description',
        objectives: ['Explore the area'],
        rewards: ['Experience'],
        id: `quest-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        status: 'active' as const
      },
      initialPromptForPlayer: questResult?.initialPromptForPlayer || 'What do you do?',
      worldMemory: worldMemoryResult?.worldMemory
    };
    
    // Report final stats
    const stats = {
      loreEntries: lorebookResult?.lorebook?.entries?.length || 0,
      characters: characterNetworkResult?.otherCharacters?.length || 0,
      objectives: questResult?.initialQuest?.objectives?.length || 0
    };
    
    updateGenerationProgress('Generation complete', partsToGenerate.length, partsToGenerate.length, 'complete',
      `Series: ${basicInfo.seriesTitle}, ${stats.loreEntries} lore entries, ${stats.characters} characters`);
    
    console.log(`Successfully generated series details for "${input.seriesName}" in ${partsToGenerate.length} batched parts`);
    return fullOutput;
    
  } catch (error) {
    console.error(`Failed to generate series details for "${input.seriesName}":`, error);
    updateGenerationProgress('Generation failed', partsToGenerate.length, 0, 'failed', 
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(`Failed to generate series details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function for retry logic
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`${operationName} generation attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);
      
      const isTransientError = error instanceof Error && 
        (error.message.includes('500 Internal Server Error') || 
         error.message.includes('503 Service Unavailable') ||
         error.message.includes('502 Bad Gateway') ||
         error.message.includes('504 Gateway Timeout') ||
         error.message.includes('429 Too Many Requests') ||
         error.message.includes('An internal error has occurred'));
      
      if (attempt === maxRetries || !isTransientError) {
        break;
      }
      
      const backoffMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 15000);
      console.log(`Retrying ${operationName} in ${backoffMs.toFixed(0)}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  throw new Error(`Failed to generate ${operationName} after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

// Helper function to process character network
function processCharacterNetwork(
  result: z.infer<typeof CharacterNetworkSchema>,
  mainCharacterName: string
): z.infer<typeof CharacterNetworkSchema> {
  if (!result.otherCharacters?.length) return result;
  
  // Process characters with IDs and memory entries
  const processedCharacters = result.otherCharacters.map((character, index) => {
    const characterId = `char-${Date.now()}-${Math.random().toString(36).substring(2, 5)}-${index}`;
    
    return {
      ...character,
      id: characterId,
      isPermanent: true,
      firstEncountered: Date.now(),
      lastInteraction: Date.now(),
      memoryEntries: [{
        content: `Initial appearance in the story. ${character.description}`,
        timestamp: Date.now(),
        importance: 8
      }]
    };
  });
  
  // Build relationships
  const mainRelationships = processedCharacters.map(character => ({
    characterId: character.id!,
    characterName: character.name,
    type: determineInitialRelationshipType(character.description),
    intensity: determineInitialRelationshipIntensity(character.description),
    description: generateInitialRelationshipDescription(mainCharacterName, character.name, character.description),
    history: [{
      event: "Initial encounter based on narrative setup",
      impact: 0,
      timestamp: Date.now()
    }]
  }));
  
  const additionalCharacterRelationships = processedCharacters.map(character => ({
    characterId: character.id!,
    relationships: [{
      characterId: 'main',
      characterName: mainCharacterName,
      type: determineInitialRelationshipType(character.description),
      intensity: determineInitialRelationshipIntensity(character.description),
      description: generateInitialRelationshipDescription(character.name, mainCharacterName, character.description),
      history: [{
        event: "Initial encounter based on narrative setup",
        impact: 0,
        timestamp: Date.now()
      }]
    }]
  }));
  
  return {
    otherCharacters: processedCharacters,
    relationships: {
      main: mainRelationships,
      additionalCharacters: additionalCharacterRelationships
    }
  };
}

// Helper functions for relationship generation
function determineInitialRelationshipType(characterDescription: string): string {
  const description = characterDescription.toLowerCase();
  
  if (description.includes('friend') || description.includes('ally') || description.includes('companion')) {
    return 'ally';
  }
  if (description.includes('enemy') || description.includes('rival') || description.includes('antagonist') || 
      description.includes('villain') || description.includes('nemesis') || description.includes('foe')) {
    return 'enemy';
  }
  if (description.includes('family') || description.includes('sibling') || description.includes('brother') || 
      description.includes('sister') || description.includes('father') || description.includes('mother') ||
      description.includes('parent') || description.includes('child')) {
    return 'family';
  }
  if (description.includes('mentor') || description.includes('teacher') || description.includes('guide')) {
    return 'mentor';
  }
  if (description.includes('student') || description.includes('apprentice') || description.includes('disciple')) {
    return 'student';
  }
  if (description.includes('lover') || description.includes('romantic') || description.includes('partner')) {
    return 'lover';
  }
  if (description.includes('business') || description.includes('colleague') || description.includes('associate')) {
    return 'business';
  }
  
  // Default to acquaintance if no clear type is found
  return 'acquaintance';
}

function determineInitialRelationshipIntensity(characterDescription: string): number {
  const description = characterDescription.toLowerCase();
  
  // Check for strong relationship indicators
  if (description.includes('close') || description.includes('best') || 
      description.includes('loyal') || description.includes('devoted') ||
      description.includes('lifelong') || description.includes('trusted')) {
    return 8; // High intensity
  }
  
  // Check for medium strength indicators
  if (description.includes('friend') || description.includes('ally') ||
      description.includes('partner') || description.includes('companion')) {
    return 6; // Medium-high intensity
  }
  
  // Check for antagonistic indicators
  if (description.includes('arch') || description.includes('sworn') ||
      description.includes('mortal') || description.includes('greatest') ||
      description.includes('nemesis')) {
    return 9; // Very high intensity (for enemies)
  }
  
  if (description.includes('enemy') || description.includes('rival') ||
      description.includes('antagonist') || description.includes('foe')) {
    return 7; // High intensity (for enemies)
  }
  
  // Check for casual indicators
  if (description.includes('acquaintance') || description.includes('recently met') ||
      description.includes('new')) {
    return 3; // Low intensity
  }
  
  // Default to medium intensity if no clear indicators
  return 5;
}

function generateInitialRelationshipDescription(character1Name: string, character2Name: string, contextDescription: string): string {
  // Extract relationship hints from the context
  const type = determineInitialRelationshipType(contextDescription);
  
  // Generate appropriate description based on type
  switch (type) {
    case 'ally':
      return `${character1Name} considers ${character2Name} an ally and potential friend, based on their initial interactions.`;
    case 'enemy':
      return `${character1Name} sees ${character2Name} as an adversary or obstacle to their goals.`;
    case 'family':
      return `${character1Name} and ${character2Name} share a family connection, with all the complications that entails.`;
    case 'mentor':
      return `${character1Name} views ${character2Name} as someone who can provide guidance and wisdom.`;
    case 'student':
      return `${character1Name} takes on a teaching role in relation to ${character2Name}.`;
    case 'lover':
      return `${character1Name} has romantic feelings or a complex personal connection with ${character2Name}.`;
    case 'business':
      return `${character1Name} has a professional or transactional relationship with ${character2Name}.`;
    case 'acquaintance':
      return `${character1Name} has just met or barely knows ${character2Name}, but recognizes their significance.`;
    default:
      return `${character1Name} and ${character2Name} have a relationship that is still developing and being defined.`;
  }
}

// Define individual AI flows
const generateBasicSeriesInfoFlow = ai.defineFlow({
  name: 'generateBasicSeriesInfoFlow',
  inputSchema: z.object({ seriesName: z.string() }),
  outputSchema: BasicSeriesInfoSchema,
}, async (input) => {
  const basicPrompt = ai.definePrompt({
    name: 'generateBasicSeriesInfoPrompt',
    input: { schema: z.object({ seriesName: z.string() }) },
    output: { schema: BasicSeriesInfoSchema },
    prompt: `Generate basic series information for "{{seriesName}}" including the main character, starting location, and initial inventory. Focus on accuracy to the canon and the very beginning of the series.

You must generate:
1. Series title - the canonical name
2. Main character with detailed description and stats
3. Starting location where the story begins
4. Initial inventory items (2-3 thematic items)

Ensure all content is specific to "{{seriesName}}" and accurate to the series canon.`
  });
  
  const { output } = await basicPrompt(input);
  if (!output) {
    throw new Error('Failed to generate basic series info');
  }
  return output;
});

// Using the imported generateLorebookFlow from './generate-lorebook-flow'
// The following code is the implementation details kept for reference only and not active

/*
const localGenerateLorebookFlow = ai.defineFlow({
  name: 'generateLorebookFlow',
  inputSchema: z.object({ seriesName: z.string() }),
  outputSchema: z.object({ lorebook: LorebookSchema }),
}, async (input): Promise<{ lorebook: z.infer<typeof LorebookSchema> }> => {
  // First, generate just the overall summary with minimal schema restrictions
  const summaryPrompt = ai.definePrompt({
    name: 'generateLorebookSummaryPrompt',
    input: { schema: z.object({ seriesName: z.string() }) },
    output: { schema: z.object({ overallSummary: z.string() }) },
    prompt: `Generate a comprehensive summary for "{{seriesName}}" lorebook. This is critical for immersion and must be specific to the series.

The overall summary should be 2-3 paragraphs about the world, its primary conflict, central themes, and significant historical context.

Generate only the summary text, ensuring it's canon-accurate to "{{seriesName}}".`
  });
  
  let overallSummary;
  try {
    const summaryResult = await summaryPrompt(input);
    if (!summaryResult.output) {
      throw new Error('Failed to generate lorebook summary');
    }
    overallSummary = summaryResult.output.overallSummary;
    console.log("Successfully generated lorebook summary");
  } catch (error) {
    console.error("Error generating lorebook summary:", error);
    // Provide a fallback generic summary if generation fails
    overallSummary = `The world of "${input.seriesName}" is rich with unique characters, locations, and lore. This fictional universe contains its own history, cultures, and conflicts that shape the narrative.

The setting provides the backdrop for various adventures, challenges, and character developments that occur throughout the series. Major events and conflicts drive the story forward, creating tension and opportunities for growth.`;
  }
  
  // Define our target number of entries
  const ENTRY_TARGET = 85;
  
  // Define categories for better organization of entries
  // Using more categories to reach our target of ~85 entries
  const categories = [
    'Major Locations', 'Minor Locations', 'Key Characters & NPCs', 'Supporting Characters',
    'Historical Events', 'Recent Events', 'Magic Systems & Unique Technologies', 
    'Factions & Organizations', 'Creatures & Races', 'Cultural Notes',
    'Important Items & Artifacts', 'Mythology & Legends', 'Political Landscape'
  ];
  
  let allEntries: Array<z.infer<typeof LoreEntrySchema>> = [];
  
  // Function to retry batch generation with backoff
  async function retryBatchGeneration(category: string, retries = 2): Promise<z.infer<typeof LoreEntrySchema>[]> {
    // Schema for batch entries - increased to generate more entries per category to reach ~85 entries total
    const batchSchema = z.object({
      entries: z.array(LoreEntrySchema).min(4).max(7)
    });
    
    const batchPrompt = ai.definePrompt({
      name: `generate${category.replace(/\s+/g, '')}EntriesPrompt`,
      input: { schema: z.object({ seriesName: z.string(), category: z.string() }) },
      output: { schema: batchSchema },
      prompt: `Generate 4-7 detailed lorebook entries for the "${category}" category in "{{seriesName}}".

Each entry should include:
- name: A specific title (character name, location name, event name, etc.)
- description: A detailed 2-3 sentence description
- category: Always use "{{category}}" as the category

Focus on accuracy to the "{{seriesName}}" series and provide rich, specific details that would help a storyteller maintain consistency.`
    });
    
    // Decrease complexity for retry attempts but still aim for multiple entries
    const fallbackSchema = z.object({
      entries: z.array(LoreEntrySchema).min(2).max(5) // Still allow multiple entries on fallback
    });
    
    const fallbackPrompt = ai.definePrompt({
      name: `generateSimplified${category.replace(/\s+/g, '')}EntriesPrompt`,
      input: { schema: z.object({ seriesName: z.string(), category: z.string() }) },
      output: { schema: fallbackSchema },
      prompt: `Generate 3-5 simple entries for "${category}" in "{{seriesName}}".

Keep each entry concise with:
- name: Short title 
- description: 1-2 sentences only
- category: Use "{{category}}"`
    });
    
    try {
      const batchResult = await batchPrompt({ seriesName: input.seriesName, category });
      if (batchResult.output && batchResult.output.entries.length > 0) {
        return batchResult.output.entries;
      }
    } catch (error) {
      console.warn(`Batch generation for ${category} failed, retrying with simplified prompt...`, error);
      try {
        const fallbackResult = await fallbackPrompt({ seriesName: input.seriesName, category });
        if (fallbackResult.output && fallbackResult.output.entries.length > 0) {
          return fallbackResult.output.entries;
        }
      } catch (fallbackError) {
        console.error(`Simplified batch generation for ${category} also failed.`, fallbackError);
      }
    }
    return []; // Return empty if all attempts fail
  }
  
  // Generate entries in batches by category
  const batchPromises: Promise<z.infer<typeof LoreEntrySchema>[]>[] = [];
  
  // Process some categories in parallel to speed up generation
  // but not too many to avoid rate limiting
  const batchSize = 2; // Process 2 categories at a time
  
  for (let i = 0; i < categories.length; i += batchSize) {
    const currentBatch = categories.slice(i, i + batchSize);
    for (const category of currentBatch) {
      batchPromises.push(retryBatchGeneration(category));
    }
    // Wait for the current batch to complete before starting the next to manage load
    const results = await Promise.all(batchPromises.splice(0, batchPromises.length)); 
    results.forEach(batch => allEntries.push(...batch));
    if (i + batchSize < categories.length) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between batches
    }
  }
  
  // Ensure we have at least the minimum required entries
  if (allEntries.length < 5) {
    console.warn(`Warning: Generated only ${allEntries.length} lore entries. Adding generic entries.`);
    const genericCategories = ['Key Locations', 'Notable Characters', 'Historical Events', 'Cultural Aspects', 'Unique Items'];
    for (let i = 0; i < (5 - allEntries.length); i++) {
      const category = genericCategories[i % genericCategories.length];
      const entryNumber = Math.floor(i / genericCategories.length) + 1;
      allEntries.push({
        name: `${category} ${entryNumber}`,
        description: `An important ${category.toLowerCase()} in the world of ${input.seriesName} that adds depth to the story universe.`,
        category
      });
    }
  }
  
  // Reference our previously defined target entry count
  // const ENTRY_TARGET = 85; // Already declared above
  
  // Try to generate additional generic entries to reach target count if we're far below
  if (allEntries.length < ENTRY_TARGET * 0.7) { // If we have less than 70% of target
    console.warn(`Warning: Generated only ${allEntries.length} lore entries, significantly below target of ${ENTRY_TARGET}. Adding additional generic entries.`);
    
    // Add more generic entries to help reach our target
    const additionalNeeded = Math.min(20, Math.floor((ENTRY_TARGET - allEntries.length) / 2)); // Don't add too many at once
    
    const expandedGenericCategories = [
      'Key Locations', 'Minor Locations', 'Supporting Characters', 'Historical Figures',
      'World Elements', 'Cultural Traditions', 'Notable Events', 'Magical Objects',
      'Unique Species', 'Political Systems', 'Military Forces', 'Economic Systems'
    ];
    
    for (let i = 0; i < additionalNeeded; i++) {
      const categoryIndex = i % expandedGenericCategories.length;
      const category = expandedGenericCategories[categoryIndex];
      const entryNumber = Math.floor(i / expandedGenericCategories.length) + 1;
      
      allEntries.push({
        name: `${category} ${entryNumber}`,
        description: `An important ${category.toLowerCase()} in the world of ${input.seriesName} that enriches the narrative universe with additional depth and context.`,
        category
      });
    }
  }
  
  // Ensure we don't exceed the maximum allowed entries (25)
  // If we generate too many entries (> 100), trim them down to around our target of ~85
  // ENTRY_TARGET is already defined above
  if (allEntries.length > 100) {
    console.warn(`Warning: Generated ${allEntries.length} lore entries, exceeding maximum reasonable limit of 100. Trimming to ~${ENTRY_TARGET} entries.`);
    
    // Create a map to count entries per category
    const categoryCount = new Map<string, number>();
    allEntries.forEach(entry => {
      const count = categoryCount.get(entry.category) || 0;
      categoryCount.set(entry.category, count + 1);
    });
    
    // Sort categories by count (highest first)
    const sortedCategories = [...categoryCount.entries()].sort((a, b) => b[1] - a[1]);
    
    // Calculate how many entries to keep per category to achieve balanced distribution
    // First, ensure at least 2 entries from each category
    let trimmedEntries: Array<z.infer<typeof LoreEntrySchema>> = [];
    const minPerCategory = 2;
    const targetTotal = ENTRY_TARGET;
    let currentTotal = 0;

    for (const [category, count] of sortedCategories) {
      const entriesInCategory = allEntries.filter(entry => entry.category === category);
      const toKeep = Math.min(count, minPerCategory);
      trimmedEntries.push(...entriesInCategory.slice(0, toKeep));
      currentTotal += toKeep;
    }

    // If we still have space, fill with remaining entries, prioritizing more populated categories
    if (currentTotal < targetTotal) {
      const remainingEntries = allEntries.filter(entry => !trimmedEntries.includes(entry));
      let additionalSlotsNeeded = targetTotal - currentTotal;
      
      // Prioritize entries from categories that are more prominent in the original set
      const priorityCategories = sortedCategories.map(sc => sc[0]);
      
      const priorityEntries = remainingEntries.filter(entry => 
        priorityCategories.includes(entry.category)
      );
      
      const otherEntries = remainingEntries.filter(entry => 
        !priorityCategories.includes(entry.category)
      );
      
      // Add entries in priority order until we hit target
      trimmedEntries.push(
        ...priorityEntries.slice(0, Math.min(additionalSlotsNeeded, priorityEntries.length)),
        ...otherEntries.slice(0, Math.max(0, additionalSlotsNeeded - priorityEntries.length))
      );
    }
    
    // Update allEntries to the trimmed version
    allEntries = trimmedEntries;
  }
  
  // Log success
  console.log(`Successfully generated lorebook with ${allEntries.length} entries across ${new Set(allEntries.map(e => e.category)).size} categories`);
  
  return { 
    lorebook: {
      overallSummary,
      entries: allEntries
    }
  };
});
*/

const generateCharacterNetworkFlow = ai.defineFlow({
  name: 'generateCharacterNetworkFlow',
  inputSchema: z.object({ seriesName: z.string(), mainCharacterName: z.string() }),
  outputSchema: CharacterNetworkSchema,
}, async (input) => {
  const characterPrompt = ai.definePrompt({
    name: 'generateCharacterNetworkPrompt',
    input: { schema: z.object({ seriesName: z.string(), mainCharacterName: z.string() }) },
    output: { schema: CharacterNetworkSchema },
    prompt: `Generate 3-5 important characters from "{{seriesName}}" who are relevant early in the series, along with their relationships to {{mainCharacterName}}.

For each character provide:
1. Full name and description (1-2 sentences)
2. Their role/relationship to the main character
3. Their defining traits and early goals

Focus on characters who appear early in "{{seriesName}}" and are important to the initial story setup.`
  });
  
  const { output } = await characterPrompt(input);
  if (!output) {
    throw new Error('Failed to generate character network');
  }
  return output;
});

const generateQuestInteractionFlow = ai.defineFlow({
  name: 'generateQuestInteractionFlow',
  inputSchema: z.object({ 
    seriesName: z.string(), 
    mainCharacterName: z.string(), 
    startingLocation: z.string() 
  }),
  outputSchema: QuestInteractionSchema,
}, async (input) => {
  const questPrompt = ai.definePrompt({
    name: 'generateQuestInteractionPrompt',
    input: { schema: z.object({ seriesName: z.string(), mainCharacterName: z.string(), startingLocation: z.string() }) },
    output: { schema: QuestInteractionSchema },
    prompt: `Generate an initial quest and player prompt for "{{seriesName}}" starting at {{startingLocation}} with {{mainCharacterName}}. The quest should be immediate and engaging.

Create:
1. A compelling quest title and description from the main character's perspective
2. 2-4 clear, actionable objectives
3. 1-3 thematic rewards
4. An engaging initial prompt that puts the player in the character's shoes

The quest must be based on the actual opening scenario of "{{seriesName}}" and should guide the player's first actions in the story.`
  });
  
  const { output } = await questPrompt(input);
  if (!output) {
    throw new Error('Failed to generate quest and interaction');
  }
  return output;
});

const generateWorldMemoryFlow = ai.defineFlow({
  name: 'generateWorldMemoryFlow',
  inputSchema: z.object({ seriesName: z.string(), characterIds: z.array(z.string()) }),
  outputSchema: WorldMemorySchema,
}, async (input) => {
  const memoryPrompt = ai.definePrompt({
    name: 'generateWorldMemoryPrompt',
    input: { schema: z.object({ seriesName: z.string(), characterIds: z.array(z.string()) }) },
    output: { schema: WorldMemorySchema },
    prompt: `Generate world-level memories and global events for "{{seriesName}}" that involve the characters with IDs: {{characterIds}}.

Create global events that:
1. Are significant to the world of "{{seriesName}}"
2. Involve the main characters where appropriate
3. Set up the current state of the world
4. Are canon-accurate to the series

Each event should have a description, timestamp, involved characters, location, and importance rating.`
  });
  
  const { output } = await memoryPrompt(input);
  if (!output) {
    throw new Error('Failed to generate world memory');
  }
  return output;
});

