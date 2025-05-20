
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
import { QuestSchema } from '@/types'; // Import the Quest schema from types

const GenerateSeriesDetailsInputSchema = z.object({
  seriesName: z.string().describe('The name of the fictional series (e.g., "Re:Zero", "Star Wars", "Harry Potter").'),
});
export type GenerateSeriesDetailsInput = z.infer<typeof GenerateSeriesDetailsInputSchema>;

const GenerateSeriesDetailsOutputSchema = z.object({
  seriesTitle: z.string().describe("The official title of the series."),
  mainCharacter: z.object({
    name: z.string().describe("The name of the main character."),
    description: z.string().describe("A brief description of the main character, their role, and key traits."),
    stats: z.object({
      strength: z.string().describe("A descriptive or numerical value for the character's physical strength (e.g., 'Average', 'Immense', '10/20'). Be creative and thematic to the series."),
      dexterity: z.string().describe("A descriptive or numerical value for the character's agility and reflexes."),
      intelligence: z.string().describe("A descriptive or numerical value for the character's intellect and knowledge."),
      magicPower: z.string().optional().describe("A descriptive or numerical value for the character's magical aptitude or power level, if applicable to the series. Use 'N/A' if not applicable."),
      luck: z.string().optional().describe("A descriptive or numerical value for the character's fortune or luck."),
      specialAbility: z.string().optional().describe("A brief description of a notable special ability or unique trait, if any (e.g., 'Return by Death', 'The Force Sensitivity').")
    }).describe("Key thematic stats or attributes of the main character. These should be fitting for the series and character. Use descriptive terms, thematic ratings, or 'N/A' where appropriate, rather than just plain numbers if it doesn't fit the series' style.")
  }).describe("Details about the main protagonist of the series, including thematic stats."),
  lorebook: z.string().describe("A summary of the series' lore, including key world-building elements, major plot points, and unique concepts. Should be 2-3 paragraphs."),
  otherCharacters: z.array(
    z.object({
      name: z.string().describe("The name of an important supporting or side character."),
      description: z.string().describe("A brief description of this character and their significance to the series."),
    })
  ).min(3).max(5).describe("A list of 3 to 5 other notable characters from the series (e.g., companions, antagonists, key figures)."),
  initialInventory: z.array(z.string()).optional().describe("A list of 2-3 thematic starting items for the main character. e.g., ['Old Sword', 'Healing Potion', 'Map Fragment']."),
  startingLocation: z.string().optional().describe("The initial named location where the story or player interaction begins within this series. e.g., 'Lugnica Capital Market', 'Hogwarts Great Hall', 'Tatooine Desert Unknown Quarter'.").default("An Unknown Location"),
  initialQuest: QuestSchema.omit({ id: true, status: true }).optional().describe("An initial main quest for the player, fitting the series' beginning and the main character's perspective. This quest should guide the player's first actions."),
  initialPromptForPlayer: z.string().describe("A compelling question or scenario to present to the player to start their interaction within this series, now that they have the context. This should naturally lead into or relate to the initialQuest. e.g., 'You find yourself standing before [Main Character's Name]. What do you say or do?' or 'The [Key Location from Lorebook] unfolds before you. How do you proceed?'")
});
export type GenerateSeriesDetailsOutput = z.infer<typeof GenerateSeriesDetailsOutputSchema>;

export async function generateSeriesDetails(input: GenerateSeriesDetailsInput): Promise<GenerateSeriesDetailsOutput> {
  const output = await generateSeriesDetailsFlow(input);
   // Manually add a unique ID and default status to the quest if it exists
  if (output.initialQuest) {
    return {
      ...output,
      initialQuest: {
        // Spread the AI-generated quest content first
        ...(output.initialQuest as Omit<import('@/types').Quest, 'id' | 'status'>), 
        id: `quest-init-${Date.now()}`, // Then add/override system-managed fields
        status: 'active',
      },
    };
  }
  return output;
}

const prompt = ai.definePrompt({
  name: 'generateSeriesDetailsPrompt',
  input: {schema: GenerateSeriesDetailsInputSchema},
  output: {schema: GenerateSeriesDetailsOutputSchema},
  prompt: `You are an expert on fictional series and universes. Your task is to provide a comprehensive overview of a given series, including an initial main quest that aligns with the series' beginning from the main character's perspective.
Based on the series name "{{seriesName}}", please generate the following:

1.  **Series Title**: The official title of the series.
2.  **Main Character**:
    *   Name: The full name of the primary protagonist.
    *   Description: A concise summary of who they are, their main role in the story, key personality traits, and any iconic abilities or characteristics.
    *   Stats: Provide thematic stats for this character. Examples include Strength, Dexterity, Intelligence, Magic Power (if applicable, otherwise "N/A"), Luck, and a Special Ability. Use descriptive terms (e.g., 'Above Average', 'Cunning', 'Boundless') or thematic ratings rather than just numbers if it better fits the series. Ensure these stats are consistent with the character's portrayal in the series.
3.  **Lorebook**: A rich summary (aim for 2-3 substantial paragraphs) of the series' lore. This should cover:
    *   The primary setting (world, universe).
    *   Key concepts, factions, or magical systems if applicable.
    *   A brief overview of the main plot or central conflict.
    *   Any unique elements that define the series.
4.  **Other Characters**: A list of 3 to 5 other important characters. For each character:
    *   Name: Their full name.
    *   Description: A brief description of their role, relationship to the main character or plot, and key traits.
5.  **Initial Inventory**: A list of 2-3 thematic starting items for the main character. If none are obviously fitting, provide a generic useful item like 'Traveler's Rations' or 'A Worn Pouch with a Few Coins'.
6.  **Starting Location**: The specific, named location where the player's interaction within this series will begin. This should be a recognizable place if the series is well-known, from the main character's point of view at the story's start. Default to 'An Unknown Location' if really unsure.
7.  **Initial Quest**: Generate an engaging starting quest for the main character. This quest should:
    *   Have a clear **title**.
    *   Include a **description** that sets the scene from the main character's perspective at the very beginning of the series.
    *   List 2-3 actionable **objectives**.
    *   Suggest thematic **rewards**.
    This quest should be the player's first major goal.
8.  **Initial Prompt for Player**: A compelling question or scenario to present to the player to kickstart their interaction. This prompt should naturally tie into the 'Starting Location' and the 'Initial Quest'. For example: "You awaken in [Starting Location]. [Briefly reiterate quest's core problem from description]. What is your first move?"

Please ensure the information is accurate and captures the essence of the series. Adhere strictly to the requested JSON output schema.
Ensure the Initial Quest is compelling and provides clear direction for the player as the main character.
`,
});

const generateSeriesDetailsFlow = ai.defineFlow(
  {
    name: 'generateSeriesDetailsFlow',
    inputSchema: GenerateSeriesDetailsInputSchema,
    outputSchema: GenerateSeriesDetailsOutputSchema, // The AI generates content matching this schema
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to generate series details.");
    }
    return output;
  }
);
