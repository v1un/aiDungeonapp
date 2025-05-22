'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { WorldDetailSchema, WorldDetail } from '@/ai/lorebook-schemas'; // Import the schema

// Input Schema
const GenerateWorldDetailsInputSchema = z.object({
  seriesTitle: z.string().describe("The title of the fictional series."),
  playerWorldContext: z.string().describe("The player's initial description or context about the world."),
});
export type GenerateWorldDetailsInput = z.infer<typeof GenerateWorldDetailsInputSchema>;

// Placeholder implementation
export async function generateWorldDetails(input: GenerateWorldDetailsInput): Promise<WorldDetail> {
  console.log(`[STUB] generateWorldDetails called with:`, input);
  // Mock data matching WorldDetailSchema
  const mockWorldDetails: WorldDetail = {
    overallSettingDescription: `A vast and varied world for ${input.seriesTitle}, shaped by the player's initial ideas: ${input.playerWorldContext}. It features towering mountains, sprawling forests, and ancient ruins. Magic is common but often dangerous.`,
    keyHistoricalEvents: [
      "The Great Upheaval - A cataclysmic event that reshaped continents.",
      "The Sundering of the Three Kingdoms - A major political war.",
      "The First Mage Rebellion - When mages fought for their rights."
    ],
    majorGeographicalAreas: [
      "The Dragon's Tooth Mountains",
      "Whispering Woods",
      "Sunken City of Aethel"
    ],
    culturalNorms: [
      "Ancestor worship is common in the northern tribes.",
      "A yearly festival of lights celebrates the end of the dark season.",
      "Duels of honor are still practiced in some remote regions."
    ]
  };
  return Promise.resolve(mockWorldDetails);
}

// Genkit Flow (optional for stub, but good for structure)
const generateWorldDetailsFlow = ai.defineFlow(
  {
    name: 'generateWorldDetailsFlow',
    inputSchema: GenerateWorldDetailsInputSchema,
    outputSchema: WorldDetailSchema,
  },
  async (input) => {
    // In a real implementation, this would call an AI model with a prompt.
    // For now, it directly calls our placeholder function.
    return generateWorldDetails(input);
  }
);

// Prompt definition (for future use, not strictly needed for stub)
const prompt = ai.definePrompt({
  name: 'generateWorldDetailsPrompt',
  input: { schema: GenerateWorldDetailsInputSchema },
  output: { schema: WorldDetailSchema },
  prompt: `You are a world-building assistant. Based on the series title "{{seriesTitle}}" and the player's initial context "{{playerWorldContext}}", expand this into a richer world.
  
  Provide details for:
  - Overall Setting Description
  - Key Historical Events
  - Major Geographical Areas
  - Cultural Norms

  Present the output in the structured format defined by WorldDetailSchema.
  Example - Overall Setting Description: A brief paragraph giving a general feel of the world.
  Example - Key Historical Events: A list of 2-4 significant past events.
  Example - Major Geographical Areas: A list of 2-4 important regions or landmarks.
  Example - Cultural Norms: A list of 2-4 common societal practices.
  `,
});

// To make the flow runnable (optional for stub)
// export async function runGenerateWorldDetailsFlow(input: GenerateWorldDetailsInput): Promise<WorldDetail> {
//   return generateWorldDetailsFlow(input);
// }
