import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { retrieveContextSchema, updateContextSchema } from './context-manager-schemas';
import { retrieveContext, updateContext } from './context-manager';

// Define the tools for the AI to use
export const retrieveContextTool = ai.defineTool(
  {
    name: "retrieveContext",
    description: "Retrieve story context to maintain narrative consistency",
    inputSchema: retrieveContextSchema,
    outputSchema: z.any(),
  },
  retrieveContext
);

export const updateContextTool = ai.defineTool(
  {
    name: "updateContext",
    description: "Update story context with new events, relationships, or world state changes",
    inputSchema: updateContextSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string()
    }),
  },
  updateContext
);
