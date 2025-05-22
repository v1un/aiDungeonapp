'use server';
/**
 * @fileOverview Central registration point for all AI tools
 * This file breaks circular dependencies by importing the AI instance and tool definitions separately
 */

import { ai } from '@/ai/genkit';
import { 
  retrieveLoreInfoToolDefinition, 
  retrieveLoreInfoImplementation 
} from './retrieve-lore-info';

// Register the retrieve lore info tool
export const retrieveLoreInfoTool = ai.defineTool(
  retrieveLoreInfoToolDefinition,
  retrieveLoreInfoImplementation
);

// Export all tools from a single location
export const tools = {
  retrieveLoreInfoTool
};
