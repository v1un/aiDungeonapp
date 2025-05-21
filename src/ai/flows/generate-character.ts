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
  prompt: `You are a character creation expert for the fictional universe of "{{{seriesTitle}}}". 

You will generate a character based on the player's concept that fits naturally within this universe. 

Series: {{{seriesTitle}}}
World Context: {{{worldContext}}}
Player Concept: {{{characterConcept}}}

Your task is to create a character that:
1. Has a name that stylistically matches naming conventions in {{{seriesTitle}}}
2. Has a detailed backstory that connects to the existing lore of {{{seriesTitle}}}
3. Has stats and abilities that make sense within this fictional universe's rules and systems
4. Would believably exist in this world and interact with canonical characters

Ensure that the backstory is engaging, ties into existing world elements from {{{seriesTitle}}}, and provides a good starting point for the character's adventure.

Stats should be numbers from 1-10 that reflect the character's capabilities relative to others in {{{seriesTitle}}}.
Skills should be abilities or talents that would be recognized and relevant in the world of {{{seriesTitle}}}.

Make sure the character feels like they truly belong in this fictional universe by incorporating setting-specific terminology, cultural references, and thematic elements from {{{seriesTitle}}}.`, // Backstory should be a string.
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
