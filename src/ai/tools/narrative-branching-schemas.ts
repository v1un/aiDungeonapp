import { z } from 'genkit';

export interface StoryBranch {
  id: string;
  playerAction: string;
  consequence: string;
  narrativeHook: string;
  probability: number; // 0-1 scale
  created: number;
}

// Tool schema for generating narrative branches
export const generateBranchesSchema = z.object({
  currentSituation: z.string().describe('Brief description of the current story situation'),
  playerOptions: z.array(z.string()).min(1).max(5).describe('Potential player actions to generate branches for'),
  storyGenre: z.string().describe('The genre or setting of the story'),
  currentCharacters: z.array(z.string()).describe('Characters currently in the scene'),
  tonePreference: z.enum(['dark', 'hopeful', 'mysterious', 'comedic', 'dramatic', 'neutral']).optional().describe('Preferred tone for the story branches')
});

// Tool schema for selecting the most appropriate branch
export const selectBranchSchema = z.object({
  playerAction: z.string().describe('The actual action taken by the player'),
  relevantFactors: z.array(z.string()).optional().describe('Any factors that might influence branch selection'),
  preferTone: z.enum(['dark', 'hopeful', 'mysterious', 'comedic', 'dramatic', 'neutral', 'epic', 'psychological', 'romantic', 'action-packed', 'philosophical']).optional().describe('Tone preference for branch selection - should match the series aesthetic')
});
