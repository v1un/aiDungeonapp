'use server';
/**
 * @fileOverview Generates a non-player character (NPC) with a unique background, personality, and goals.
 *
 * - generateNpc - A function that generates an NPC.
 * - GenerateNpcInput - The input type for the generateNpc function.
 * - GenerateNpcOutput - The return type for the generateNpc function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNpcInputSchema = z.object({
  playerCharacterDescription: z
    .string()
    .describe('Description of the player character interacting with the NPC.'),
  settingDescription: z.string().describe('Description of the game setting.'),
});
export type GenerateNpcInput = z.infer<typeof GenerateNpcInputSchema>;

const GenerateNpcOutputSchema = z.object({
  name: z.string().describe('The name of the NPC.'),
  background: z.string().describe('The background story of the NPC.'),
  personality: z.string().describe('The personality traits of the NPC.'),
  goals: z.string().describe('The goals of the NPC.'),
});
export type GenerateNpcOutput = z.infer<typeof GenerateNpcOutputSchema>;

export async function generateNpc(input: GenerateNpcInput): Promise<GenerateNpcOutput> {
  return generateNpcFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNpcPrompt',
  input: {schema: GenerateNpcInputSchema},
  output: {schema: GenerateNpcOutputSchema},
  prompt: `You are a role-playing game master. Generate a non-player character (NPC)
  with a unique background, personality, and goals for the player to interact with.

  The player character is described as: {{{playerCharacterDescription}}}
  The game setting is described as: {{{settingDescription}}}

  Consider the player character and game setting when generating the NPC.
  Ensure the NPC has a compelling reason to exist in the game world and can
  offer interesting interactions with the player.

  The NPC should have:
  - A name
  - A detailed background story
  - A distinct personality
  - Clear goals they are trying to achieve

  Output the NPC in the following JSON format:
  {
    "name": "NPC Name",
    "background": "NPC Background Story",
    "personality": "NPC Personality Traits",
    "goals": "NPC Goals"
  }`,
});

const generateNpcFlow = ai.defineFlow(
  {
    name: 'generateNpcFlow',
    inputSchema: GenerateNpcInputSchema,
    outputSchema: GenerateNpcOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
