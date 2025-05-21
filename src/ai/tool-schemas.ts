'use server';
/**
 * @fileOverview Schema definitions for all AI tools to avoid circular dependencies
 */

import {z} from 'genkit';

// Retrieve Lore Info schemas
export const RetrieveLoreInfoInputSchema = z.object({
  searchTerm: z.string().describe("A keyword or phrase to search for within the lorebook (e.g., a character's name, a location, a concept)."),
  categoryHint: z.string().optional().describe("An optional hint for the category to search within (e.g., 'Locations', 'Key Characters & NPCs').")
});
export type RetrieveLoreInfoInput = z.infer<typeof RetrieveLoreInfoInputSchema>;

export const RetrieveLoreInfoOutputSchema = z.object({
  relevantInfo: z.string().describe("A summary of relevant information found in the lorebook matching the search term, or a statement if no information was found. Should be concise and directly usable by the AI in its narrative."),
  found: z.boolean().describe("Whether any relevant information was found.")
});
export type RetrieveLoreInfoOutput = z.infer<typeof RetrieveLoreInfoOutputSchema>;

// Add NPC to Lorebook schemas
export const AddNpcToLorebookInputSchema = z.object({
  npcName: z.string().describe("The name of the NPC to add to the lorebook."),
  npcDescription: z.string().describe("A detailed description of the NPC to add to the lorebook."),
  category: z.string().describe("The category this NPC belongs to in the lorebook (e.g., 'Key Characters & NPCs', 'Allies', 'Antagonists')."),
});
export type AddNpcToLorebookInput = z.infer<typeof AddNpcToLorebookInputSchema>;

export const AddNpcToLorebookOutputSchema = z.object({
  success: z.boolean().describe("Whether the NPC was successfully added to the lorebook."),
  message: z.string().describe("A message describing the result of the operation."),
});
export type AddNpcToLorebookOutput = z.infer<typeof AddNpcToLorebookOutputSchema>;
