
'use server';

/**
 * @fileOverview AI agent that generates a new quest.
 *
 * - generateQuest - A function that generates a new quest.
 * - GenerateQuestInput - The input type for the generateQuest function.
 * - GenerateQuestOutput - The return type for the generateQuest function (equivalent to Quest type).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Quest } from '@/types'; // Import the Quest type
import { QuestSchema } from '@/types'; // Import the QuestSchema
import dotenv from 'dotenv';

// Load environment variables
dotenv.config(); // For .env
dotenv.config({ path: '.env.local', override: true }); // For .env.local

// Input schema for generating a quest (can be expanded later)
const GenerateQuestInputSchema = z.object({
  playerContext: z.string().describe('Information about the player, their current situation, and the game world (e.g., series name, character details, current location).'),
  previousQuestCount: z.number().optional().describe('Number of quests already completed or active, to vary difficulty or type.'),
});
export type GenerateQuestInput = z.infer<typeof GenerateQuestInputSchema>;

// Output schema is the Quest itself
export type GenerateQuestOutput = Quest; // Using the imported Quest type

// This function is a placeholder for now, more for defining the structure.
// In a full implementation, it would be called by game logic to create new quests.
export async function generateQuest(input: GenerateQuestInput): Promise<GenerateQuestOutput> {
  // For now, this just demonstrates calling the flow.
  // A real implementation would pass more dynamic context.
  const quest = await generateQuestFlow(input);
  return {
    ...quest,
    id: `quest-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Ensure unique ID
    status: 'active' // Default status
  };
}

const generateQuestPrompt = ai.definePrompt({
  name: 'generateQuestPrompt',
  input: {schema: GenerateQuestInputSchema},
  output: {schema: QuestSchema.omit({ id: true, status: true })}, // AI generates content, ID/status managed by system
  prompt: `You are a master storyteller and game designer for text-based RPGs.
Given the player's context, generate a compelling and fitting quest.

Player Context:
{{{playerContext}}}

Based on this, devise a quest with:
- A captivating title.
- An engaging description that sets the scene and goal.
- A clear list of 2-4 objectives the player must achieve.
- A list of 1-3 thematic rewards for completing the quest.

The quest should feel like a natural extension of the player's current situation and the series they are in.
If {{previousQuestCount}} is provided and greater than 0, try to make this quest different from typical early-game quests.
`,
});

const generateQuestFlow = ai.defineFlow(
  {
    name: 'generateQuestFlow',
    inputSchema: GenerateQuestInputSchema,
    outputSchema: QuestSchema.omit({ id: true, status: true }),
  },
  async (input: GenerateQuestInput): Promise<Omit<Quest, 'id' | 'status'>> => {
    const aiProvider = process.env.AI_PROVIDER || 'googleai';

    if (aiProvider === 'ollama') {
      const gemmaResult = await gemmaGenerateQuestPrompt(input);
      const textOutput = typeof gemmaResult === 'string' ? gemmaResult : (gemmaResult as any).questDetailsText || '';

      let title = "";
      let description = "";
      let objectives: string[] = [];
      let rewards: string[] = []; // Changed to string array to match QuestSchema

      try {
        const titleMatch = textOutput.match(/^Title:\s*(.*)/im);
        if (titleMatch && titleMatch[1]) title = titleMatch[1].trim();

        const descriptionMatch = textOutput.match(/Description:\s*([\s\S]*?)(?=Objectives:|$)/im);
        if (descriptionMatch && descriptionMatch[1]) description = descriptionMatch[1].trim();
        
        const objectivesBlockMatch = textOutput.match(/Objectives:\s*([\s\S]*?)(?=Rewards:|$)/im);
        if (objectivesBlockMatch && objectivesBlockMatch[1]) {
          objectives = objectivesBlockMatch[1]
            .split('\n')
            .map(obj => obj.replace(/-\s*/, '').trim())
            .filter(obj => obj.length > 0);
        }

        const rewardsBlockMatch = textOutput.match(/Rewards:\s*([\s\S]*)/im);
        if (rewardsBlockMatch && rewardsBlockMatch[1]) {
           // Rewards can be a list or a paragraph. For QuestSchema, it's an array of strings.
           // We'll parse list items if present, otherwise take the whole block as a single reward item.
          const rewardLines = rewardsBlockMatch[1]
            .split('\n')
            .map(rew => rew.replace(/-\s*/, '').trim())
            .filter(rew => rew.length > 0);
          if (rewardLines.length > 0 && rewardsBlockMatch[1].includes('- ')) {
            rewards = rewardLines;
          } else if (rewardsBlockMatch[1].trim().length > 0) {
            rewards = [rewardsBlockMatch[1].trim()]; // Treat the whole block as one reward if no list format
          }
        }
        
        if (!title && !description && objectives.length === 0 && rewards.length === 0) {
            console.warn("Gemma output parsing failed significantly for generateQuest. Raw output:", textOutput);
            return {
                title: "Quest Title (Parsing Failed)",
                description: "Quest description could not be parsed. Gemma output: " + textOutput.substring(0, 150),
                objectives: ["Objective (Parsing Failed)"],
                rewards: ["Reward (Parsing Failed)"],
            };
        }
      } catch (parseError) {
        console.error("Error parsing Gemma output for generateQuest:", parseError);
        return {
            title: "Quest Title (Parsing Error)",
            description: "Error during parsing. Gemma output: " + textOutput.substring(0, 150),
            objectives: ["Objective (Parsing Error)"],
            rewards: ["Reward (Parsing Error)"],
        };
      }
      
      return { title, description, objectives, rewards };

    } else {
      // Google AI / Gemini Path (existing logic)
      const {output} = await generateQuestPrompt(input); // This is the original prompt object
      if (!output) {
        console.error('generateQuestFlow (Gemini) returned undefined output.');
        // Provide a fallback default structure matching QuestSchema.omit({ id: true, status: true })
        return {
            title: "Default Gemini Quest",
            description: "Default quest description as Gemini output was undefined.",
            objectives: ["Default objective 1", "Default objective 2"],
            rewards: ["Default reward"],
        };
      }
      return output;
    }
  }
);

// New prompt for Gemma (Ollama) - tool-less
const gemmaGenerateQuestPrompt = ai.definePrompt({
  name: 'gemmaGenerateQuestPrompt',
  input: { schema: GenerateQuestInputSchema },
  // No explicit output schema, expect raw string.
  // NO TOOLS for Gemma
  prompt: `You are a quest designer for text-based RPGs.
The game is set in the universe of: {{playerContext.seriesName}} (if available, otherwise use general fantasy context).
The player character is: {{playerContext.mainCharacterName}} ({{playerContext.characterConcept}}).
Current situation: {{playerContext.currentSituation}}.
Number of previous quests completed: {{previousQuestCount}}.

Based on this, devise a quest with:
- A captivating Title.
- An engaging Description that sets the scene and goal.
- A clear list of 2-4 Objectives.
- A list of 1-3 thematic Rewards.

Format your response clearly using Markdown as follows:

Title: [Quest Title]

Description:
[Detailed quest description from the player character's perspective...]

Objectives:
- [Objective 1]
- [Objective 2]
(up to 4 objectives)

Rewards:
- [Reward 1]
- [Reward 2]
(up to 3 rewards, can also be a descriptive paragraph of thematic rewards if not distinct items)

Ensure the quest feels like a natural extension of the player's current situation.
If previousQuestCount is greater than 0, try to make this quest different from typical early-game quests.
All this information should be part of your single text response.
`,
});
