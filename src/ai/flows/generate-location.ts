'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { 
  LocationSchema, 
  TypedLocation, 
  WorldDetailSchema, // Used in GenerateLocationInputSchema
  WorldDetail // Type for worldDetails
} from '@/ai/lorebook-schemas';

// Input Schema: Defines the structure for the input to the generateLocation function
export const GenerateLocationInputSchema = z.object({
  seriesTitle: z.string().describe("The title of the fictional series."),
  worldDetails: WorldDetailSchema.describe("Key details about the world to ensure the location fits in."),
  locationConcept: z.string().describe("A brief concept or idea for the location. This could be a name, a type of place, or a theme."),
});
export type GenerateLocationInput = z.infer<typeof GenerateLocationInputSchema>;

// Genkit Prompt Definition
const generateLocationPrompt = ai.definePrompt({
  name: 'generateLocationPrompt',
  input: { schema: GenerateLocationInputSchema }, // Input for the prompt execution
  output: { schema: LocationSchema }, // AI is expected to generate data matching LocationSchema (without the 'type' field)
  prompt: `You are an expert cartographer and environmental storyteller for the universe of "{{seriesTitle}}".
The established world context is as follows:
Overall Setting: {{{worldDetails.overallSettingDescription}}}
Major Geographical Areas:
{{#each worldDetails.majorGeographicalAreas}}
- {{{this}}}
{{/each}}
Key Historical Events:
{{#each worldDetails.keyHistoricalEvents}}
- {{{this}}}
{{/each}}

The initial concept for this location is: "{{{locationConcept}}}"

Your task is to develop a detailed profile for this location. Generate the following:
- **Name**: A fitting and evocative name for the location.
- **Description**: A detailed description (2-3 paragraphs) covering the location's atmosphere, prominent features (terrain, architecture, flora, fauna), and general ambiance. Mention if it's part of any larger geographical area described above.
- **Historical Significance (Optional)**: Briefly describe any historical importance or past events specifically associated with this location. This might tie into the Key Historical Events provided.
- **Points of Interest**: List 2-3 specific, notable points of interest within or about this location (e.g., an ancient ruin, a unique natural wonder, a specific building, a dangerous zone).
- **Related World Events (Optional)**: Mention 1-2 events from the Key Historical Events list that this location was directly involved in or significantly affected by, explaining the connection.

Ensure the location feels authentic to "{{seriesTitle}}" and the world details, offering rich potential for exploration, discovery, or as a setting for events.`,
});

// AI Flow Function
export async function generateLocation(input: GenerateLocationInput): Promise<TypedLocation> {
  console.log(`[generateLocation] Called with input:`, {
    seriesTitle: input.seriesTitle,
    locationConcept: input.locationConcept,
    worldDetailsSummary: input.worldDetails.overallSettingDescription.substring(0, 50) + "..." // Log summary
  });

  const { output } = await generateLocationPrompt(input);

  if (!output) {
    console.error("[generateLocation] AI failed to generate location details or the output was empty.");
    throw new Error("AI failed to generate location details.");
  }

  // Add the 'type' field to conform to TypedLocationSchema
  const typedOutput: TypedLocation = { ...output, type: 'location' };
  
  console.log(`[generateLocation] Generated typed location:`, typedOutput.name);
  return typedOutput;
}

// Optional: Define and export the Genkit flow if you want to run it using Genkit's CLI or other tools.
export const generateLocationFlow = ai.defineFlow(
  {
    name: 'generateLocationFlow',
    inputSchema: GenerateLocationInputSchema,
    outputSchema: TypedLocationSchema, // The final output of this flow is TypedLocation
  },
  async (input) => {
    return generateLocation(input); // Calls the function above
  }
);
