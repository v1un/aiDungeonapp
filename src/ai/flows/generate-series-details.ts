
'use server';
/**
 * @fileOverview Generates details for a fictional series, including an initial quest.
 *
 * - generateSeriesDetails - A function that generates details about a series.
 * - GenerateSeriesDetailsInput - The input type for the generateSeriesDetails function.
 * - GenerateSeriesDetailsOutput - The return type for the generateSeriesDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { QuestSchema, type Quest } from '@/types'; // Import the Quest schema and type from types

const GenerateSeriesDetailsInputSchema = z.object({
  seriesName: z.string().describe('The name of the fictional series (e.g., "Re:Zero", "Star Wars", "Harry Potter").'),
});
export type GenerateSeriesDetailsInput = z.infer<typeof GenerateSeriesDetailsInputSchema>;

const GenerateSeriesDetailsOutputSchema = z.object({
  seriesTitle: z.string().describe("The canonical, official title of the series."),
  mainCharacter: z.object({
    name: z.string().describe("The full name of the primary protagonist."),
    description: z.string().describe("A detailed description of the main character, focusing on their personality, core motivations, iconic abilities/traits relevant at the series' start, and perhaps a key internal conflict they face early on. Should be 2-3 sentences."),
    stats: z.object({
      strength: z.string().describe("A thematic or descriptive value for the character's physical strength (e.g., 'Average', 'Overwhelmingly Powerful', 'Weak but Resilient'). Be creative and true to the series."),
      dexterity: z.string().describe("A thematic or descriptive value for the character's agility, reflexes, or nimbleness."),
      intelligence: z.string().describe("A thematic or descriptive value for the character's intellect, knowledge, or cunning."),
      magicPower: z.string().optional().describe("A thematic or descriptive value for magical aptitude, if applicable. Use 'N/A' if not, or describe its nature (e.g., 'Untapped Potential', 'Master of Elemental Magic')."),
      luck: z.string().optional().describe("A thematic or descriptive value for the character's fortune or typical luck (e.g., 'Cursed', 'Surprisingly Fortunate', 'Average')."),
      specialAbility: z.string().optional().describe("A concise description of a notable special ability or unique trait pivotal to the character, especially early in the series (e.g., 'Return by Death - Resets time upon death', 'Force Sensitivity - Untrained').")
    }).describe("Key thematic stats or attributes. These should be fitting and descriptive, reflecting the character's portrayal at the beginning of the series.")
  }).describe("Detailed information about the main protagonist."),
  lorebook: z.string().describe("A comprehensive summary of the series' lore (target 3-5 detailed paragraphs). It should cover: 1. The primary world/setting (key regions, general atmosphere/mood). 2. Prevalent magic systems, unique technologies, or supernatural elements (how they generally work, who uses them, limitations). 3. Major factions, organizations, or societal structures relevant early in the series (their general aims or influence). 4. A brief mention of 1-2 pivotal historical events or background elements that directly shape the series' starting conditions. 5. The central conflict or overarching themes of the series."),
  otherCharacters: z.array(
    z.object({
      name: z.string().describe("The full name of an important supporting character, antagonist, or key figure present or relevant early in the series."),
      description: z.string().describe("A brief description (1-2 sentences) of this character, their relationship to the main character (if any), their primary goal/role at the series' start, and a defining trait."),
    })
  ).min(3).max(5).describe("A list of 3 to 5 other notable characters crucial to the initial stages of the series."),
  initialInventory: z.array(z.string()).optional().describe("A list of 2-3 thematic starting items for the main character, directly relevant to their situation at the very beginning of the series. e.g., ['Tattered Clothes', 'A Mysterious Locket', 'Empty Water Canteen']. If none, can be an empty array or omit.").default([]),
  startingLocation: z.string().optional().describe("The specific, named location where the story or player interaction begins, from the main character's perspective at the series' outset. e.g., 'A Dusty Alley in the Lower District of Lugnica', 'Inside the Millennium Falcon Cockpit', 'The Forbidden Forest Edge'. Default to 'An Unfamiliar Place' if truly ambiguous for the series start.").default("An Unfamiliar Place"),
  initialQuest: QuestSchema.omit({ id: true, status: true }).describe("An initial main quest. This quest must be an *immediate* challenge or goal for the main character, directly stemming from their `startingLocation` and initial predicament as described in `initialPromptForPlayer`. It should guide the player's very first actions."),
  initialPromptForPlayer: z.string().describe("A compelling, direct question or immediate choice to present to the player to start their interaction. This prompt should seamlessly flow from the `startingLocation` and the `initialQuest` description, putting the player in the MC's shoes. e.g., 'The alley is dark, and the thugs are closing in on the silver-haired girl. What do you shout, or what is your first move?' or 'The escape pod has crashed. Alarms are blaring. Your first priority is...? What do you do?'")
}).describe("Comprehensive details generated for a fictional series to set up an RPG-like experience.");
export type GenerateSeriesDetailsOutput = z.infer<typeof GenerateSeriesDetailsOutputSchema>;

export async function generateSeriesDetails(input: GenerateSeriesDetailsInput): Promise<GenerateSeriesDetailsOutput> {
  const output = await generateSeriesDetailsFlow(input);
  // Ensure initialQuest, if it exists in the output, gets a proper ID and status
  if (output.initialQuest) {
    return {
      ...output,
      initialQuest: {
        ...(output.initialQuest as Omit<Quest, 'id' | 'status'>), // Cast to ensure we have the right base type
        id: `quest-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        status: 'active',
      },
    };
  }
  return output; // Return output directly if no initialQuest
}

const prompt = ai.definePrompt({
  name: 'generateSeriesDetailsPrompt',
  input: {schema: GenerateSeriesDetailsInputSchema},
  output: {schema: GenerateSeriesDetailsOutputSchema},
  prompt: `You are an expert world-builder and narrative designer for immersive text-based RPGs. Your task is to generate a rich and detailed starting point for a game set in the universe of "{{seriesName}}".

Adhere strictly to the JSON output schema provided.

Key Generation Guidelines:

1.  **Series Title**: Provide the canonical, official title.
2.  **Main Character**:
    *   **Name**: The protagonist's full name.
    *   **Description**: (2-3 sentences) Focus on their personality, core motivations, and iconic abilities/traits *as they are at the very beginning of the series*. Mention any key internal conflict if relevant to their initial state.
    *   **Stats**: Provide thematic, *descriptive* stats (Strength, Dexterity, Intelligence, Magic Power, Luck, Special Ability). Examples: Strength could be 'Surprisingly Strong for their build' or 'Physically Frail'. Magic Power could be 'Latent and Untapped' or 'Adept at Basic Spells'. Special Ability should be concise and impactful, e.g., 'Return by Death - Resets timeline upon demise' or 'Precognitive Flashes - Brief, unreliable glimpses of the future'.
3.  **Lorebook**: (Target 3-5 detailed paragraphs) This is crucial for immersion. It MUST cover:
    *   **Primary World/Setting**: Describe the key region(s) where the story begins, the general atmosphere (e.g., grim, wondrous, technologically advanced but decaying).
    *   **Magic Systems/Unique Tech**: Explain any prevalent magic, psionics, advanced technology, or unique supernatural phenomena. How do they generally work? Who can use them? What are their societal impacts or limitations?
    *   **Major Factions/Organizations**: Briefly introduce 1-2 major factions, guilds, governments, or significant groups that are relevant to the main character or the starting area of the series. What are their general aims or influence?
    *   **Pivotal History**: Briefly mention 1-2 key historical events or background lore points that directly shape the world's state or the main character's situation at the start of the series.
    *   **Central Conflict/Themes**: Hint at the overarching conflict or the central themes that drive the series.
4.  **Other Characters**: (3-5 characters) For each:
    *   **Name**: Full name.
    *   **Description**: (1-2 sentences) Their relationship to the MC (if any at the start), their primary goal or role *in the initial stages of the series*, and one defining personality trait.
5.  **Initial Inventory**: (2-3 items) List items the MC would realistically have on them at the *very beginning* of the series. These should be thematic. (e.g., for Subaru: 'Convenience Store Bag with Snacks', 'Cellphone (No Signal)', 'Tracksuit').
6.  **Starting Location**: Be specific and descriptive. This is where the MC finds themselves *immediately* as the series kicks off from their perspective. (e.g., 'A bustling, unfamiliar marketplace in Lugnica', 'The cold, sterile hallway of a derelict starship').
7.  **Initial Quest**:
    *   **Title**: Captivating and relevant.
    *   **Description**: (From MC's POV) Set the scene based on \\\`startingLocation\\\`. What is the *immediate* problem, goal, or mystery facing the MC? This should lead directly into the \\\`initialPromptForPlayer\\\`.
    *   **Objectives**: 2-3 clear, actionable first steps the MC needs to take.
    *   **Rewards**: Thematic, initial rewards (can be information, a small item, safety, etc.).
    This quest MUST be the player's first major goal, directly tied to the initial situation.
8.  **Initial Prompt for Player**: A direct, engaging question or choice. This is the hook. It must seamlessly follow the \\\`startingLocation\\\` and \\\`initialQuest\\\` description. (e.g., "You see the thugs cornering the girl. Your heart pounds. Do you shout to distract them, try to sneak closer, or something else? What's your immediate action?").

Ensure all generated content is consistent with the "{{seriesName}}" canon, particularly its initial stages. The goal is to make the player feel like they are truly stepping into the shoes of the main character at the beginning of their journey.
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

