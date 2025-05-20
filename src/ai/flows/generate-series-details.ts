'use server';
/**
 * @fileOverview Generates details for a fictional series.
 *
 * - generateSeriesDetails - A function that generates details about a series.
 * - GenerateSeriesDetailsInput - The input type for the generateSeriesDetails function.
 * - GenerateSeriesDetailsOutput - The return type for the generateSeriesDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSeriesDetailsInputSchema = z.object({
  seriesName: z.string().describe('The name of the fictional series (e.g., "Re:Zero", "Star Wars", "Harry Potter").'),
});
export type GenerateSeriesDetailsInput = z.infer<typeof GenerateSeriesDetailsInputSchema>;

const GenerateSeriesDetailsOutputSchema = z.object({
  seriesTitle: z.string().describe("The official title of the series."),
  mainCharacter: z.object({
    name: z.string().describe("The name of the main character."),
    description: z.string().describe("A brief description of the main character, their role, and key traits."),
  }).describe("Details about the main protagonist of the series."),
  lorebook: z.string().describe("A summary of the series' lore, including key world-building elements, major plot points, and unique concepts. Should be 2-3 paragraphs."),
  otherCharacters: z.array(
    z.object({
      name: z.string().describe("The name of an important supporting or side character."),
      description: z.string().describe("A brief description of this character and their significance to the series."),
    })
  ).min(3).max(5).describe("A list of 3 to 5 other notable characters from the series (e.g., companions, antagonists, key figures)."),
  initialPromptForPlayer: z.string().describe("A compelling question or scenario to present to the player to start their interaction within this series, now that they have the context. e.g., 'You find yourself standing before [Main Character's Name]. What do you say or do?' or 'The [Key Location from Lorebook] unfolds before you. How do you proceed?'")
});
export type GenerateSeriesDetailsOutput = z.infer<typeof GenerateSeriesDetailsOutputSchema>;

export async function generateSeriesDetails(input: GenerateSeriesDetailsInput): Promise<GenerateSeriesDetailsOutput> {
  return generateSeriesDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSeriesDetailsPrompt',
  input: {schema: GenerateSeriesDetailsInputSchema},
  output: {schema: GenerateSeriesDetailsOutputSchema},
  prompt: `You are an expert on fictional series and universes. Your task is to provide a comprehensive overview of a given series.
Based on the series name "{{seriesName}}", please generate the following:

1.  **Series Title**: The official title of the series.
2.  **Main Character**:
    *   Name: The full name of the primary protagonist.
    *   Description: A concise summary of who they are, their main role in the story, key personality traits, and any iconic abilities or characteristics.
3.  **Lorebook**: A rich summary (aim for 2-3 substantial paragraphs) of the series' lore. This should cover:
    *   The primary setting (world, universe).
    *   Key concepts, factions, or magical systems if applicable.
    *   A brief overview of the main plot or central conflict.
    *   Any unique elements that define the series.
4.  **Other Characters**: A list of 3 to 5 other important characters. For each character:
    *   Name: Their full name.
    *   Description: A brief description of their role, relationship to the main character or plot, and key traits.
5.  **Initial Prompt for Player**: A compelling question or scenario to present to the player to kickstart their interaction with this series. This should not be a question *to* the main character, but rather a general prompt for the player who is about to interact with this world/character. For example: "You find yourself standing before [Main Character's Name]. What do you say or do?" or "The [Key Location from Lorebook] unfolds before you. How do you proceed?"

Please ensure the information is accurate and captures the essence of the series. Adhere strictly to the requested JSON output schema.
`,
});

const generateSeriesDetailsFlow = ai.defineFlow(
  {
    name: 'generateSeriesDetailsFlow',
    inputSchema: GenerateSeriesDetailsInputSchema,
    outputSchema: GenerateSeriesDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI failed to generate series details.");
    }
    return output;
  }
);
