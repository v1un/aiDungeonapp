import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { 
  generateBranchesSchema, 
  selectBranchSchema 
} from './narrative-branching-schemas';
import { 
  generateBranches, 
  selectBranch 
} from './narrative-branching';

// Define the tools for the AI to use
export const generateBranchesTool = ai.defineTool(
  {
    name: "generateNarrativeBranches",
    description: "Generate potential story branches based on player options",
    inputSchema: generateBranchesSchema,
    outputSchema: z.object({
      branches: z.array(z.object({
        id: z.string(),
        playerAction: z.string(),
        consequence: z.string(),
        narrativeHook: z.string(),
        probability: z.number(),
        created: z.number()
      }))
    }),
  },
  generateBranches
);

export const selectBranchTool = ai.defineTool(
  {
    name: "selectNarrativeBranch",
    description: "Select the most appropriate narrative branch based on the player's action",
    inputSchema: selectBranchSchema,
    outputSchema: z.object({
      selectedBranch: z.object({
        id: z.string(),
        playerAction: z.string(),
        consequence: z.string(),
        narrativeHook: z.string(),
        probability: z.number(),
        created: z.number()
      }).nullable(),
      fallbackResponse: z.string().optional(),
      needsNewBranches: z.boolean()
    }),
  },
  selectBranch
);
