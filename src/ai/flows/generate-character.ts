'use server';

/**
 * @fileOverview A character generation AI agent.
 *
 * - generateCharacter - A function that handles the character generation process.
 * - GenerateCharacterInput - The input type for the generateCharacter function.
 * - GenerateCharacterOutput - The return type for the generateCharacter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
      'A summary of the world/universe the character exists within.'
    ),
});
export type GenerateCharacterInput = z.infer<typeof GenerateCharacterInputSchema>;

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
  return generateCharacterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCharacterPrompt',
  input: {schema: GenerateCharacterInputSchema},
  output: {schema: GenerateCharacterOutputSchema},
  prompt: `You are a world-class character creation expert and storyteller for the fictional universe of "{{{seriesTitle}}}".
Your goal is to generate a deeply compelling character based on the player's concept, making them feel instantly integrated into the provided world context.

Series: {{{seriesTitle}}}
Player's World Context & Initial Lore: {{{worldContext}}}
Player's Character Concept: {{{characterConcept}}}

Your detailed task is to create a character with the following attributes:

1.  **Name**: A name that stylistically matches naming conventions in "{{{seriesTitle}}}".
2.  **Backstory (Rich and Detailed)**:
    *   Craft a multi-paragraph backstory (at least 3-4 paragraphs).
    *   **Deeply integrate elements from the "Player's World Context & Initial Lore"**: Weave specific details, themes, or events from \`{{{worldContext}}}\` into the character's history, personal motivations, and relationships.
    *   **Invent Lore Connections**: Based on \`{{{worldContext}}}\`, invent and incorporate 2-3 unique, minor lore elements directly impacting the character. These could be things like:
        *   A small, local faction they have ties to or conflict with.
        *   A specific, lesser-known location significant to their past.
        *   A past event they were part of or affected by, not of series-wide scale but personally important.
        *   A recurring local mystery or legend they are aware of or involved with.
        *   A notable non-canonical NPC (e.g., a mentor, rival, contact) who has shaped them.
    *   **Adventure Hooks**: The backstory must include 1-2 unresolved issues, pressing personal goals, or potential conflicts that can serve as immediate starting points for the character's adventures or interactions.
3.  **Stats**: Core stats (strength, dexterity, constitution, intelligence, wisdom, charisma) as numbers from 1-10, reflecting their capabilities relative to others in "{{{seriesTitle}}}", consistent with their backstory and concept.
4.  **Skills**: A list of 3-5 key skills or recognized talents relevant in the world of "{{{seriesTitle}}}", fitting their background.
5.  **Character's Immediate Perspective**: Include 1-2 sentences describing the character's immediate goals or their current perspective on the situation described in \`{{{worldContext}}}\`.
6.  **Authenticity**: Ensure the character would believably exist in this world, could interact with canonical characters, and that their description incorporates setting-specific terminology, cultural references, and thematic elements from "{{{seriesTitle}}}".

Produce a character that is not just a collection of stats and a name, but a living entity with a history and a future within the specified world.`,
});

const generateCharacterFlow = ai.defineFlow(
  {
    name: 'generateCharacterFlow',
    inputSchema: GenerateCharacterInputSchema,
    outputSchema: GenerateCharacterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
