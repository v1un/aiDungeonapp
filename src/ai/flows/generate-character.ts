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
  prompt: `🎨 You are a **Master Character Architect** with **deep expertise in "{{{seriesTitle}}}"** who creates characters indistinguishable from those crafted by the original series creator.

🌟 **ABSOLUTE SERIES AUTHENTICITY MANDATE**:
This character MUST be so perfectly integrated into "{{{seriesTitle}}}" that readers would believe they were created by the original author.

🌟 **WORLD FOUNDATION**:
- **Series**: {{{seriesTitle}}}
- **Universe Context**: {{{worldContext}}}
- **Player Vision**: {{{characterConcept}}}

🎯 **MISSION**: Transform the player's concept into a **living, breathing character** who seamlessly exists within "{{{seriesTitle}}}" with perfect canon compliance.

✨ **CHARACTER CREATION STANDARDS**:

📛 **NAME**: 
- **100% authentic** to "{{{seriesTitle}}}" naming conventions
- Must follow **established linguistic patterns** from the series
- Consider **cultural background, social class, and regional origins** from series lore
- Should **sound completely natural** alongside canonical character names

📖 **BACKSTORY**: 
- **Deep integration** with "{{{seriesTitle}}}" established timeline and world events
- **Specific connections** to canonical locations, organizations, and historical moments
- **Cultural authenticity** reflecting series' societal structures and customs
- **Personal history** that explains their skills within series power systems
- **Family/mentor relationships** using established series social hierarchies
- **Character development** that respects series themes and moral frameworks
- Use **exact series terminology** and cultural references throughout

📊 **STATS** (1-10 scale, calibrated to "{{{seriesTitle}}}" power levels):
- **Series-Accurate Scaling**: Compare directly to established characters from "{{{seriesTitle}}}"
- **Strength**: Physical/mental fortitude (How do they compare to canonical characters?)
- **Dexterity**: Agility/reflexes (Within series-established human limitations)
- **Constitution**: Endurance (Consistent with series' depiction of human resilience)
- **Intelligence**: Knowledge/reasoning (Reflecting series' educational and cultural systems)
- **Wisdom**: Intuition/perception (Aligned with series' spiritual/philosophical elements)
- **Charisma**: Social influence (Appropriate for series' social dynamics)

🛠️ **SKILLS**: 
- **Only abilities that exist** within "{{{seriesTitle}}}" established systems
- **Culturally appropriate** skills for their background in the series world
- **Power progression** that respects series limitations and training methods
- **Unique talents** that complement rather than overshadow canonical characters
- **Series-specific knowledge** of locations, customs, and lore

🎭 **CANON COMPLIANCE VERIFICATION**:
✅ **Lore Integration**: Could this character appear in the original series without explanation?
✅ **Cultural Authenticity**: Do they perfectly reflect series' societal norms?
✅ **Power Balance**: Are their abilities appropriately scaled for the series?
✅ **Linguistic Consistency**: Do they speak and think like inhabitants of this world?
✅ **Thematic Alignment**: Do they embody or meaningfully interact with series themes?
✅ **Timeline Consistency**: Does their history align with established series events?

🌟 **STORYTELLING AUTHENTICITY**:
- Every detail must **serve the series' narrative style**
- Backstory should create **series-appropriate adventure hooks**
- Skills should reflect **canonical training methods and limitations**
- Character arc potential should **align with series' story progression patterns**
- Internal conflicts should **reflect established series themes and moral questions**

Remember: You're creating a character who belongs so perfectly in "{{{seriesTitle}}}" that they could have been written by the original creator.`,
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
