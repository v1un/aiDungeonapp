'use server';
/**
 * @fileOverview Generates details for a fictional series in multiple parts for better reliability and caching.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { LorebookSchema } from '@/types';

const seriesCachePath = '@/lib/series-cache';

const GenerateSeriesDetailsInputSchema = z.object({
  seriesName: z.string().describe('The name of the fictional series (e.g., "Re:Zero", "Star Wars", "Harry Potter").'),
  useCache: z.boolean().optional().describe('Whether to use cached data as a fallback. Default is true.').default(true),
  parts: z.array(z.enum(['basic', 'lorebook', 'characters', 'quest', 'worldMemory'])).optional().describe('Which parts to generate. If not specified, generates all parts.')
});
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

  const result = await generateLorebookFlow({ seriesName: input.seriesName });
  
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
    console.log(`Generating series details for "${input.seriesName}" in ${partsToGenerate.length} parts`);
    
    // Generate basic info first (required for other parts)
    const basicInfo = await retryOperation(
      () => generateBasicSeriesInfo(input),
      MAX_RETRIES,
      'basic series info'
    );
    
    // Generate other parts in parallel where possible
    const promises: Promise<any>[] = [];
    
    if (partsToGenerate.includes('lorebook')) {
      promises.push(
        retryOperation(
          () => generateLorebook(input),
          MAX_RETRIES,
          'lorebook'
        )
      );
    } else {
      promises.push(Promise.resolve(null));
    }
    
    if (partsToGenerate.includes('characters')) {
      promises.push(
        retryOperation(
          () => generateCharacterNetwork(input, basicInfo.mainCharacter.name),
          MAX_RETRIES,
          'character network'
        )
      );
    } else {
      promises.push(Promise.resolve(null));
    }
    
    const [lorebookResult, characterNetworkResult] = await Promise.all(promises);
    
    // Generate quest after we have character and location info
    let questResult;
    if (partsToGenerate.includes('quest')) {
      questResult = await retryOperation(
        () => generateQuestInteraction(input, {
          mainCharacterName: basicInfo.mainCharacter.name,
          startingLocation: basicInfo.startingLocation
        }),
        MAX_RETRIES,
        'quest and interaction'
      );
    }
    
    // Generate world memory after we have character IDs
    let worldMemoryResult;
    if (partsToGenerate.includes('worldMemory') && characterNetworkResult) {
      const characterIds = characterNetworkResult.otherCharacters?.map((char: any) => char.id).filter(Boolean) || [];
      worldMemoryResult = await retryOperation(
        () => generateWorldMemory(input, characterIds),
        MAX_RETRIES,
        'world memory'
      );
    }
    
    // Combine all results
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
    
    console.log(`Successfully generated series details for "${input.seriesName}" in parts`);
    return fullOutput;
    
  } catch (error) {
    console.error(`Failed to generate series details for "${input.seriesName}":`, error);
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

const generateLorebookFlow = ai.defineFlow({
  name: 'generateLorebookFlow',
  inputSchema: z.object({ seriesName: z.string() }),
  outputSchema: z.object({ lorebook: LorebookSchema }),
}, async (input) => {
  const lorebookPrompt = ai.definePrompt({
    name: 'generateLorebookPrompt',
    input: { schema: z.object({ seriesName: z.string() }) },
    output: { schema: z.object({ lorebook: LorebookSchema }) },
    prompt: `Generate a comprehensive lorebook for "{{seriesName}}" with 25-50 detailed entries covering all aspects of the world. This is critical for immersion and must be specific to the series.

The lorebook must include:
1. An overall summary (2-3 paragraphs about the world)
2. 25-50 entries covering: locations, characters, events, magic systems, factions, cultures, items, etc.

Each entry needs a name, detailed description, and appropriate category. All content must be canon-accurate to "{{seriesName}}".`
  });
  
  const { output } = await lorebookPrompt(input);
  if (!output) {
    throw new Error('Failed to generate lorebook');
  }
  return output;
});

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

