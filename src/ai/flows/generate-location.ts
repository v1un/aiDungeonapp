'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { LocationSchema, Location, WorldDetail, WorldDetailSchema, TypedLocationSchema, TypedLocation } from '@/ai/lorebook-schemas'; // Import schemas

// Input Schema
const GenerateLocationInputSchema = z.object({
  seriesTitle: z.string().describe("The title of the fictional series."),
  worldDetails: WorldDetailSchema.describe("Key details about the world to ensure the location fits in."),
  locationConcept: z.string().describe("A brief concept or idea for the location provided by the player or system."),
});
export type GenerateLocationInput = z.infer<typeof GenerateLocationInputSchema>;

// Placeholder implementation
export async function generateLocation(input: GenerateLocationInput): Promise<TypedLocation> {
  console.log(`[STUB] generateLocation called with:`, input);
  // Mock data matching LocationSchema
  const mockLocation: TypedLocation = {
    type: 'location', // Added type for TypedLocationSchema
    name: `The Lost Temple of ${input.locationConcept} in ${input.seriesTitle}`,
    description: `An ancient and mysterious temple, hidden deep within the ${input.worldDetails.majorGeographicalAreas[0] || 'unknown regions'}. It's rumored to hold secrets related to '${input.locationConcept}'.`,
    historicalSignificance: `Believed to be a site of power during the ${input.worldDetails.keyHistoricalEvents[0] || 'early ages'}.`,
    pointsOfInterest: [
      "The Collapsed Entrance",
      "The Oracle's Chamber (sealed)",
      "Glyph-covered Walls"
    ],
    relatedWorldEvents: input.worldDetails.keyHistoricalEvents.slice(1,2) // Relate to the second historical event if available
  };
  return Promise.resolve(mockLocation);
}

// Genkit Flow (optional for stub, but good for structure)
const generateLocationFlow = ai.defineFlow(
  {
    name: 'generateLocationFlow',
    inputSchema: GenerateLocationInputSchema,
    outputSchema: TypedLocationSchema, // Outputting the typed version
  },
  async (input) => {
    return generateLocation(input);
  }
);

// Prompt definition (for future use)
const prompt = ai.definePrompt({
  name: 'generateLocationPrompt',
  input: { schema: GenerateLocationInputSchema },
  output: { schema: TypedLocationSchema }, // Outputting the typed version
  prompt: `You are a location creation specialist for the world of "{{seriesTitle}}".
  World Details:
  - Setting: {{worldDetails.overallSettingDescription}}
  - Key Events: {{#each worldDetails.keyHistoricalEvents}}{{.}}, {{/each}}
  - Major Areas: {{#each worldDetails.majorGeographicalAreas}}{{.}}, {{/each}}

  Location Concept: "{{locationConcept}}"

  Based on the concept and world details, generate a location with:
  - Name
  - Description (atmosphere, notable features)
  - Historical Significance (optional)
  - Points of Interest (list)
  - Related World Events (optional list, drawn from or inspired by key historical events)
  
  Ensure the location feels like a natural part of the world. Output should conform to LocationSchema.
  Remember to include the 'type: "location"' field in the output.
  `,
});

// To make the flow runnable (optional for stub)
// export async function runGenerateLocationFlow(input: GenerateLocationInput): Promise<TypedLocation> {
//   return generateLocationFlow(input);
// }
