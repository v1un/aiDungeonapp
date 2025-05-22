'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { 
  WorldDetailSchema, 
  TypedFactionSchema, 
  TypedLocationSchema 
} from '@/ai/lorebook-schemas'; // Import new schemas

// Updated Input Schema
const GenerateCharacterInputSchema = z.object({
  characterConcept: z
    .string()
    .describe(
      'A brief description of the character concept the player has in mind.'
    ),
  seriesTitle: z
    .string()
    .describe(
      'The title of the fictional series the character belongs to.'
    ),
  worldContext: z
    .string()
    .describe(
      "A summary of the player's initial input about the world/universe the character exists within."
    ),
  worldDetails: WorldDetailSchema.optional().describe("Optional: Detailed generated information about the world's setting, history, geography, and culture."),
  factions: z.array(TypedFactionSchema).optional().describe("Optional: A list of generated factions operating within the world."),
  locations: z.array(TypedLocationSchema).optional().describe("Optional: A list of generated significant locations in the world."),
});
export type GenerateCharacterInput = z.infer<typeof GenerateCharacterInputSchema>;

// Output Schema remains unchanged
const GenerateCharacterOutputSchema = z.object({
  name: z.string().describe('The name of the character.'),
  backstory: z.string().describe('A detailed backstory for the character.'),
  stats: z
    .object({
      strength: z.number().describe('The strength stat of the character.'),
      dexterity: z.number().describe('The dexterity stat of the character.'),
      constitution: z
        .number()
        .describe('The constitution stat of the character.'),
      intelligence: z
        .number()
        .describe('The intelligence stat of the character.'),
      wisdom: z.number().describe('The wisdom stat of the character.'),
      charisma: z.number().describe('The charisma stat of the character.'),
    })
    .describe('The core stats of the character.'),
  skills: z.array(z.string()).describe('A list of skills the character possesses.'),
});
export type GenerateCharacterOutput = z.infer<typeof GenerateCharacterOutputSchema>;

export async function generateCharacter(input: GenerateCharacterInput): Promise<GenerateCharacterOutput> {
  // Log a summary of what's being passed, especially the optional fields
  console.log("[generateCharacter] Called with input:", {
    seriesTitle: input.seriesTitle,
    characterConcept: input.characterConcept,
    worldContextProvided: !!input.worldContext,
    worldDetailsProvided: !!input.worldDetails,
    factionsProvidedCount: input.factions?.length || 0,
    locationsProvidedCount: input.locations?.length || 0,
  });
  
  const { output } = await generateCharacterPrompt(input);
  if (!output) {
    console.error("[generateCharacter] AI failed to generate character or the output was empty.");
    throw new Error("AI failed to generate character details.");
  }
  return output;
}

const generateCharacterPrompt = ai.definePrompt({
  name: 'generateCharacterPrompt',
  input: { schema: GenerateCharacterInputSchema },
  output: { schema: GenerateCharacterOutputSchema },
  prompt: `You are a world-class character creation expert and storyteller for the fictional universe of "{{{seriesTitle}}}".
Your goal is to generate a deeply compelling character based on the player's concept, making them feel instantly integrated into the provided world context.

Series: {{{seriesTitle}}}
Player's Initial World Context: {{{worldContext}}}
Player's Character Concept: {{{characterConcept}}}

**Additionally, consider the following detailed information about the world, if provided:**

{{#if worldDetails}}
**Comprehensive World Details:**
- Overall Setting: {{{worldDetails.overallSettingDescription}}}
- Key Historical Events: {{#each worldDetails.keyHistoricalEvents}}- {{{this}}} {{/each}}
- Major Geographical Areas: {{#each worldDetails.majorGeographicalAreas}}- {{{this}}} {{/each}}
- Cultural Norms: {{#each worldDetails.culturalNorms}}- {{{this}}} {{/each}}
{{/if}}

{{#if factions}}
**Key Factions in the World:**
{{#each factions}}
- **{{{name}}}**: {{{description}}} (Goals: {{#each goals}}{{{this}}}; {{/each}})
{{/each}}
{{/if}}

{{#if locations}}
**Notable Locations:**
{{#each locations}}
- **{{{name}}}**: {{{description}}}
{{/each}}
{{/if}}

**Your Detailed Task (Continued):**
When crafting the character, especially their backstory, relationships, and adventure hooks:
*   Draw inspiration from and directly reference elements from the **Comprehensive World Details**, **Key Factions**, and **Notable Locations** listed above, if they were provided.
*   For instance, the character could have a past experience in one of the locations, a connection (positive or negative) to one of the factions, or their personal goals might align or clash with the described world events or cultural norms.
*   The "Invented Lore Connections" part of the backstory should now try to link to these *specific* generated entities if possible, or create new minor ones if more suitable.

Create a character with the following attributes:

1.  **Name**: A name that stylistically matches naming conventions in "{{{seriesTitle}}}".
2.  **Backstory (Rich and Detailed)**:
    *   Craft a multi-paragraph backstory (at least 3-4 paragraphs).
    *   **Deeply integrate elements from the "Player's Initial World Context"**: Weave specific details, themes, or events from \`{{{worldContext}}}\` into the character's history, personal motivations, and relationships.
    *   **Utilize Detailed Context**: If **Comprehensive World Details**, **Key Factions**, or **Notable Locations** are provided, incorporate specific elements from them into the character's story. This is crucial for grounding the character in the richer, generated world.
    *   **Invent Lore Connections**: Based on all available context (\`{{{worldContext}}}\`, and the detailed generated lore if provided), invent and incorporate 2-3 unique, minor lore elements directly impacting the character. These could be things like:
        *   A small, local faction they have ties to or conflict with (potentially one of the provided **Key Factions** or a new minor one).
        *   A specific, lesser-known location significant to their past (could be one of the **Notable Locations** or a new one).
        *   A past event they were part of or affected by, not of series-wide scale but personally important (could relate to **Key Historical Events** or be more personal).
        *   A recurring local mystery or legend they are aware of or involved with.
        *   A notable non-canonical NPC (e.g., a mentor, rival, contact) who has shaped them.
    *   **Adventure Hooks**: The backstory must include 1-2 unresolved issues, pressing personal goals, or potential conflicts that can serve as immediate starting points for the character's adventures or interactions. These should ideally also connect to the provided context.
3.  **Stats**: Core stats (strength, dexterity, constitution, intelligence, wisdom, charisma) as numbers from 1-10, reflecting their capabilities relative to others in "{{{seriesTitle}}}", consistent with their backstory and concept.
4.  **Skills**: A list of 3-5 key skills or recognized talents relevant in the world of "{{{seriesTitle}}}", fitting their background.
5.  **Character's Immediate Perspective**: Include 1-2 sentences describing the character's immediate goals or their current perspective on the situation described in \`{{{worldContext}}}\` and any relevant generated world details.
6.  **Authenticity**: Ensure the character would believably exist in this world, could interact with canonical characters, and that their description incorporates setting-specific terminology, cultural references, and thematic elements from "{{{seriesTitle}}}", drawing from all provided context.

Produce a character that is not just a collection of stats and a name, but a living entity with a history and a future within the specified world.`,
});

// Genkit Flow Definition (no changes needed here, it uses the updated schema and prompt)
export const generateCharacterFlow = ai.defineFlow(
  {
    name: 'generateCharacterFlow',
    inputSchema: GenerateCharacterInputSchema,
    outputSchema: GenerateCharacterOutputSchema,
  },
  async input => {
    // The main generateCharacter function now handles the logging and direct prompt call.
    // This flow definition can simply call that.
    return generateCharacter(input);
  }
);
