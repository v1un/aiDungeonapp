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

const GenerateSeriesDetailsInputSchema = z.object({
  seriesName: z.string().describe('The name of the fictional series (e.g., "Re:Zero", "Star Wars", "Harry Potter").'),
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
  return fullOutput;
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

3.  **Lorebook**: This is crucial for immersion. Generate a structured lorebook:
    *   **Overall Summary**: (1-2 paragraphs) Briefly describe the series' world, its primary conflict, and central themes.
    *   **Entries**: Generate 10-20 detailed \\\`LoreEntry\\\` objects. Each entry needs a \\\`name\\\`, a \\\`description\\\` (2-4 sentences, use markdown), and a \\\`category\\\`.
        *   Distribute entries across diverse, relevant categories such as:
            *   'Key Locations': (e.g., specific cities, important landmarks, mystical realms)
            *   'Important NPCs': (e.g., allies, mentors, early antagonists not covered in 'Other Characters')
            *   'Historical Events': (e.g., past wars, founding events, prophecies that shape the present)
            *   'Magic Systems & Unique Technologies': (e.g., how magic works, who uses it, key technologies)
            *   'Factions & Organizations': (e.g., guilds, kingdoms, secret societies, their goals)
            *   'Creatures & Races': (e.g., non-human species, significant beasts)
            *   'Cultural Notes': (e.g., customs, societal norms, beliefs)
            *   'Important Items & Artifacts': (e.g., legendary weapons, key plot devices)
        *   Ensure descriptions are informative and engaging.

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
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to generate series details.");
    }
    return output;
  }
);

