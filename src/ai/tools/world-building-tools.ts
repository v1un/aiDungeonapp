import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { 
  generateLocationSchema, 
  retrieveLocationSchema, 
  generateEnvironmentSchema 
} from './world-building-schemas';
import { 
  generateLocation, 
  retrieveLocation, 
  generateEnvironment 
} from './world-building';

// Define the tools for the AI to use
export const generateLocationTool = ai.defineTool(
  {
    name: "generateLocation",
    description: "Generate detailed information about a location in the story",
    inputSchema: generateLocationSchema,
    outputSchema: z.object({
      location: z.object({
        name: z.string(),
        description: z.string(),
        atmosphere: z.string(),
        notableFeatures: z.array(z.string()),
        hiddenElements: z.array(z.string()),
        connectedLocations: z.array(z.string())
      }),
      isNew: z.boolean()
    }),
  },
  generateLocation
);

export const generateEnvironmentTool = ai.defineTool(
  {
    name: "generateEnvironment",
    description: "Generate environmental elements like weather, time of day, and sensory details",
    inputSchema: generateEnvironmentSchema,
    outputSchema: z.object({
      environmentalElements: z.array(z.object({
        type: z.enum(['weather', 'timeOfDay', 'atmosphere', 'sound', 'smell']),
        description: z.string(),
        impact: z.string()
      })),
      timeHasProgressed: z.boolean()
    }),
  },
  generateEnvironment
);

export const retrieveLocationTool = ai.defineTool(
  {
    name: "retrieveLocation",
    description: "Retrieve previously generated details about a location",
    inputSchema: retrieveLocationSchema,
    outputSchema: z.object({
      exists: z.boolean(),
      location: z.object({
        name: z.string(),
        description: z.string(),
        atmosphere: z.string(),
        notableFeatures: z.array(z.string()),
        hiddenElements: z.array(z.string()),
        connectedLocations: z.array(z.string())
      }).optional(),
      message: z.string().optional()
    }),
  },
  retrieveLocation
);
