'use server';
/**
 * @fileOverview Central registration point for all AI tools
 * This file breaks circular dependencies by importing the AI instance and tool definitions separately
 * 
 * All tools should be registered here and exported from this central location to maintain consistency
 * and avoid circular dependencies.
 */

import { ai, z } from '@/ai/genkit';

// Import tool definitions and implementations
import { 
  retrieveLoreInfoToolDefinition, 
  retrieveLoreInfoImplementation 
} from './retrieve-lore-info';

import {
  retrieveContextSchema,
  updateContextSchema
} from './context-manager-schemas';

import {
  retrieveContext,
  updateContext
} from './context-manager';

import {
  generateBranchesSchema,
  selectBranchSchema
} from './narrative-branching-schemas';

import {
  generateBranches,
  selectBranch
} from './narrative-branching';

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

import {
  updateRelationshipTool,
  addCharacterMemoryTool,
  retrieveCharacterMemoriesTool
} from './relationship-manager';

import {
  addLocationToLorebookTool,
  enrichLorebookTool
} from '@/ai/lore-tools';

// Register all tools
export const retrieveLoreInfoTool = ai.defineTool(
  retrieveLoreInfoToolDefinition,
  retrieveLoreInfoImplementation
);

// Context management tools
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

// Narrative branching tools
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

// World building tools
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

// Re-export relationship management tools that are already defined
export { updateRelationshipTool, addCharacterMemoryTool, retrieveCharacterMemoriesTool };

// Re-export lorebook tools that are already defined
export { addLocationToLorebookTool, enrichLorebookTool };

// Export all tools from a single location
export const tools = {
  // Lore tools
  retrieveLoreInfoTool,
  addLocationToLorebookTool,
  enrichLorebookTool,
  
  // Context management
  retrieveContextTool,
  updateContextTool,
  
  // Narrative branching
  generateBranchesTool,
  selectBranchTool,
  
  // World building
  generateLocationTool,
  generateEnvironmentTool,
  retrieveLocationTool,
  
  // Relationship management
  updateRelationshipTool,
  addCharacterMemoryTool,
  retrieveCharacterMemoriesTool
};
