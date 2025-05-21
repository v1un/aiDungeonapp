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
  seriesTitle: z
    .string()
    .describe('The title of the fictional series this NPC belongs to.'),
  existingNpcs: z
    .array(z.object({
      name: z.string(),
      description: z.string()
    }))
    .describe('List of existing NPCs in the lorebook to ensure uniqueness and consistency.')
    .optional(),
  worldContext: z
    .string()
    .describe('A summary of the world/universe the NPC exists within.'),
  currentLocation: z
    .string()
    .describe('The current location where the NPC will be encountered.')
    .optional(),
  purpose: z
    .string()
    .describe('The narrative purpose of this NPC (e.g., ally, antagonist, quest-giver, merchant).')
    .optional(),
});
export type GenerateNpcInput = z.infer<typeof GenerateNpcInputSchema>;

const GenerateNpcOutputSchema = z.object({
  name: z.string().describe('The name of the NPC that fits the naming conventions of the series.'),
  background: z.string().describe('The background story of the NPC that connects to the series lore.'),
  personality: z.string().describe('The personality traits of the NPC.'),
  goals: z.string().describe('The current goals and motivations of the NPC.'),
  appearance: z.string().describe('Physical description of the NPC that matches the visual style of the series.'),
  relationships: z.array(
    z.object({
      characterName: z.string().describe('Name of a character this NPC has a relationship with.'),
      relationshipType: z.string().describe('Type of relationship (ally, enemy, family, etc.)'),
      description: z.string().describe('Brief description of their relationship.')
    })
  ).min(0).max(3).describe('Key relationships this NPC has with other characters in the series.'),
  loreCategory: z.string().describe('The category this NPC would belong to in the lorebook (e.g., Allies, Antagonists, Merchants, Faction Leaders)'),
  loreEntry: z.object({
    name: z.string().describe('Name for the lorebook entry (typically the NPC\'s name)'),
    description: z.string().describe('A concise, markdown-formatted description for the lorebook that captures the most important aspects of this NPC.'),
    category: z.string().describe('The category this entry belongs to in the lorebook.')
  }).describe('A formatted lorebook entry for this NPC that can be directly added to the game\'s lorebook.')
});
export type GenerateNpcOutput = z.infer<typeof GenerateNpcOutputSchema>;

export async function generateNpc(input: GenerateNpcInput): Promise<GenerateNpcOutput> {
  return generateNpcFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNpcPrompt',
  input: {schema: GenerateNpcInputSchema},
  output: {schema: GenerateNpcOutputSchema},
  prompt: `You are a role-playing game master creating an NPC for the fictional series "{{{seriesTitle}}}". 
  
  Your task is to create a non-player character (NPC) that feels like they genuinely belong in this fictional universe. The NPC should be interesting, memorable, and provide meaningful interaction opportunities for the player.

  SERIES INFORMATION:
  Series Title: {{{seriesTitle}}}
  World Context: {{{worldContext}}}
  Player Character: {{{playerCharacterDescription}}}
  {{#currentLocation}}Current Location: {{{currentLocation}}}{{/currentLocation}}
  {{#purpose}}NPC Purpose: {{{purpose}}}{{/purpose}}

  {{#existingNpcs}}
  EXISTING NPCs IN THE SETTING:
  {{#each existingNpcs}}
  - {{{name}}}: {{{description}}}
  {{/each}}
  {{/existingNpcs}}

  REQUIREMENTS:
  1. The NPC should feel like an authentic part of {{{seriesTitle}}}, with naming conventions, speech patterns, and background that match the series' style.
  2. Create a believable connection to the world's lore and existing characters.
  3. Ensure the NPC has clear motivations and goals that could drive player interactions.
  4. Make the NPC distinct from existing characters while still fitting naturally in the world.
  5. Consider how this character might appear in the lorebook as a reference for players.

  Create a complete NPC profile with:
  - Name: Appropriate to the setting and cultural context
  - Background: Connected to world events and lore
  - Personality: Distinctive traits and behaviors
  - Goals: Current motivations driving their actions
  - Appearance: Physical description matching the series' visual style
  - Relationships: 0-3 connections to other characters (can be to canonical characters or other NPCs)
  - Lorebook Information: How this character would be categorized and described in the game's lorebook

  Ensure that your response includes a well-formatted lorebook entry that can be directly added to the game's reference materials.`,
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
