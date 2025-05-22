'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { 
  FactionSchema, 
  TypedFaction, 
  WorldDetailSchema, // Used in GenerateFactionInputSchema
  WorldDetail // Type for worldDetails
} from '@/ai/lorebook-schemas';

// Input Schema: Defines the structure for the input to the generateFaction function
export const GenerateFactionInputSchema = z.object({
  seriesTitle: z.string().describe("The title of the fictional series."),
  worldDetails: WorldDetailSchema.describe("Key details about the world to ensure the faction fits in."),
  factionConcept: z.string().describe("A brief concept or idea for the faction. This could be a name, a role, or a theme."),
});
export type GenerateFactionInput = z.infer<typeof GenerateFactionInputSchema>;

// Genkit Prompt Definition
const generateFactionPrompt = ai.definePrompt({
  name: 'generateFactionPrompt',
  input: { schema: GenerateFactionInputSchema }, // Input for the prompt execution
  output: { schema: FactionSchema }, // AI is expected to generate data matching FactionSchema (without the 'type' field)
  prompt: `You are a skilled narrative designer and political strategist creating a compelling faction for the universe of "{{seriesTitle}}".
The established world context is as follows:
Overall Setting: {{{worldDetails.overallSettingDescription}}}
Key Historical Events:
{{#each worldDetails.keyHistoricalEvents}}
- {{{this}}}
{{/each}}
Cultural Norms:
{{#each worldDetails.culturalNorms}}
- {{{this}}}
{{/each}}

The initial concept for this faction is: "{{{factionConcept}}}"

Your task is to develop a detailed profile for this faction. Generate the following:
- **Name**: A fitting name for the faction.
- **Description**: A detailed description (2-3 paragraphs) covering the faction's origins, core beliefs, common practices, and overall role or reputation in the world.
- **Goals**: 2-3 primary, actionable goals or objectives of the faction.
- **Leader (Optional)**: The name of a known leader or a key influential figure, if applicable. If so, a brief note on their style.
- **Allies (Names Only)**: List 0-2 potential allied factions or groups by name (these can be other factions you might invent or generic concepts for now).
- **Enemies (Names Only)**: List 0-2 potential rival factions or groups by name.
- **Related World Events (Optional)**: Mention 1-2 events from the Key Historical Events list above that this faction was significantly involved in or shaped by, explaining their connection.

Ensure the faction feels authentic to the "{{seriesTitle}}" and the provided world details, and that the \`factionConcept\` is well-explored. The faction should offer clear potential for storytelling, conflict, or alliance.`,
});

// AI Flow Function
export async function generateFaction(input: GenerateFactionInput): Promise<TypedFaction> {
  console.log(`[generateFaction] Called with input:`, {
    seriesTitle: input.seriesTitle,
    factionConcept: input.factionConcept,
    worldDetailsSummary: input.worldDetails.overallSettingDescription.substring(0, 50) + "..." // Log summary
  });

  const { output } = await generateFactionPrompt(input);

  if (!output) {
    console.error("[generateFaction] AI failed to generate faction details or the output was empty.");
    throw new Error("AI failed to generate faction details.");
  }

  // Add the 'type' field to conform to TypedFactionSchema
  const typedOutput: TypedFaction = { ...output, type: 'faction' };
  
  console.log(`[generateFaction] Generated typed faction:`, typedOutput.name);
  return typedOutput;
}

// Optional: Define and export the Genkit flow if you want to run it using Genkit's CLI or other tools.
export const generateFactionFlow = ai.defineFlow(
  {
    name: 'generateFactionFlow',
    inputSchema: GenerateFactionInputSchema,
    outputSchema: TypedFactionSchema, // The final output of this flow is TypedFaction
  },
  async (input) => {
    return generateFaction(input); // Calls the function above
  }
);
