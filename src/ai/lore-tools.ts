/**
 * @fileOverview Flat implementation of lore-related tools to avoid circular dependencies
 */

// Note: Removed 'use server' directive as this file exports non-async objects

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import type { Lorebook } from '@/types';
import { getCurrentGameState } from '@/lib/game-actions';

// Global variable to store the current session ID during tool execution
let currentSessionId: string | undefined;

// Function to set the current session ID for tool usage
export function setCurrentSessionIdForTools(sessionId: string | undefined) {
  currentSessionId = sessionId;
}

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
  const gameState = await getCurrentGameState(currentSessionId);
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

  // Enhanced search in lore entries with more sophisticated matching
  if (lorebook.entries && lorebook.entries.length > 0) {
    // First pass: Look for exact matches or close word matches
    const exactMatches: string[] = [];
    const partialMatches: string[] = [];
    const relatedMatches: string[] = [];
    
    // Split search term into words for more granular matching
    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    lorebook.entries.forEach(entry => {
      // Skip if category hint provided and doesn't match
      if (input.categoryHint && entry.category?.toLowerCase() !== input.categoryHint.toLowerCase()) {
        return;
      }
      
      const entryName = entry.name?.toLowerCase() || "";
      const entryDesc = entry.description?.toLowerCase() || "";
      
      // Exact match on name or close match
      if (entryName === searchTerm || entryName.includes(searchTerm)) {
        exactMatches.push(`From '${entry.category} - ${entry.name}': ${entry.description}`);
        return;
      }
      
      // Exact match in description
      if (entryDesc.includes(searchTerm)) {
        exactMatches.push(`From '${entry.category} - ${entry.name}': ${entry.description}`);
        return;
      }
      
      // Partial word matches - when multiple words in search term
      if (searchWords.length > 1) {
        const matchingWords = searchWords.filter(word => 
          entryName.includes(word) || entryDesc.includes(word)
        );
        
        if (matchingWords.length > 0) {
          const matchQuality = matchingWords.length / searchWords.length;
          
          if (matchQuality > 0.5) {
            partialMatches.push(`From '${entry.category} - ${entry.name}': ${entry.description}`);
            return;
          }
        }
      }
      
      // Check for related concepts based on category match or key terms
      const isRelatedByCategory = 
        (searchTerm.includes('magic') && (entry.category.toLowerCase().includes('magic') || entry.category.toLowerCase().includes('abilities'))) ||
        (searchTerm.includes('location') && entry.category.toLowerCase().includes('location')) ||
        (searchTerm.includes('character') && entry.category.toLowerCase().includes('character')) ||
        (searchTerm.includes('history') && entry.category.toLowerCase().includes('history'));
        
      if (isRelatedByCategory || 
          (entryName.length > 0 && searchWords.some(word => entryName.includes(word))) ||
          searchWords.some(word => entryDesc.includes(word) && word.length > 3)) {
        relatedMatches.push(`From '${entry.category} - ${entry.name}': ${entry.description}`);
      }
    });
    
    // Combine matches in order of relevance
    foundSnippets.push(...exactMatches, ...partialMatches, ...relatedMatches);
  }
  
  if (foundSnippets.length === 0) {
    return { relevantInfo: `No specific information found for "${input.searchTerm}" in the lorebook.`, found: false };
  }

  // Return more snippets to provide comprehensive context for the AI
  const MAX_SNIPPETS = 6; // Increased from 3 to 6 for more context
  
  // Sort snippets by relevance (prioritize exact matches in names over descriptions)
  foundSnippets.sort((a, b) => {
    const aHasNameMatch = a.includes(`- ${input.searchTerm}`) || a.toLowerCase().includes(`- ${input.searchTerm.toLowerCase()}`);
    const bHasNameMatch = b.includes(`- ${input.searchTerm}`) || b.toLowerCase().includes(`- ${input.searchTerm.toLowerCase()}`);
    
    if (aHasNameMatch && !bHasNameMatch) return -1;
    if (!aHasNameMatch && bHasNameMatch) return 1;
    return 0;
  });
  
  const info = foundSnippets.slice(0, MAX_SNIPPETS).join('\n\n');
  
  return { 
    relevantInfo: `Found detailed information related to "${input.searchTerm}":\n${info}`, 
    found: true 
  };
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

// Schema for adding an NPC to the lorebook
const AddNpcToLorebookInputSchema = z.object({
  npcName: z.string().describe("The name of the NPC to add to the lorebook."),
  npcDescription: z.string().describe("A detailed description of the NPC to add to the lorebook."),
  category: z.string().describe("The category this NPC belongs to in the lorebook (e.g., 'Key Characters & NPCs', 'Allies', 'Antagonists')."),
});
type AddNpcToLorebookInput = z.infer<typeof AddNpcToLorebookInputSchema>;

const AddNpcToLorebookOutputSchema = z.object({
  success: z.boolean().describe("Whether the NPC was successfully added to the lorebook."),
  message: z.string().describe("A message describing the result of the operation."),
});
type AddNpcToLorebookOutput = z.infer<typeof AddNpcToLorebookOutputSchema>;

// Implementation function for adding an NPC to the lorebook
async function addNpcToLorebookImplementation(input: AddNpcToLorebookInput): Promise<AddNpcToLorebookOutput> {
  const gameState = await getCurrentGameState(currentSessionId);
  if (!gameState || !gameState.seriesDetails || !gameState.seriesDetails.lorebook) {
    return { success: false, message: "No lorebook has been established for the current series." };
  }

  // Check if the NPC already exists in the lorebook
  const existingNpc = gameState.seriesDetails.lorebook.entries.find(
    entry => entry.name.toLowerCase() === input.npcName.toLowerCase()
  );

  if (existingNpc) {
    // Update the existing NPC entry
    existingNpc.description = input.npcDescription;
    existingNpc.category = input.category;
    return { 
      success: true, 
      message: `Updated existing NPC "${input.npcName}" in the lorebook.` 
    };
  } else {
    // Add the new NPC to the lorebook
    gameState.seriesDetails.lorebook.entries.push({
      name: input.npcName,
      description: input.npcDescription,
      category: input.category,
    });
    return { 
      success: true, 
      message: `Added new NPC "${input.npcName}" to the lorebook under category "${input.category}".` 
    };
  }
}

// Create the tool for adding NPCs to the lorebook
export const addNpcToLorebookTool = ai.defineTool(
  {
    name: 'addNpcToLorebookTool',
    description: 'Adds a new NPC to the lorebook or updates an existing one. This ensures the NPC becomes part of the world knowledge and can be referenced in future interactions.',
    inputSchema: AddNpcToLorebookInputSchema,
    outputSchema: AddNpcToLorebookOutputSchema,
  },
  addNpcToLorebookImplementation
);

// Schema for adding a location to the lorebook
const AddLocationToLorebookInputSchema = z.object({
  locationName: z.string().describe("The name of the location to add to the lorebook."),
  locationDescription: z.string().describe("A detailed description of the location to add to the lorebook."),
  category: z.string().describe("The category this location belongs to in the lorebook (e.g., 'Key Locations', 'Major Regions', 'Natural Features')."),
  connectedLocations: z.array(z.string()).optional().describe("Names of locations connected to this one (optional)."),
  notableFeatures: z.array(z.string()).optional().describe("Notable features of this location (optional)."),
});
type AddLocationToLorebookInput = z.infer<typeof AddLocationToLorebookInputSchema>;

const AddLocationToLorebookOutputSchema = z.object({
  success: z.boolean().describe("Whether the location was successfully added to the lorebook."),
  message: z.string().describe("A message describing the result of the operation."),
});
type AddLocationToLorebookOutput = z.infer<typeof AddLocationToLorebookOutputSchema>;

// Implementation function for adding a location to the lorebook
async function addLocationToLorebookImplementation(input: AddLocationToLorebookInput): Promise<AddLocationToLorebookOutput> {
  const gameState = await getCurrentGameState(currentSessionId);
  if (!gameState || !gameState.seriesDetails || !gameState.seriesDetails.lorebook) {
    return { success: false, message: "No lorebook has been established for the current series." };
  }

  // Prepare location description with optional features
  let enhancedDescription = input.locationDescription;
  
  if (input.notableFeatures && input.notableFeatures.length > 0) {
    enhancedDescription += `\n\n**Notable Features**: ${input.notableFeatures.join(', ')}`;
  }
  
  if (input.connectedLocations && input.connectedLocations.length > 0) {
    enhancedDescription += `\n\n**Connected to**: ${input.connectedLocations.join(', ')}`;
  }

  // Check if the location already exists in the lorebook
  const existingLocation = gameState.seriesDetails.lorebook.entries.find(
    entry => entry.name.toLowerCase() === input.locationName.toLowerCase() &&
            (entry.category === input.category || entry.category.includes('Location'))
  );

  if (existingLocation) {
    // Update the existing location entry
    existingLocation.description = enhancedDescription;
    existingLocation.category = input.category;
    return { 
      success: true, 
      message: `Updated existing location "${input.locationName}" in the lorebook.` 
    };
  } else {
    // Add the new location to the lorebook
    gameState.seriesDetails.lorebook.entries.push({
      name: input.locationName,
      description: enhancedDescription,
      category: input.category,
    });
    return { 
      success: true, 
      message: `Added new location "${input.locationName}" to the lorebook under category "${input.category}".` 
    };
  }
}

// Create the tool for adding locations to the lorebook
export const addLocationToLorebookTool = ai.defineTool(
  {
    name: 'addLocationToLorebookTool',
    description: 'Adds a new location to the lorebook or updates an existing one. This ensures the location becomes part of the world knowledge and can be referenced in future interactions.',
    inputSchema: AddLocationToLorebookInputSchema,
    outputSchema: AddLocationToLorebookOutputSchema,
  },
  addLocationToLorebookImplementation
);

// Schema for automatically enriching the lorebook with new entries based on the current narrative
const EnrichLorebookInputSchema = z.object({
  content: z.string().describe("The narrative content that contains information to extract for the lorebook. This should be rich, descriptive text about the world."),
  contextType: z.enum(['world', 'character', 'event', 'item', 'location', 'custom']).describe("The type of context being provided, to help categorize the new entries."),
  customCategory: z.string().optional().describe("If contextType is 'custom', specify the category name.")
});
type EnrichLorebookInput = z.infer<typeof EnrichLorebookInputSchema>;

const EnrichLorebookOutputSchema = z.object({
  entriesAdded: z.number().describe("Number of new entries added to the lorebook."),
  entriesUpdated: z.number().describe("Number of existing entries that were enriched with new information."),
  categories: z.array(z.string()).describe("The categories that were affected by the enrichment."),
  message: z.string().describe("A message describing the result of the operation.")
});
type EnrichLorebookOutput = z.infer<typeof EnrichLorebookOutputSchema>;

// Implementation function for enriching the lorebook from narrative content
async function enrichLorebookImplementation(input: EnrichLorebookInput): Promise<EnrichLorebookOutput> {
  const gameState = await getCurrentGameState(currentSessionId);
  if (!gameState || !gameState.seriesDetails || !gameState.seriesDetails.lorebook) {
    return { 
      entriesAdded: 0, 
      entriesUpdated: 0, 
      categories: [],
      message: "No lorebook has been established for the current series." 
    };
  }

  // Start with no changes
  let entriesAdded = 0;
  let entriesUpdated = 0;
  const affectedCategories = new Set<string>();
  
  // Determine appropriate category based on context type
  let category = '';
  switch (input.contextType) {
    case 'world':
      category = 'Cultural Notes';
      break;
    case 'character':
      category = 'Important NPCs';
      break;
    case 'event':
      category = 'Recent Events';
      break;
    case 'item':
      category = 'Important Items & Artifacts';
      break;
    case 'location':
      category = 'Key Locations';
      break;
    case 'custom':
      category = input.customCategory || 'Series-Specific Elements';
      break;
    default:
      category = 'Series-Specific Elements';
  }
  
  // Extract key phrases that might be significant proper nouns or concepts
  // This is a simplified extraction - in a real system, this might use entity recognition
  const content = input.content;
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const properNouns = new Set<string>();
  
  // Extract capitalized phrases that might be proper nouns
  const capitalizedPhraseRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  let match;
  while ((match = capitalizedPhraseRegex.exec(content)) !== null) {
    const phrase = match[1];
    // Filter out common sentence starters and trivial phrases
    if (phrase.length > 3 && !['The', 'A', 'An', 'This', 'That', 'These', 'Those', 'I', 'You', 'He', 'She', 'It', 'We', 'They'].includes(phrase)) {
      properNouns.add(phrase);
    }
  }
  
  // For each potential proper noun, see if we should add or update a lore entry
  for (const noun of properNouns) {
    // Skip if too short
    if (noun.length < 4) continue;
    
    // Look for sentences that mention this proper noun
    const relevantSentences = sentences.filter(s => s.includes(noun));
    if (relevantSentences.length === 0) continue;
    
    // Compile description from relevant sentences
    const description = relevantSentences.join('. ');
    
    // Check if this entry already exists
    const existingEntry = gameState.seriesDetails.lorebook.entries.find(
      entry => entry.name.toLowerCase() === noun.toLowerCase()
    );
    
    if (existingEntry) {
      // Update existing entry if we have new information to add
      if (!existingEntry.description.includes(description)) {
        existingEntry.description += `\n\n${description}`;
        entriesUpdated++;
        affectedCategories.add(existingEntry.category);
      }
    } else {
      // Add new entry
      gameState.seriesDetails.lorebook.entries.push({
        name: noun,
        description: description,
        category: category
      });
      entriesAdded++;
      affectedCategories.add(category);
    }
  }
  
  return {
    entriesAdded,
    entriesUpdated,
    categories: Array.from(affectedCategories),
    message: `Enriched lorebook with ${entriesAdded} new entries and updated ${entriesUpdated} existing entries.`
  };
}

// Create the tool for enriching the lorebook
export const enrichLorebookTool = ai.defineTool(
  {
    name: 'enrichLorebookTool',
    description: 'Automatically extracts important information from narrative text and adds it to the lorebook. Use this to maintain a rich, up-to-date lorebook without manual entry.',
    inputSchema: EnrichLorebookInputSchema,
    outputSchema: EnrichLorebookOutputSchema,
  },
  enrichLorebookImplementation
);

// Export all tools from this file
export const loreTools = {
  retrieveLoreInfoTool,
  addNpcToLorebookTool,
  addLocationToLorebookTool,
  enrichLorebookTool
};
