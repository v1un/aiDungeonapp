'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { WorldDetailSchema, WorldDetail } from '@/ai/lorebook-schemas'; // Correct import for WorldDetail type

// Input Schema
const GenerateWorldDetailsInputSchema = z.object({
  seriesTitle: z.string().describe("The title of the fictional series."),
  playerWorldContext: z.string().describe("The player's initial description or context about the world."),
});
export type GenerateWorldDetailsInput = z.infer<typeof GenerateWorldDetailsInputSchema>;

// Output Schema is WorldDetailSchema (type is WorldDetail) imported from lorebook-schemas

const generateWorldDetailsPrompt = ai.definePrompt({
  name: 'generateWorldDetailsPrompt',
  input: { schema: GenerateWorldDetailsInputSchema },
  output: { schema: WorldDetailSchema },
  prompt: `You are a master world-builder and lore historian for the fictional universe of "{{seriesTitle}}".
The player has provided an initial concept for their experience within this universe:
"{{{playerWorldContext}}}"

Your task is to expand dramatically on this player-provided context to create a richer, more detailed foundation for their adventure. Generate the following world details, ensuring they are thematically consistent with "{{seriesTitle}}" and the player's initial context:

1.  **Overall Setting Description**: Provide a comprehensive paragraph describing the world's atmosphere, primary themes (e.g., gritty survival, high fantasy, political intrigue, cosmic horror), and any unique, defining characteristics or technologies/magic systems.
2.  **Key Historical Events**: Detail 3 to 5 pivotal historical events that have significantly shaped the current state of this world. For each event, briefly describe what happened and its lasting impact.
3.  **Major Geographical Areas**: Describe 2 to 3 major continents, distinct regions, or significant geographical areas. For each, include its typical climate, key features, and perhaps a hint of its inhabitants or importance.
4.  **Cultural Norms**: Outline 2 to 3 significant cultural norms, widespread traditions, or common societal structures that characters in this world would likely encounter or live by.

Ensure all generated content is creative, engaging, and provides a solid foundation for storytelling.`,
});

export async function generateWorldDetails(input: GenerateWorldDetailsInput): Promise<WorldDetail> {
  const { output } = await generateWorldDetailsPrompt(input);
  if (!output) {
    // This case should ideally be handled by Genkit's error handling or schema validation,
    // but a manual check provides an explicit error.
    throw new Error("AI failed to generate world details or the output was empty.");
  }
  return output;
}

// Optional: Define and export the Genkit flow if you want to run it using Genkit's CLI or other tools.
// This is not strictly required if you only call generateWorldDetails() directly.
export const generateWorldDetailsFlow = ai.defineFlow(
  {
    name: 'generateWorldDetailsFlow',
    inputSchema: GenerateWorldDetailsInputSchema,
    outputSchema: WorldDetailSchema,
  },
  async (input) => {
    return generateWorldDetails(input); // Calls the function above
  }
);
