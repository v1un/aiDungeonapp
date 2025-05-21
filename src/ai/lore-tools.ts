/**
 * @fileOverview Flat implementation of lore-related tools to avoid circular dependencies
 */

// Note: Removed 'use server' directive as this file exports non-async objects

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import type { Lorebook } from '@/types';
import { getCurrentGameState } from '@/lib/game-actions';

// Schema definitions
const RetrieveLoreInfoInputSchema = z.object({
  searchTerm: z.string().describe("A keyword or phrase to search for within the lorebook (e.g., a character's name, a location, a concept)."),
  categoryHint: z.string().optional().describe("An optional hint for the category to search within (e.g., 'Locations', 'Key Characters & NPCs').")
});
type RetrieveLoreInfoInput = z.infer<typeof RetrieveLoreInfoInputSchema>;

const RetrieveLoreInfoOutputSchema = z.object({
  relevantInfo: z.string().describe("A summary of relevant information found in the lorebook matching the search term, or a statement if no information was found. Should be concise and directly usable by the AI in its narrative."),
  found: z.boolean().describe("Whether any relevant information was found.")
});
type RetrieveLoreInfoOutput = z.infer<typeof RetrieveLoreInfoOutputSchema>;

// Implementation function
async function retrieveLoreInfoImplementation(input: RetrieveLoreInfoInput): Promise<RetrieveLoreInfoOutput> {
  const gameState = await getCurrentGameState();
  if (!gameState || !gameState.seriesDetails || !gameState.seriesDetails.lorebook) {
    return { relevantInfo: "No lorebook has been established for the current series.", found: false };
  }

  const lorebook: Lorebook = gameState.seriesDetails.lorebook;
  const searchTerm = input.searchTerm.toLowerCase();
  const foundSnippets: string[] = [];

  // Search in overall summary
  if (lorebook.overallSummary?.toLowerCase().includes(searchTerm)) {
    foundSnippets.push(`From Overall Summary: "...${lorebook.overallSummary.substring(Math.max(0, lorebook.overallSummary.toLowerCase().indexOf(searchTerm) - 50), Math.min(lorebook.overallSummary.length, lorebook.overallSummary.toLowerCase().indexOf(searchTerm) + searchTerm.length + 150))}..."`);
  }

  // Search in lore entries
  if (lorebook.entries && lorebook.entries.length > 0) {
    lorebook.entries.forEach(entry => {
      let match = false;
      if (input.categoryHint && entry.category?.toLowerCase() !== input.categoryHint.toLowerCase()) {
        // If category hint is provided and doesn't match, skip
      } else {
        if (entry.name?.toLowerCase().includes(searchTerm)) {
          match = true;
        }
        if (entry.description?.toLowerCase().includes(searchTerm)) {
          match = true;
        }

        if (match) {
          foundSnippets.push(`From '${entry.category} - ${entry.name}': ${entry.description}`);
        }
      }
    });
  }
  
  if (foundSnippets.length === 0) {
    return { relevantInfo: `No specific information found for "${input.searchTerm}" in the lorebook.`, found: false };
  }

  // Return a limited number of snippets to keep it concise for the AI
  const MAX_SNIPPETS = 3;
  const info = foundSnippets.slice(0, MAX_SNIPPETS).join('\n\n');
  
  return { relevantInfo: `Found information related to "${input.searchTerm}":\n${info}`, found: true };
}

// Create the actual tool directly
export const retrieveLoreInfoTool = ai.defineTool(
  {
    name: 'retrieveLoreInfoTool',
    description: 'Queries the established series lorebook for specific details based on a search term. Use this to find information about characters, places, events, concepts, etc., to ensure narrative consistency or answer player queries about the world.',
    inputSchema: RetrieveLoreInfoInputSchema,
    outputSchema: RetrieveLoreInfoOutputSchema,
  },
  retrieveLoreInfoImplementation
);

// Export all tools from this file
export const loreTools = {
  retrieveLoreInfoTool
};
