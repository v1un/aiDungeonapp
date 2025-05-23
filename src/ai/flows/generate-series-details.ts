'use server';
/**
 * @fileOverview Generates details for a fictional series in multiple parts for better reliability and caching.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { LorebookSchema } from '@/types';
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
  const now = Date.now();
  
  // Set startTime only on the very first call or when restarting
  const startTime = currentGenerationProgress?.startTime && currentGenerationProgress.status !== 'failed'
    ? currentGenerationProgress.startTime
    : now;

  currentGenerationProgress = {
    step,
    totalSteps,
    currentStep,
    status,
    details,
    startTime,
    ...(status === 'complete' || status === 'failed' ? { endTime: now } : {})
  };

  const progressPercent = Math.floor((currentStep / totalSteps) * 100);
  console.log(
    `[Generation Progress] ${progressPercent}% - Step ${currentStep}/${totalSteps}: ${step} - ${status}${details ? ` (${details})` : ''}`
  );
}

// Function to get current generation progress
export async function getGenerationProgress(): Promise<GenerationProgress | null> {
  return currentGenerationProgress;
}

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
  initialPromptForPlayer: z.string().describe("The initial game message presented to the player. Must be written in the exact narrative style and tone of the original series. Should include series-specific terminology, cultural references, and atmospheric elements that immediately establish the authentic world. Format: Immersive multi-paragraph narrative from MC's perspective, character introduction using series terminology, internal monologue matching character's established personality, clear 'What do you do?' call to action, 3-5 distinct choices using series-appropriate language, optional concluding remark in series tone, status line with series-accurate location/time format.")
});

// Schema for world memory
const WorldMemorySchema = z.object({
  worldMemory: z.object({
    globalEvents: z.array(
      z.object({
        content: z.string().describe("Canon-accurate description of a world event from the series"),
        timestamp: z.number().describe("When this event occurred (Unix timestamp or series-relative time)"),
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
  initialInventory: z.array(z.string()).optional().describe("A list of 2-3 thematic starting items for the main character, directly relevant to their situation at the very beginning of the series.").default([]),
  startingLocation: z.string().optional().describe("The specific, named location where the story or player interaction begins, from the main character's perspective at the series' outset.").default("An Unfamiliar Place"),
  initialQuest: z.object({
    title: z.string().describe('The title of the generated quest.'),
    description: z.string().describe('A detailed description of the generated quest from the main character\'s perspective.'),
    objectives: z.array(z.string()).min(2).max(4).describe('A list of 2-4 clear, actionable objectives for the quest.'),
    rewards: z.array(z.string()).min(1).max(3).describe('A list of 1-3 thematic rewards for completing the quest (e.g., item, information, new contact).'),
    id: z.string().describe("A unique identifier for the quest.").default(() => `quest-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    status: z.enum(['active', 'completed', 'failed']).describe("The current status of the quest.").default('active')
  }).describe("An initial main quest. This quest must be an *immediate* challenge or goal for the main character, directly stemming from their `startingLocation` and initial predicament."),
  initialPromptForPlayer: z.string().describe("The initial game message presented to the player. Must be written in the exact narrative style and tone of the original series. Should include series-specific terminology, cultural references, and atmospheric elements that immediately establish the authentic world."),
  worldMemory: z.object({
    globalEvents: z.array(
      z.object({
        content: z.string().describe("Canon-accurate description of a world event from the series"),
        timestamp: z.number().describe("When this event occurred (Unix timestamp or series-relative time)"),
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
  // Caching is disabled for now due to server/client compatibility issues
  // TODO: Implement server-side caching solution
  
  const result = await generateBasicSeriesInfoFlow({ seriesName: input.seriesName });
  return result;
}

export async function generateLorebook(input: Pick<GenerateSeriesDetailsInput, 'seriesName' | 'useCache'>): Promise<{ lorebook: z.infer<typeof LorebookSchema> }> {
  // Caching is disabled for now due to server/client compatibility issues
  // TODO: Implement server-side caching solution
  
  const result = await importedGenerateLorebookFlow({ seriesName: input.seriesName });
  return result;
}

export async function generateCharacterNetwork(
  input: Pick<GenerateSeriesDetailsInput, 'seriesName' | 'useCache'>,
  mainCharacterName: string
): Promise<z.infer<typeof CharacterNetworkSchema>> {
  // Caching is disabled for now due to server/client compatibility issues
  // TODO: Implement server-side caching solution
  
  const result = await generateCharacterNetworkFlow({ 
    seriesName: input.seriesName,
    mainCharacterName 
  });
  
  // Process characters with IDs and relationships
  const processedResult = processCharacterNetwork(result, mainCharacterName);
  return processedResult;
}

export async function generateQuestInteraction(
  input: Pick<GenerateSeriesDetailsInput, 'seriesName' | 'useCache'>,
  context: { mainCharacterName: string; startingLocation: string }
): Promise<z.infer<typeof QuestInteractionSchema>> {
  // Caching is disabled for now due to server/client compatibility issues
  // TODO: Implement server-side caching solution
  
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
  
  return processedResult;
}

export async function generateWorldMemory(
  input: Pick<GenerateSeriesDetailsInput, 'seriesName' | 'useCache'>,
  characterIds: string[]
): Promise<z.infer<typeof WorldMemorySchema>> {
  // Caching is disabled for now due to server/client compatibility issues
  // TODO: Implement server-side caching solution
  
  const result = await generateWorldMemoryFlow({ 
    seriesName: input.seriesName,
    characterIds 
  });
  
  return result;
}

// Main generation function that orchestrates all parts
export async function generateSeriesDetails(input: GenerateSeriesDetailsInput): Promise<GenerateSeriesDetailsOutput> {
  const MAX_RETRIES = 3;
  const partsToGenerate = input.parts || ['basic', 'lorebook', 'characters', 'quest', 'worldMemory'];
  const totalSteps = partsToGenerate.length + 1; // Parts + finishing step

  // Initialize progress
  updateGenerationProgress('Starting generation...', totalSteps, 0, 'pending', `Preparing to generate ${partsToGenerate.length} parts.`);

  try {
    console.log(`Generating series details for "${input.seriesName}" in ${partsToGenerate.length} parts using batched approach`);
    
    let currentStepNumber = 1;
    
    // Generate basic info first (always required as it's needed by other parts)
    let basicInfo: z.infer<typeof BasicSeriesInfoSchema>;
    
    if (partsToGenerate.includes('basic')) {
      console.log(`[${currentStepNumber}/${partsToGenerate.length}] Generating basic info for "${input.seriesName}"...`);
      updateGenerationProgress('Generating basic info', totalSteps, currentStepNumber, 'in-progress');
      
      basicInfo = await retryOperation(
        () => generateBasicSeriesInfo(input),
        MAX_RETRIES,
        'basic series info'
      );
      
      console.log(`Basic info for "${input.seriesName}" generated successfully: ${basicInfo.seriesTitle}, ${basicInfo.mainCharacter.name}`);
      currentStepNumber++;
    } else {
      // If basic is not in parts but other parts need it, generate it anyway
      if (partsToGenerate.some(part => ['characters', 'quest'].includes(part))) {
        console.log(`Generating basic info (required dependency) for "${input.seriesName}"...`);
        basicInfo = await retryOperation(
          () => generateBasicSeriesInfo(input),
          MAX_RETRIES,
          'basic series info'
        );
      } else {
        throw new Error("Basic series info is required for generating characters or quests but was not included in partsToGenerate.");
      }
    }

    // Initialize result containers
    let lorebookResult: { lorebook: z.infer<typeof LorebookSchema> } | null = null;
    let characterNetworkResult: z.infer<typeof CharacterNetworkSchema> | null = null;
    let questResult: z.infer<typeof QuestInteractionSchema> | null = null;
    let worldMemoryResult: z.infer<typeof WorldMemorySchema> | null = null;
    
    // Generate lorebook
    if (partsToGenerate.includes('lorebook')) {
      console.log(`[${currentStepNumber}/${partsToGenerate.length}] Generating lorebook for "${input.seriesName}"...`);
      updateGenerationProgress('Generating lorebook', totalSteps, currentStepNumber, 'in-progress');
      
      lorebookResult = await retryOperation(
        () => generateLorebook(input),
        MAX_RETRIES,
        'lorebook'
      );
      
      console.log(`Lorebook for "${input.seriesName}" generated successfully with ${lorebookResult?.lorebook?.entries?.length || 0} entries`);
      currentStepNumber++;
      
      if (currentStepNumber <= partsToGenerate.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Generate character network
    if (partsToGenerate.includes('characters')) {
      console.log(`[${currentStepNumber}/${partsToGenerate.length}] Generating character network for "${input.seriesName}"...`);
      updateGenerationProgress('Generating character network', totalSteps, currentStepNumber, 'in-progress', `Using MC: ${basicInfo.mainCharacter.name}`);
      
      characterNetworkResult = await retryOperation(
        () => generateCharacterNetwork(input, basicInfo.mainCharacter.name),
        MAX_RETRIES,
        'character network'
      );
      
      console.log(`Character network for "${input.seriesName}" generated successfully with ${characterNetworkResult?.otherCharacters?.length || 0} characters`);
      currentStepNumber++;
      
      if (currentStepNumber <= partsToGenerate.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Generate quest
    if (partsToGenerate.includes('quest')) {
      console.log(`[${currentStepNumber}/${partsToGenerate.length}] Generating initial quest for "${input.seriesName}"...`);
      updateGenerationProgress('Generating initial quest', totalSteps, currentStepNumber, 'in-progress');
      
      questResult = await retryOperation(
        () => generateQuestInteraction(input, { 
          mainCharacterName: basicInfo.mainCharacter.name, 
          startingLocation: basicInfo.startingLocation || "An Unfamiliar Place" 
        }),
        MAX_RETRIES,
        'initial quest'
      );
      
      console.log(`Initial quest "${questResult?.initialQuest?.title}" generated for "${input.seriesName}".`);
      currentStepNumber++;
      
      if (currentStepNumber <= partsToGenerate.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Generate world memory
    if (partsToGenerate.includes('worldMemory')) {
      console.log(`[${currentStepNumber}/${partsToGenerate.length}] Generating world memory for "${input.seriesName}"...`);
      updateGenerationProgress('Generating world memory', totalSteps, currentStepNumber, 'in-progress');
      
      const characterIdsForWorldMemory = characterNetworkResult?.otherCharacters?.map(c => c.id || c.name) || [];
      if (basicInfo.mainCharacter.name) {
        characterIdsForWorldMemory.unshift(basicInfo.mainCharacter.name);
      }
      
      worldMemoryResult = await retryOperation(
        () => generateWorldMemory(input, characterIdsForWorldMemory),
        MAX_RETRIES,
        'world memory'
      );
      
      console.log(`World memory generated for "${input.seriesName}".`);
      currentStepNumber++;
      
      if (currentStepNumber <= partsToGenerate.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Finalize
    updateGenerationProgress('Finalizing generation...', totalSteps, totalSteps, 'in-progress', 'All selected parts processed.');
    
    // Construct the final output object
    const finalOutput: GenerateSeriesDetailsOutput = {
      seriesTitle: basicInfo.seriesTitle,
      mainCharacter: basicInfo.mainCharacter,
      initialInventory: basicInfo.initialInventory || [],
      startingLocation: basicInfo.startingLocation || "An Unfamiliar Place",
      lorebook: lorebookResult ? lorebookResult.lorebook : { entries: [], overallSummary: "Lorebook not generated." },
      otherCharacters: characterNetworkResult ? characterNetworkResult.otherCharacters : [],
      relationships: characterNetworkResult ? characterNetworkResult.relationships : { main: [] },
      initialQuest: questResult ? questResult.initialQuest : { 
        title: "No Quest", 
        description: "Initial quest not generated.", 
        objectives: [], 
        rewards: [], 
        id: "none", 
        status: "active" as const
      },
      initialPromptForPlayer: questResult ? questResult.initialPromptForPlayer : "Setup incomplete.",
      worldMemory: worldMemoryResult ? worldMemoryResult.worldMemory : undefined
    };

    updateGenerationProgress('Generation complete', totalSteps, totalSteps, 'complete');

    return finalOutput;
  } catch (error) {
    console.error('Failed to generate series details:', error);
    updateGenerationProgress(
      'Generation failed', 
      totalSteps, 
      currentGenerationProgress?.currentStep || 0,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error; 
  }
}

// Define CharacterResult interface for type checking character network results
interface CharacterResult {
  otherCharacters: Array<{
    name: string;
    description: string;
    id?: string;
    isPermanent?: boolean;
    firstEncountered?: number;
    lastInteraction?: number;
    memoryEntries?: Array<{
      content: string;
      timestamp: number;
      importance: number;
    }>;
  }>;
  relationships?: {
    main?: Array<{
      characterId: string;
      characterName: string;
      type: string;
      intensity: number;
      description: string;
      history: Array<{
        event: string;
        impact: number;
        timestamp: number;
      }>;
    }>;
    additionalCharacters?: Array<{
      characterId: string;
      relationships: Array<{
        characterId: string;
        characterName: string;
        type: string;
        intensity: number;
        description: string;
        history: Array<{
          event: string;
          impact: number;
          timestamp: number;
        }>;
      }>;
    }>;
  };
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
      const result = await operation();
      
      // Validate results for various operations
      if (typeof result === 'object' && result !== null) {
        // For character network operation
        if (operationName === 'character network') {
          const characterResult = result as unknown as CharacterResult;
          
          // Check if result has the required structure
          if ('otherCharacters' in characterResult && Array.isArray(characterResult.otherCharacters)) {
            // Apply fixes if relationships are missing or invalid
            if (!characterResult.relationships || !characterResult.relationships.main) {
              console.log(`Fixing missing relationships in ${operationName} result`);
              const safeCharacterResult: CharacterResult = {
                otherCharacters: characterResult.otherCharacters.map(char => ({
                  ...char,
                  isPermanent: char.isPermanent ?? true,
                })),
                relationships: {
                  main: [],
                  additionalCharacters: []
                }
              };
              return processCharacterNetwork(safeCharacterResult, 'Main Character') as T;
            }
            
            // Check if each relationship has the required fields
            if (characterResult.relationships.main && Array.isArray(characterResult.relationships.main)) {
              let needsFix = false;
              
              for (const rel of characterResult.relationships.main) {
                if (!rel.type || typeof rel.intensity !== 'number' || !rel.history || 
                    (Array.isArray(rel.history) && rel.history.length > 0 && 
                     (typeof rel.history[0].impact !== 'number' || 
                      rel.history[0].impact < -5 || rel.history[0].impact > 5 ||
                      !rel.history[0].timestamp))) {
                  needsFix = true;
                  break;
                }
              }
              
              if (needsFix) {
                console.log(`Fixing incomplete relationships in ${operationName} result`);
                return processCharacterNetwork(characterResult, 'Main Character') as T;
              }
            }
          }
        }
      }
      
      return result;
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
  result: CharacterResult,
  mainCharacterName: string
): z.infer<typeof CharacterNetworkSchema> {
  if (!result.otherCharacters?.length) {
    return {
      otherCharacters: [],
      relationships: {
        main: [],
        additionalCharacters: []
      }
    };
  }
  
  // Process characters with IDs and memory entries
  const processedCharacters = result.otherCharacters.map((character, index) => {
    const characterId = character.id || `char-${Date.now()}-${Math.random().toString(36).substring(2, 5)}-${index}`;
    
    return {
      ...character,
      id: characterId,
      isPermanent: character.isPermanent ?? true,
      firstEncountered: character.firstEncountered || Date.now(),
      lastInteraction: character.lastInteraction || Date.now(),
      memoryEntries: character.memoryEntries || [{
        content: `Initial appearance in the story. ${character.description}`,
        timestamp: Date.now(),
        importance: 8
      }]
    };
  });
  
  // Prepare relationships object if it doesn't exist
  const relationships = result.relationships || { main: [] };
  
  // Build relationships if they don't exist or need to be updated with processed character IDs
  let mainRelationships: Array<{
    characterId: string;
    characterName: string;
    type: string;
    intensity: number;
    description: string;
    history: Array<{
      event: string;
      impact: number;
      timestamp: number;
    }>;
  }> = [];
  
  if (relationships.main && relationships.main.length > 0) {
    // Update existing relationships with processed character IDs
    mainRelationships = relationships.main.map((rel, index) => {
      const matchingCharacter = processedCharacters.find(c => c.name === rel.characterName);
      const characterId = matchingCharacter?.id || rel.characterId || `char-unknown-${index}`;
      
      // Ensure all required fields are present and valid
      return {
        characterId,
        characterName: rel.characterName,
        type: rel.type || determineInitialRelationshipType(matchingCharacter?.description || ""),
        intensity: typeof rel.intensity === 'number' && rel.intensity >= 1 && rel.intensity <= 10 
                  ? rel.intensity 
                  : determineInitialRelationshipIntensity(matchingCharacter?.description || ""),
        description: rel.description || generateInitialRelationshipDescription(mainCharacterName, rel.characterName, matchingCharacter?.description || ""),
        history: Array.isArray(rel.history) && rel.history.length > 0
                ? rel.history.map(h => ({
                    event: h.event,
                    impact: typeof h.impact === 'number' ? Math.max(-5, Math.min(5, h.impact)) : 0,
                    timestamp: h.timestamp || Date.now()
                  }))
                : [{
                    event: "Initial encounter based on narrative setup",
                    impact: 0,
                    timestamp: Date.now()
                  }]
      };
    });
  } else {
    // Create new relationships for all characters if none exist
    mainRelationships = processedCharacters.map(character => ({
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
  }
  
  // Create additional character relationships if they don't exist
  let additionalCharacterRelationships = relationships.additionalCharacters || [];
  
  if (additionalCharacterRelationships.length === 0) {
    additionalCharacterRelationships = processedCharacters.map(character => ({
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
  }
  
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
  
  return 'acquaintance';
}

function determineInitialRelationshipIntensity(characterDescription: string): number {
  const description = characterDescription.toLowerCase();
  
  if (description.includes('close') || description.includes('best') || 
      description.includes('loyal') || description.includes('devoted') ||
      description.includes('lifelong') || description.includes('trusted')) {
    return 8;
  }
  
  if (description.includes('friend') || description.includes('ally') ||
      description.includes('partner') || description.includes('companion')) {
    return 6;
  }
  
  if (description.includes('arch') || description.includes('sworn') ||
      description.includes('mortal') || description.includes('greatest') ||
      description.includes('nemesis')) {
    return 9;
  }
  
  if (description.includes('enemy') || description.includes('rival') ||
      description.includes('antagonist') || description.includes('foe')) {
    return 7;
  }
  
  if (description.includes('acquaintance') || description.includes('recently met') ||
      description.includes('new')) {
    return 3;
  }
  
  return 5;
}

function generateInitialRelationshipDescription(character1Name: string, character2Name: string, contextDescription: string): string {
  const type = determineInitialRelationshipType(contextDescription);
  
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
    prompt: `You are a master world-builder and narrative architect specializing in creating immersive, canon-authentic experiences for "{{seriesName}}". Your primary directive is to ensure every piece of generated content is **strictly coherent** with the established lore, characters, tone, and unique elements of the "{{seriesName}}" universe.

🎯 **MISSION**: Create the foundational elements for an epic interactive adventure that captures the **authentic essence** of "{{seriesName}}" from the very first moment. All outputs must be deeply rooted in and reflective of "{{seriesName}}".

📚 **SERIES FOCUS**: "{{seriesName}}"

🌟 **QUALITY STANDARDS**: Every element must feel like it could seamlessly exist within the original "{{seriesName}}" narrative. Think: "If the original creator saw this, would they approve?"

Generate these core elements:

🏛️ **SERIES TITLE**: The exact, canonical title as it appears officially

👤 **MAIN CHARACTER**: 
- **Name**: Full canonical name of the protagonist
- **Rich Description**: 2-3 sentences that capture their **essence at series start**. Include:
  * Core personality traits that drive their actions
  * Internal conflicts or fears they face
  * Signature abilities/traits that define them early on
  * Use **markdown** for emphasis (**bold** for key traits, *italics* for inner thoughts)
- **Thematic Stats**: Descriptive values that capture their nature:
  * Strength: Their physical/mental fortitude (e.g., "Overwhelmingly Determined", "Fragile but Resilient")
  * Dexterity: Agility/reflexes (e.g., "Surprisingly Quick-Witted", "Clumsy but Lucky")
  * Intelligence: Mental acuity (e.g., "Street Smart", "Analytical Genius", "Naive but Intuitive")
  * Magic Power: Magical aptitude if applicable (e.g., "Untapped Potential", "Completely Mundane", "Instinctive Mastery")
  * Luck: Fortune tendencies (e.g., "Catastrophically Unlucky", "Divinely Blessed", "Ironically Fortunate")
  * Special Ability: Key unique trait (e.g., "Return by Death - Temporal reset upon death", "Force Sensitivity - Untrained but powerful")

🎒 **INITIAL INVENTORY**: 2-3 items the protagonist would **actually have** at the series beginning:
- Items that establish their original circumstances
- Objects with potential story significance
- Nothing overpowered - authentic starting condition

🗺️ **STARTING LOCATION**: The **specific place** where the protagonist's journey truly begins:
- Use the exact location name from "{{seriesName}}" if canonical
- Rich, atmospheric description that sets the scene
- Should feel like stepping into the opening scene of the series

Focus on **authenticity over creativity**. If you're unsure about a detail, lean toward what would be most consistent with the established "{{seriesName}}" canon and tone.`
  });
  
  const { output } = await basicPrompt(input);
  if (!output) {
    throw new Error('Failed to generate basic series info');
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
    prompt: `Generate 3-5 important characters from "{{seriesName}}" who are relevant early in the series, along with their relationships to {{mainCharacterName}}. Your response **must** be strictly coherent with the established canon of "{{seriesName}}".

For each character provide:
1. Full name and description (1-2 sentences), reflecting their portrayal in "{{seriesName}}".
2. Their role/relationship to the main character, as established in "{{seriesName}}".
3. Their defining traits and early goals, consistent with their character in "{{seriesName}}".

For each relationship, you MUST include ALL of the following properties:
- characterId: A unique identifier for the character
- characterName: The character's name
- type: The type of relationship (must be one of: ally, enemy, family, mentor, student, lover, business, acquaintance)
- intensity: Intensity of the relationship on a scale of 1-10
- description: Description of the relationship
- history: At least one historical event that shaped this relationship, including:
  * event: Description of the event
  * impact: How this event affected the relationship (numeric value between -5 and +5)
  * timestamp: When this event occurred (Unix timestamp)

Focus on characters who appear early in "{{seriesName}}" and are important to the initial story setup. Ensure all details are authentic to the "{{seriesName}}" universe.`
  });
  
  const { output } = await characterPrompt(input);
  if (!output) {
    throw new Error('Failed to generate character network');
  }
  
  // Ensure all required fields are present in the generated output
  if (output.relationships?.main) {
    output.relationships.main = output.relationships.main.map(rel => {
      return {
        characterId: rel.characterId || `char-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        characterName: rel.characterName,
        type: rel.type || determineInitialRelationshipType(output.otherCharacters.find(c => c.name === rel.characterName)?.description || ""),
        intensity: rel.intensity || determineInitialRelationshipIntensity(output.otherCharacters.find(c => c.name === rel.characterName)?.description || ""),
        description: rel.description || generateInitialRelationshipDescription(input.mainCharacterName, rel.characterName, output.otherCharacters.find(c => c.name === rel.characterName)?.description || ""),
        history: (rel.history && rel.history.length > 0) ? 
          rel.history.map(h => ({
            event: h.event,
            impact: Math.max(-5, Math.min(5, h.impact)),
            timestamp: h.timestamp || Date.now()
          })) : [{
            event: "Initial encounter based on narrative setup",
            impact: 0,
            timestamp: Date.now()
          }]
      };
    });
  } else {
    const relationships = {
      main: output.otherCharacters.map(character => ({
        characterId: character.id || `char-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        characterName: character.name,
        type: determineInitialRelationshipType(character.description),
        intensity: determineInitialRelationshipIntensity(character.description),
        description: generateInitialRelationshipDescription(input.mainCharacterName, character.name, character.description),
        history: [{
          event: "Initial encounter based on narrative setup",
          impact: 0,
          timestamp: Date.now()
        }]
      }))
    };
    output.relationships = relationships;
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
    prompt: `🎭 You are a **Master Series Expert and Opening Scene Architect** with **complete mastery of "{{seriesName}}"** who creates opening experiences indistinguishable from the original work.

🌟 **ABSOLUTE SERIES AUTHENTICITY MANDATE**:
Every element must be so perfectly aligned with "{{seriesName}}" that it could be the official opening of a new story arc. This is your highest priority.

**CHARACTER**: {{mainCharacterName}}
**STARTING LOCATION**: {{startingLocation}}

🎯 **YOUR MISSION**: Create an initial quest and immersive opening that captures the **exact essence** of "{{seriesName}}" from the very first word.

✨ **SERIES AUTHENTICITY REQUIREMENTS**:

📜 **INITIAL QUEST DESIGN**:
- **Title**: Use "{{seriesName}}" naming conventions and terminology
- **Description**: Written in the **exact narrative voice** of "{{seriesName}}"
- **Objectives**: Must be achievable within the series' established world rules
- **Rewards**: Only canonical items/knowledge that exist in "{{seriesName}}"

🎨 **INITIAL PLAYER MESSAGE** (CRITICAL COMPONENT):
This is the player's first impression - it MUST be **flawlessly authentic** to "{{seriesName}}":

**🌟 OPENING STRUCTURE**:
1. **Series-Themed Greeting**: 
   - Use "🌟 Welcome to the World of {{seriesName}} 🌟" or series-appropriate variant
   - Must feel like stepping into the original work

2. **Immersive Opening Scene** (3-4 paragraphs):
   - **Series-authentic atmosphere**: Capture the unique mood and tone of "{{seriesName}}"
   - **Canon-accurate sensory details**: Sights, sounds, smells that belong in this world
   - **Character-authentic perspective**: {{mainCharacterName}}'s exact personality and thought patterns
   - **World-accurate elements**: Only use technology, magic, culture that exists in "{{seriesName}}"
   - **Series-specific contrasts**: If isekai/transition, reference canonical source world elements

3. **Character Introduction**:
   - State {{mainCharacterName}}'s name using series-appropriate context
   - Reference their canonical background, personality traits, or circumstances
   - Use **exact terminology** from "{{seriesName}}" universe

4. **Internal Monologue**:
   - Must match {{mainCharacterName}}'s established personality perfectly
   - Use their canonical speech patterns and thought processes
   - Reference series-appropriate concerns, knowledge, or confusion
   - Include *italicized thoughts* that sound like the character

5. **Call to Action**:
   - Clear, engaging "What do you do?" in the series' style
   - Should flow naturally from the established scene

6. **Player Choices** (3-5 options):
   - Format: \`[Choice text]\`
   - Each choice must be **achievable within series rules**
   - Use series-appropriate language and concepts
   - Reference canonical actions or approaches the character would consider

7. **Concluding Remark** (optional):
   - Brief sentence that sets the adventure tone
   - Must match "{{seriesName}}" narrative style perfectly

8. **Status Line**:
   - Format: \`Current Status: [condition] | Location: {{startingLocation}} | Time: [period]\`
   - Use series-accurate location naming and time systems
   - Condition should reflect canonical character state

🚫 **SERIES AUTHENTICITY VIOLATIONS TO AVOID**:
- Generic fantasy/sci-fi elements not specific to "{{seriesName}}"
- Character behavior inconsistent with canon personality
- Technology or magic beyond series limitations
- Cultural elements that contradict established lore
- Non-canonical terminology or place names
- Dialogue that doesn't match character's established voice

🎯 **QUALITY VERIFICATION**:
Ask yourself: "Would the original creator of '{{seriesName}}' approve of this as an authentic opening scene?"

💡 **RESEARCH REQUIREMENTS**:
- **Character Authenticity**: {{mainCharacterName}}'s exact personality, background, and circumstances at series start
- **World Accuracy**: Precise details about {{startingLocation}} and its characteristics in "{{seriesName}}"
- **Cultural Consistency**: Social norms, customs, and expectations in the series world
- **Power System Rules**: Exact limitations and mechanics of abilities in "{{seriesName}}"
- **Narrative Style**: The specific tone, pacing, and voice used in the original work

✨ **REMEMBER**: You're not creating inspired-by content - you're seamlessly continuing "{{seriesName}}" with perfect authenticity. Every word should feel like it belongs in the original work.`
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
    prompt: `Generate world-level memories and global events for "{{seriesName}}" that involve the characters with IDs: {{characterIds}}. All generated content **must be strictly coherent** with the established lore, timeline, and atmosphere of the "{{seriesName}}" universe.

Create global events that:
1. Are significant to the world of "{{seriesName}}".
2. Involve the main characters where appropriate, consistent with their roles in "{{seriesName}}".
3. Set up the current state of the world as depicted in "{{seriesName}}".
4. Are **canon-accurate** to the "{{seriesName}}" series. Do not invent new lore unless explicitly part of a non-canon scenario (which is not the case here).

Each event should have a description, timestamp (relative to series events if absolute is unknown), involved characters, location, and importance rating, all grounded in "{{seriesName}}" details.`
  });
  
  const { output } = await memoryPrompt(input);
  if (!output) {
    throw new Error('Failed to generate world memory');
  }
  return output;
});