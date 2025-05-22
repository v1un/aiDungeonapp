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
import dotenv from 'dotenv';

// Load environment variables
dotenv.config(); // For .env
dotenv.config({ path: '.env.local', override: true }); // For .env.local

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
  async (input: GenerateCharacterInput): Promise<GenerateCharacterOutput> => {
    const aiProvider = process.env.AI_PROVIDER || 'googleai';

    if (aiProvider === 'ollama') {
      const gemmaResult = await gemmaGenerateCharacterPrompt(input);
      const textOutput = typeof gemmaResult === 'string' ? gemmaResult : (gemmaResult as any).characterDetailsText || '';

      // Parse the textOutput from Gemma
      let name = "";
      let backstory = "";
      const stats = {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      };
      let skills: string[] = [];

      try {
        const nameMatch = textOutput.match(/^Name:\s*(.*)/im);
        if (nameMatch && nameMatch[1]) name = nameMatch[1].trim();

        const backstoryMatch = textOutput.match(/Backstory:\s*([\s\S]*?)(?=Stats:|$)/im);
        if (backstoryMatch && backstoryMatch[1]) backstory = backstoryMatch[1].trim();
        
        const statsBlockMatch = textOutput.match(/Stats:\s*([\s\S]*?)(?=Skills:|$)/im);
        if (statsBlockMatch && statsBlockMatch[1]) {
          const statsText = statsBlockMatch[1];
          const strMatch = statsText.match(/-\s*Strength:\s*(\d+)/im);
          if (strMatch && strMatch[1]) stats.strength = parseInt(strMatch[1], 10);
          const dexMatch = statsText.match(/-\s*Dexterity:\s*(\d+)/im);
          if (dexMatch && dexMatch[1]) stats.dexterity = parseInt(dexMatch[1], 10);
          const conMatch = statsText.match(/-\s*Constitution:\s*(\d+)/im);
          if (conMatch && conMatch[1]) stats.constitution = parseInt(conMatch[1], 10);
          const intMatch = statsText.match(/-\s*Intelligence:\s*(\d+)/im);
          if (intMatch && intMatch[1]) stats.intelligence = parseInt(intMatch[1], 10);
          const wisMatch = statsText.match(/-\s*Wisdom:\s*(\d+)/im);
          if (wisMatch && wisMatch[1]) stats.wisdom = parseInt(wisMatch[1], 10);
          const chaMatch = statsText.match(/-\s*Charisma:\s*(\d+)/im);
          if (chaMatch && chaMatch[1]) stats.charisma = parseInt(chaMatch[1], 10);
        }

        const skillsBlockMatch = textOutput.match(/Skills:\s*([\s\S]*)/im);
        if (skillsBlockMatch && skillsBlockMatch[1]) {
          const skillsText = skillsBlockMatch[1];
          skills = skillsText
            .split('\n')
            .map(skill => skill.replace(/-\s*/, '').trim())
            .filter(skill => skill.length > 0);
        }
        
        if (!name && !backstory && skills.length === 0 && Object.values(stats).every(s => s === 0)) {
            // If parsing completely failed, log and throw to return a more generic error or fallback.
            console.warn("Gemma output parsing failed significantly for generateCharacter. Raw output:", textOutput);
            // Fallback to a default structure if parsing is very unsuccessful
            return {
                name: "Character Name (Parsing Failed)",
                backstory: "Character backstory could not be parsed. Gemma output was: " + textOutput.substring(0, 200) + "...",
                stats: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
                skills: ["Basic Skill (Parsing Failed)"],
            };
        }

      } catch (parseError) {
        console.error("Error parsing Gemma output for generateCharacter:", parseError);
        // Fallback to default structure in case of parsing errors
         return {
            name: "Character Name (Parsing Error)",
            backstory: "Error during parsing. Gemma output was: " + textOutput.substring(0, 200) + "...",
            stats: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
            skills: ["Basic Skill (Parsing Error)"],
        };
      }
      
      return { name, backstory, stats, skills };

    } else {
      // Google AI / Gemini Path (existing logic)
      const {output} = await prompt(input);
      if (!output) {
        console.error('generateCharacterFlow (Gemini) returned undefined output.');
        // Provide a fallback default structure
        return {
            name: "Default Gemini Character",
            backstory: "Default backstory as Gemini output was undefined.",
            stats: { strength: 5, dexterity: 5, constitution: 5, intelligence: 5, wisdom: 5, charisma: 5 },
            skills: ["Default Skill"],
        };
      }
      return output;
    }
  }
);

// New prompt for Gemma (Ollama) - tool-less
// const GemmaGenerateCharacterOutputSchema = z.object({ characterDetailsText: z.string() }); // Example if we wanted structured output from Gemma prompt

const gemmaGenerateCharacterPrompt = ai.definePrompt({
  name: 'gemmaGenerateCharacterPrompt',
  input: { schema: GenerateCharacterInputSchema },
  // No explicit output schema, expect raw string.
  // output: { schema: GemmaGenerateCharacterOutputSchema },
  // NO TOOLS for Gemma
  prompt: `You are a character creation expert for the fictional universe of "{{{seriesTitle}}}".

You will generate a character based on the player's concept that fits naturally within this universe.

Series: {{{seriesTitle}}}
World Context: {{{worldContext}}}
Player Concept: {{{characterConcept}}}

Your task is to create a character with a Name, a detailed Backstory, Stats (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma - each on a 1-10 scale), and a list of Skills.

Format your response clearly using Markdown as follows:

Name: [Character Name]

Backstory:
[Detailed backstory...]

Stats:
- Strength: [Value from 1-10]
- Dexterity: [Value from 1-10]
- Constitution: [Value from 1-10]
- Intelligence: [Value from 1-10]
- Wisdom: [Value from 1-10]
- Charisma: [Value from 1-10]

Skills:
- [Skill 1]
- [Skill 2]
- [Skill 3]
(Provide 3-5 relevant skills)

Ensure that the backstory is engaging and ties into existing world elements from {{{seriesTitle}}}.
Make sure the character feels like they truly belong in this fictional universe.
All this information should be part of your single text response.
`,
});
