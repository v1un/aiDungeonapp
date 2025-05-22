'use server';
/**
 * @fileOverview Generates details for a fictional series, including an initial quest and a structured lorebook.
 *
 * - generateSeriesDetails - A function that generates details about a series.
 * - GenerateSeriesDetailsInput - The input type for the generateSeriesDetails function.
 * - GenerateSeriesDetailsOutput - The return type for the generateSeriesDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { LorebookSchema } from '@/types';
// This import is used in the client component through a dynamic import
// So it doesn't affect server-side rendering
const seriesCachePath = '@/lib/series-cache';

const GenerateSeriesDetailsInputSchema = z.object({
  seriesName: z.string().describe('The name of the fictional series (e.g., "Re:Zero", "Star Wars", "Harry Potter").'),
  useCache: z.boolean().optional().describe('Whether to use cached data as a fallback. Default is true.').default(true),
});
export type GenerateSeriesDetailsInput = z.infer<typeof GenerateSeriesDetailsInputSchema>;

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
    }).describe("Key thematic stats or attributes. These should be fitting and descriptive, reflecting the character's portrayal at the beginning of the series.")
  }).describe("Detailed information about the main protagonist."),
  lorebook: LorebookSchema.describe("A structured and comprehensive lorebook for the series."),
  otherCharacters: z.array(
    z.object({
      name: z.string().describe("The full name of an important supporting character, antagonist, or key figure present or relevant early in the series."),
      description: z.string().describe("A brief description (1-2 sentences) of this character, their relationship to the main character (if any), their primary goal/role at the series' start, and a defining trait. Use markdown for emphasis."),
    })
  ).min(3).max(5).describe("A list of 3 to 5 other notable characters crucial to the initial stages of the series."),
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
  initialPromptForPlayer: z.string().describe("A compelling, direct question or immediate choice to present to the player to start their interaction. This prompt should seamlessly flow from the `startingLocation` and the `initialQuest` description, putting the player in the MC's shoes. e.g., 'The alley is dark, and the thugs are closing in on the silver-haired girl. What do you shout, or what is your first move?' or 'The escape pod has crashed. Alarms are blaring. Your first priority is...? What do you do?' Use markdown for emphasis and atmosphere.")
}).describe("Comprehensive details generated for a fictional series to set up an RPG-like experience.");
export type GenerateSeriesDetailsOutput = z.infer<typeof GenerateSeriesDetailsOutputSchema>;

export async function generateSeriesDetails(input: GenerateSeriesDetailsInput): Promise<SeriesDetailsOutput> {
  // Maximum number of retry attempts for API errors
  const MAX_RETRIES = 2;
  let lastError: Error | null = null;
  const useCache = input.useCache !== false; // Default to true if not specified
  
  // Retry logic for handling transient API errors
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const output = await generateSeriesDetailsFlow(input);
      
      // Ensure the initialQuest, if present, gets a system-generated ID and status
      const fullOutput: SeriesDetailsOutput = { ...output };
      if (output.initialQuest) {
        fullOutput.initialQuest = {
          ...output.initialQuest, // Base properties
          id: `quest-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          status: 'active' as const,
        };
      }
      
      // Cache the successful result if we're on the client side
      if (typeof window !== 'undefined') {
        // We need to dynamically import the cache module since it's a client-side module
        try {
          const { cacheSeriesDetails } = await import(seriesCachePath);
          cacheSeriesDetails(input.seriesName, fullOutput);
        } catch (cacheError) {
          console.error('Failed to cache series details:', cacheError);
          // Continue even if caching fails
        }
      }
      
      return fullOutput;
    } catch (error) {
      lastError = error as Error;
      console.error(`Series details generation attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, error);
      
      // Check if this is a server error (5xx) from Google AI API which might be temporary
      const isTransientError = error instanceof Error && 
        (error.message.includes('500 Internal Server Error') || 
         error.message.includes('503 Service Unavailable') ||
         error.message.includes('429 Too Many Requests'));
      
      // If it's the last attempt or not a transient error, don't retry
      if (attempt === MAX_RETRIES || !isTransientError) {
        break;
      }
      
      // Wait with exponential backoff before retrying
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`Retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  // If all attempts failed and we're allowed to use cache, try to get from cache
  if (useCache && typeof window !== 'undefined') {
    try {
      const { getCachedSeriesDetails } = await import(seriesCachePath);
      const cachedDetails = getCachedSeriesDetails(input.seriesName);
      
      if (cachedDetails) {
        console.log(`Using cached series details for "${input.seriesName}" as fallback`);
        return cachedDetails as SeriesDetailsOutput;
      }
    } catch (cacheError) {
      console.error('Failed to retrieve cached series details:', cacheError);
      // Continue to error if cache retrieval fails
    }
  }
  
  // If we get here, all attempts failed and there was no cache available
  throw new Error(`Failed to generate series details after ${MAX_RETRIES + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}

// Type alias for the output of the flow before system modifications (like adding quest ID/status)
type SeriesDetailsOutput = z.infer<typeof GenerateSeriesDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'generateSeriesDetailsPrompt',
  input: {schema: GenerateSeriesDetailsInputSchema},
  output: {schema: GenerateSeriesDetailsOutputSchema},
  prompt: `You are an expert world-builder and narrative designer for immersive text-based RPGs. Your task is to generate a rich and detailed starting point for a game set in the universe of "{{seriesName}}".

Adhere strictly to the JSON output schema provided. Encourage the use of simple markdown (like **bold** for emphasis, *italics* for thoughts or nuances) in descriptive text fields.

Key Generation Guidelines:

1.  **Series Title**: Provide the canonical, official title.
2.  **Main Character**:
    *   **Name**: The protagonist's full name.
    *   **Description**: (2-3 sentences) Focus on personality, core motivations, iconic abilities/traits *at the series' beginning*. Mention key internal conflicts.
    *   **Stats**: Thematic, *descriptive* stats (Strength, Dexterity, Intelligence, Magic Power, Luck, Special Ability).

3.  **Lorebook**: This is crucial for immersion. Generate an extensive structured lorebook:
    *   **Overall Summary**: (2-3 paragraphs) Provide a comprehensive description of the series' world, its primary conflicts, central themes, and significant historical context.
    *   **Entries**: Generate 25-50 detailed \\\`LoreEntry\\\` objects, with strong emphasis on depth and variety. Each entry needs a \\\`name\\\`, a \\\`description\\\` (3-6 sentences, use markdown for formatting), and a \\\`category\\\`.
        *   Distribute entries across these expanded categories (include at least 3-5 entries per category):
            *   'Key Locations': (e.g., specific cities, important landmarks, mystical realms, dungeons, taverns, castles)
            *   'Major Regions': (e.g., countries, provinces, realms, planets, dimensions)
            *   'Important NPCs': (e.g., allies, mentors, early antagonists not covered in 'Other Characters')
            *   'Historical Events': (e.g., past wars, founding events, prophecies, catastrophes, pivotal moments)
            *   'Recent Events': (e.g., conflicts, political changes, disasters that have happened within the last few years)
            *   'Magic Systems': (e.g., how magic works, magical traditions, schools of magic, restrictions)
            *   'Technologies & Innovations': (e.g., unique technologies, scientific advancements, arcane devices)
            *   'Factions & Organizations': (e.g., guilds, kingdoms, secret societies, religious orders, military groups)
            *   'Political Landscape': (e.g., power structures, ruling systems, conflicts between powers)
            *   'Creatures & Races': (e.g., non-human species, significant beasts, monsters, mythical beings)
            *   'Cultural Notes': (e.g., customs, societal norms, beliefs, celebrations, taboos)
            *   'Religious Systems': (e.g., deities, religious practices, spiritual beliefs)
            *   'Important Items & Artifacts': (e.g., legendary weapons, key plot devices, magical items)
            *   'Natural Features': (e.g., geographic features, ecosystems, weather phenomena)
            *   'Legends & Myths': (e.g., in-world stories, folklore, prophecies) 
        *   Create entries with rich details that can be woven into gameplay narratives and player interactions.
        *   Include specific information that can be directly referenced in gameplay situations.

4.  **Other Characters**: (3-5 characters) For each:
    *   **Name**: Full name.
    *   **Description**: (1-2 sentences) Relationship to MC, initial role/goal, defining trait.

5.  **Initial Inventory**: (2-3 items) Thematic items the MC would have at the *very beginning*.

6.  **Starting Location**: Specific, descriptive location where the MC finds themselves *immediately*.

7.  **Initial Quest**:
    *   **Title**: Captivating and relevant.
    *   **Description**: (From MC's POV) Set the scene based on \\\`startingLocation\\\`. What is the *immediate* problem, goal, or mystery facing the MC? This should lead directly into the \\\`initialPromptForPlayer\\\`.
    *   **Objectives**: 2-3 clear, actionable first steps the MC needs to take.
    *   **Rewards**: Thematic, initial rewards (can be information, a small item, safety, etc.).
    This quest MUST be the player's first major goal, directly tied to the initial situation.

8.  **Initial Prompt for Player**: A direct, engaging question or choice for the player to start their interaction. This prompt MUST seamlessly flow from the \\\`startingLocation\\\` and the \\\`initialQuest\\\` description, putting the player in the MC's shoes at that very moment. (e.g., 'The alley is dark, and the thugs are closing in on the silver-haired girl. What do you shout, or what is your first move?' or 'The escape pod has crashed. Alarms are blaring. Your first priority is...? What do you do?'). Use markdown for emphasis and atmosphere.

Ensure all generated content is consistent with the "{{seriesName}}" canon, particularly its initial stages. The goal is to create a deeply immersive starting point.
`,
});

const generateSeriesDetailsFlow = ai.defineFlow(
  {
    name: 'generateSeriesDetailsFlow',
    inputSchema: GenerateSeriesDetailsInputSchema,
    outputSchema: GenerateSeriesDetailsOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        throw new Error("AI failed to generate series details.");
      }
      return output;
    } catch (error) {
      // Enhance error message with more context for better debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const enhancedError = new Error(`Error generating series details: ${errorMessage}`);
      
      // Preserve the original stack trace if available
      if (error instanceof Error && error.stack) {
        enhancedError.stack = error.stack;
      }
      
      // Log the error with the series name for debugging
      console.error(`Failed to generate series details for "${input.seriesName}":`, enhancedError);
      
      throw enhancedError;
    }
  }
);

