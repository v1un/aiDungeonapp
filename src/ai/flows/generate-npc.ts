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
  prompt: `🎭 You are a **Master Character Designer** creating an unforgettable NPC for the world of "**{{{seriesTitle}}}**".

🌟 **MISSION**: Create an NPC so authentic and memorable that players will believe they could have appeared in the original "{{{seriesTitle}}}" story.

📚 **WORLD CONTEXT**:
- **Series**: {{{seriesTitle}}}
- **Universe**: {{{worldContext}}}
- **Player Character**: {{{playerCharacterDescription}}}
{{#currentLocation}}
- **Current Setting**: {{{currentLocation}}}
{{/currentLocation}}
{{#purpose}}
- **Narrative Role**: {{{purpose}}}
{{/purpose}}

{{#existingNpcs}}
🏘️ **EXISTING CHARACTERS** (Ensure uniqueness):
{{#each existingNpcs}}
- **{{{name}}}**: {{{description}}}
{{/each}}
{{/existingNpcs}}

✨ **CHARACTER CREATION STANDARDS**:

👤 **NAME**: 
- Must fit "{{{seriesTitle}}}" naming conventions perfectly
- Should sound natural within the world's cultural context
- Memorable but not overly exotic

📜 **BACKGROUND**: 
- **Rich personal history** that ties into world events
- **Connections to existing lore** and major story elements
- **Authentic struggles/motivations** that reflect the series' themes
- Use **specific details** from "{{{seriesTitle}}}" universe

🎭 **PERSONALITY**: 
- **Distinctive voice and mannerisms** that make them stand out
- **Clear character flaws and strengths** (no perfect people)
- **Emotional depth** - what drives them, what they fear
- **Memorable quirks** that players will remember
- Should feel like they have a full life beyond the player's interactions

🎯 **GOALS & MOTIVATIONS**:
- **Specific, personal objectives** (not generic "help people")
- **Internal conflicts** that create interesting roleplay opportunities
- **Stakes that matter** to them personally
- Should create potential for future story development

👁️ **APPEARANCE**: 
- **Vivid physical description** that fits the series' visual style
- **Distinctive features** that help players remember them
- **Clothing/accessories** that tell their story
- **Body language** that reflects their personality

🤝 **RELATIONSHIPS** (0-3 connections):
- **Meaningful connections** to other characters (canonical or NPCs)
- **Complex dynamics** (not just "friend" or "enemy")
- **Relationship history** that explains their current dynamic
- Should create roleplay opportunities

📚 **LOREBOOK INTEGRATION**:
- **Category**: Where this character fits in the world's documentation
- **Concise Entry**: 2-3 sentences using **markdown formatting**
- **Key information** players need to know for future interactions
- Should read like an official character guide entry

🎨 **AUTHENTICITY CHECKLIST**:
✅ Could this character appear in the original "{{{seriesTitle}}}" without feeling out of place?
✅ Do their motivations align with the series' themes and tone?
✅ Are they interesting enough that players will want to interact with them again?
✅ Do they have enough depth to support multiple story encounters?

Remember: Great NPCs aren't just quest-givers - they're **potential friends, rivals, or mysteries** that enrich the player's journey through this world.`,
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
