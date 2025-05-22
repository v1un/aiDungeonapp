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
import dotenv from 'dotenv';
import { addNpcToLorebookTool } from '@/ai/lore-tools'; // Assuming this is the correct import

// Load environment variables
dotenv.config(); // For .env
dotenv.config({ path: '.env.local', override: true }); // For .env.local

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
  async (input: GenerateNpcInput): Promise<GenerateNpcOutput> => {
    const aiProvider = process.env.AI_PROVIDER || 'googleai';

    if (aiProvider === 'ollama') {
      const gemmaResult = await gemmaGenerateNpcPrompt(input);
      const textOutput = typeof gemmaResult === 'string' ? gemmaResult : (gemmaResult as any).npcDetailsText || '';

      let name = "";
      let background = "";
      let personality = "";
      let goals = ""; // Schema is string, Gemma prompt implies list. Will join.
      let appearance = "";
      const relationships: GenerateNpcOutput['relationships'] = [];
      let loreEntryText = "";
      let loreCategory = input.purpose || "General NPC"; // Infer from purpose or default

      try {
        const nameMatch = textOutput.match(/^Name:\s*(.*)/im);
        if (nameMatch && nameMatch[1]) name = nameMatch[1].trim();

        const backgroundMatch = textOutput.match(/Background:\s*([\s\S]*?)(?=Personality:|$)/im);
        if (backgroundMatch && backgroundMatch[1]) background = backgroundMatch[1].trim();

        const personalityMatch = textOutput.match(/Personality:\s*([\s\S]*?)(?=Goals:|$)/im);
        if (personalityMatch && personalityMatch[1]) personality = personalityMatch[1].trim();
        
        const goalsBlockMatch = textOutput.match(/Goals:\s*([\s\S]*?)(?=Appearance:|$)/im);
        if (goalsBlockMatch && goalsBlockMatch[1]) {
          const goalsList = goalsBlockMatch[1]
            .split('\n')
            .map(goal => goal.replace(/-\s*/, '').trim())
            .filter(goal => goal.length > 0);
          goals = goalsList.join('; '); // Join into a single string
        }

        const appearanceMatch = textOutput.match(/Appearance:\s*([\s\S]*?)(?=Key Relationships:|$)/im);
        if (appearanceMatch && appearanceMatch[1]) appearance = appearanceMatch[1].trim();

        const relationshipsBlockMatch = textOutput.match(/Key Relationships:\s*([\s\S]*?)(?=Lorebook Entry:|$)/im);
        if (relationshipsBlockMatch && relationshipsBlockMatch[1]) {
          const relLines = relationshipsBlockMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
          for (const line of relLines) {
            const relMatch = line.match(/-\s*(.*?):\s*(.*)/);
            if (relMatch && relMatch[1] && relMatch[2]) {
              relationships.push({
                characterName: relMatch[1].trim(),
                relationshipType: relMatch[2].trim(),
                description: `${relMatch[1].trim()} is a ${relMatch[2].trim()}.` // Simple description
              });
              if (relationships.length >= 3) break; // Max 3 as per schema
            }
          }
        }
        
        const loreEntryMatch = textOutput.match(/Lorebook Entry:\s*([\s\S]*)/im);
        if (loreEntryMatch && loreEntryMatch[1]) loreEntryText = loreEntryMatch[1].trim();

        if (!name && !background && !personality && !goals && !appearance && relationships.length === 0 && !loreEntryText) {
            console.warn("Gemma output parsing failed significantly for generateNpc. Raw output:", textOutput);
            return {
                name: "NPC Name (Parsing Failed)",
                background: "NPC background could not be parsed. Gemma output: " + textOutput.substring(0,150),
                personality: "Default",
                goals: "Default goals",
                appearance: "Default appearance",
                relationships: [],
                loreCategory: "Error",
                loreEntry: { name: "NPC Name (Parsing Failed)", description: "Lore entry could not be parsed.", category: "Error" },
            };
        }

      } catch (parseError) {
        console.error("Error parsing Gemma output for generateNpc:", parseError);
        return {
            name: "NPC Name (Parsing Error)",
            background: "Error during parsing. Gemma output: " + textOutput.substring(0,150),
            personality: "Default",
            goals: "Default goals",
            appearance: "Default appearance",
            relationships: [],
            loreCategory: "Error",
            loreEntry: { name: "NPC Name (Parsing Error)", description: "Lore entry parsing error.", category: "Error" },
        };
      }
      
      // Construct the final output for Gemma path
      // Note: addNpcToLorebookTool is NOT called for Gemma path
      return {
        name,
        background,
        personality,
        goals,
        appearance,
        relationships,
        loreCategory, // Use inferred/defaulted category
        loreEntry: {
          name: name || "Unnamed NPC",
          description: loreEntryText || "No lore entry provided.",
          category: loreCategory, // Use inferred/defaulted category
        },
      };

    } else {
      // Google AI / Gemini Path (existing logic)
      const geminiOutput = await prompt(input);
      if (!geminiOutput.output) {
         console.error('generateNpcFlow (Gemini) returned undefined output.');
         return {
            name: "Default Gemini NPC",
            background: "Default background.",
            personality: "Default",
            goals: "Default goals",
            appearance: "Default appearance",
            relationships: [],
            loreCategory: "Default",
            loreEntry: { name: "Default Gemini NPC", description: "Default lore entry.", category: "Default" },
        };
      }
      
      // Call addNpcToLorebookTool ONLY for the Gemini path
      try {
        await addNpcToLorebookTool({
          name: geminiOutput.output.name,
          description: geminiOutput.output.loreEntry.description,
          category: geminiOutput.output.loreCategory,
          // Additional fields like 'aliases', 'relatedEntries' can be added if the tool supports them
        });
        console.log(`NPC ${geminiOutput.output.name} processed by addNpcToLorebookTool.`);
      } catch (toolError) {
        console.error(`Error calling addNpcToLorebookTool for ${geminiOutput.output.name}:`, toolError);
        // Decide if you want to fail the flow or just log the error and continue
      }
      
      return geminiOutput.output;
    }
  }
);

// New prompt for Gemma (Ollama) - tool-less
const gemmaGenerateNpcPrompt = ai.definePrompt({
  name: 'gemmaGenerateNpcPrompt',
  input: { schema: GenerateNpcInputSchema },
  // No explicit output schema, expect raw string.
  // NO TOOLS for Gemma
  prompt: `You are a role-playing game master creating an NPC for the fictional series "{{{seriesTitle}}}".

Your task is to create a non-player character (NPC) that feels like they genuinely belong in this fictional universe. The NPC should be interesting, memorable, and provide meaningful interaction opportunities for the player.

SERIES INFORMATION:
Series Title: {{{seriesTitle}}}
World Context: {{{worldContext}}}
Player Character: {{{playerCharacterDescription}}}
{{#if currentLocation}}Current Location: {{{currentLocation}}}{{/if}}
{{#if purpose}}NPC Purpose: {{{purpose}}}{{/if}}

{{#if existingNpcs}}
EXISTING NPCs IN THE SETTING:
{{#each existingNpcs}}
- {{{name}}}: {{{description}}}
{{/each}}
{{/if}}

REQUIREMENTS:
1.  The NPC should feel like an authentic part of {{{seriesTitle}}}, with naming conventions, speech patterns, and background that match the series' style.
2.  Create a believable connection to the world's lore and existing characters.
3.  Ensure the NPC has clear motivations and goals that could drive player interactions.
4.  Make the NPC distinct from existing characters while still fitting naturally in the world.
5.  Provide a "Lorebook Entry" section that's a concise summary suitable for a game's reference.

Format your response clearly using Markdown as follows:

Name: [NPC Name]

Background:
[Detailed background, 2-3 paragraphs...]

Personality:
[Key personality traits, 1-2 paragraphs...]

Goals:
- [Primary Goal]
- [Secondary Goal (if any)]

Appearance:
[Detailed appearance, 1-2 paragraphs...]

Key Relationships:
(Provide 0-3 key relationships. If none, write "None.")
- [Character Name 1]: [Relationship type, e.g., Ally, Rival, Family Member, Mentor]
- [Character Name 2]: [Relationship type]

Lorebook Entry:
[A concise paragraph or two suitable for a lorebook entry about this NPC, summarizing their key aspects.]

All this information should be part of your single text response. Do not use any external tools.
`,
});
