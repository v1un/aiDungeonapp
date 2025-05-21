
'use server';
/**
 * @fileOverview A Genkit tool to retrieve specific information from the generated series lorebook.
 */

import type { Lorebook } from '@/types'; // Assuming SeriesDetails and Lorebook are in types
import { getCurrentGameState } from '@/lib/game-actions'; // Function to get current game state
import {
  RetrieveLoreInfoInput,
  RetrieveLoreInfoOutput,
} from '@/ai/tool-schemas'; // Import schemas from central location


// Import the schemas directly from tool-schemas
import {
  RetrieveLoreInfoInputSchema,
  RetrieveLoreInfoOutputSchema
} from '@/ai/tool-schemas';

// Create a tool definition without using ai.defineTool to avoid circular dependency
export const retrieveLoreInfoToolDefinition = {
  name: 'retrieveLoreInfoTool',
  description: 'Queries the established series lorebook for specific details based on a search term. Use this to find information about characters, places, events, concepts, etc., to ensure narrative consistency or answer player queries about the world.',
  inputSchema: RetrieveLoreInfoInputSchema,
  outputSchema: RetrieveLoreInfoOutputSchema,
};

// Create the implementation function separately
export async function retrieveLoreInfoImplementation(input: RetrieveLoreInfoInput): Promise<RetrieveLoreInfoOutput> {
  const gameState = await getCurrentGameState(); // Get the current server-side game state
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
        // If category hint is provided and doesn't match, skip (unless it's a very general search)
        // For simplicity, we'll allow broad searches if category hint doesn't match,
        // but prioritize matches if category hint IS provided and matches.
      }

      if (entry.name?.toLowerCase().includes(searchTerm)) {
        match = true;
      }
      if (entry.description?.toLowerCase().includes(searchTerm)) {
        match = true;
      }

      if (match) {
        foundSnippets.push(`From '${entry.category} - ${entry.name}': ${entry.description}`);
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

// This will be imported in tools.ts to create the actual tool
