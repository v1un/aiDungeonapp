'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { FactionSchema, Faction, WorldDetail, WorldDetailSchema, TypedFactionSchema, TypedFaction } from '@/ai/lorebook-schemas'; // Import schemas

// Input Schema
const GenerateFactionInputSchema = z.object({
  seriesTitle: z.string().describe("The title of the fictional series."),
  worldDetails: WorldDetailSchema.describe("Key details about the world to ensure the faction fits in."),
  factionConcept: z.string().describe("A brief concept or idea for the faction provided by the player or system."),
});
export type GenerateFactionInput = z.infer<typeof GenerateFactionInputSchema>;

// Placeholder implementation
export async function generateFaction(input: GenerateFactionInput): Promise<TypedFaction> {
  console.log(`[STUB] generateFaction called with:`, input);
  // Mock data matching FactionSchema
  const mockFaction: TypedFaction = {
    type: 'faction', // Added type for TypedFactionSchema
    name: `The Shadow Syndicate of ${input.seriesTitle}`,
    description: `A secretive organization operating in the underbelly of society, inspired by '${input.factionConcept}'. They thrive in the chaos mentioned in '${input.worldDetails.overallSettingDescription.substring(0,50)}...'`,
    goals: [
      "To amass wealth and influence.",
      "To control the black markets.",
      "To remain hidden from major authorities."
    ],
    leader: "The Unseen Hand (identity unknown)",
    allies: ["The Smugglers' Guild", "Corrupt City Officials"],
    enemies: ["The Royal Guard", "The Merchant's Council"],
    relatedWorldEvents: input.worldDetails.keyHistoricalEvents.slice(0,1) // Relate to the first historical event
  };
  return Promise.resolve(mockFaction);
}

// Genkit Flow (optional for stub, but good for structure)
const generateFactionFlow = ai.defineFlow(
  {
    name: 'generateFactionFlow',
    inputSchema: GenerateFactionInputSchema,
    outputSchema: TypedFactionSchema, // Outputting the typed version
  },
  async (input) => {
    return generateFaction(input);
  }
);

// Prompt definition (for future use)
const prompt = ai.definePrompt({
  name: 'generateFactionPrompt',
  input: { schema: GenerateFactionInputSchema },
  output: { schema: TypedFactionSchema }, // Outputting the typed version
  prompt: `You are a faction creation specialist for the world of "{{seriesTitle}}".
  World Details:
  - Setting: {{worldDetails.overallSettingDescription}}
  - Key Events: {{#each worldDetails.keyHistoricalEvents}}{{.}}, {{/each}}

  Faction Concept: "{{factionConcept}}"

  Based on the concept and world details, generate a faction with:
  - Name
  - Description (history, members)
  - Goals (list)
  - Leader (optional)
  - Allies (list)
  - Enemies (list)
  - Related World Events (optional list, drawn from or inspired by key historical events)
  
  Ensure the faction feels like a natural part of the world. Output should conform to FactionSchema.
  Remember to include the 'type: "faction"' field in the output.
  `,
});

// To make the flow runnable (optional for stub)
// export async function runGenerateFactionFlow(input: GenerateFactionInput): Promise<TypedFaction> {
//   return generateFactionFlow(input);
// }
