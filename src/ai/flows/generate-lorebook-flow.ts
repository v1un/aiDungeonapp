import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { LorebookSchema, LoreEntrySchema } from '@/types';

export const generateLorebookFlow = ai.defineFlow({
  name: 'generateLorebookFlow',
  inputSchema: z.object({ seriesName: z.string() }),
  outputSchema: z.object({ lorebook: LorebookSchema }),
}, async (input) => {
  // First, generate just the overall summary with minimal schema restrictions
  const summaryPrompt = ai.definePrompt({
    name: 'generateLorebookSummaryPrompt',
    input: { schema: z.object({ seriesName: z.string() }) },
    output: { schema: z.object({ overallSummary: z.string() }) },
    prompt: `Generate a comprehensive summary for "{{seriesName}}" lorebook. This is critical for immersion and **must be specific and strictly coherent** with the established lore, characters, tone, and unique elements of the "{{seriesName}}" universe.

The overall summary should be 2-3 paragraphs about the world, its primary conflict, central themes, and significant historical context, all **canon-accurate** to "{{seriesName}}".

Generate only the summary text, ensuring it is deeply rooted in and reflective of "{{seriesName}}".`  });
  
  let overallSummary;
  try {
    const summaryResult = await summaryPrompt(input);
    if (!summaryResult.output) {
      throw new Error('Failed to generate lorebook summary');
    }
    overallSummary = summaryResult.output.overallSummary;
    console.log("Successfully generated lorebook summary");
  } catch (error) {
    console.error("Error generating lorebook summary:", error);
    // Provide a fallback generic summary if generation fails
    overallSummary = `The world of "${input.seriesName}" is rich with unique characters, locations, and lore. This fictional universe contains its own history, cultures, and conflicts that shape the narrative.

The setting provides the backdrop for various adventures, challenges, and character developments that occur throughout the series. Major events and conflicts drive the story forward, creating tension and opportunities for growth.`;
  }
  
  // Define our target number of entries
  const ENTRY_TARGET = 85;
  
  // Define categories for better organization of entries
  // Using more categories to reach our target of ~85 entries
  const categories = [
    'Major Locations', 'Minor Locations', 'Key Characters & NPCs', 'Supporting Characters',
    'Historical Events', 'Recent Events', 'Magic Systems & Unique Technologies', 
    'Factions & Organizations', 'Creatures & Races', 'Cultural Notes',
    'Important Items & Artifacts', 'Mythology & Legends', 'Political Landscape'
  ];
  
  let allEntries: Array<z.infer<typeof LoreEntrySchema>> = [];
  
  // Function to retry batch generation with backoff
  async function retryBatchGeneration(category: string, retries = 2): Promise<z.infer<typeof LoreEntrySchema>[]> {
    // Schema for batch entries - increased to generate more entries per category to reach ~85 entries total
    const batchSchema = z.object({
      entries: z.array(LoreEntrySchema).min(4).max(7)
    });
    
    const batchPrompt = ai.definePrompt({
      name: `generate${category.replace(/\s+/g, '')}EntriesPrompt`,
      input: { schema: z.object({ seriesName: z.string(), category: z.string() }) },
      output: { schema: batchSchema },
      prompt: `Generate 4-7 detailed lorebook entries for the "${category}" category in "{{seriesName}}". All entries **must be strictly coherent** with the established canon of "{{seriesName}}".

Each entry should include:
- name: A specific title (character name, location name, event name, etc.) from "{{seriesName}}".
- description: A detailed 2-3 sentence description, reflecting its portrayal in "{{seriesName}}".
- category: Always use "{{category}}" as the category.

Focus on **canon accuracy** to the "{{seriesName}}" series and provide rich, specific details that would help a storyteller maintain consistency with "{{seriesName}}". Do not invent new lore.`    });
    
    // Decrease complexity for retry attempts but still aim for multiple entries
    const fallbackSchema = z.object({
      entries: z.array(LoreEntrySchema).min(2).max(5) // Still allow multiple entries on fallback
    });
    
    const fallbackPrompt = ai.definePrompt({
      name: `generateSimplified${category.replace(/\s+/g, '')}EntriesPrompt`,
      input: { schema: z.object({ seriesName: z.string(), category: z.string() }) },
      output: { schema: fallbackSchema },
      prompt: `Generate 3-5 simple entries for "${category}" in "{{seriesName}}". Ensure all entries are **strictly coherent** with the established canon of "{{seriesName}}".

Keep each entry concise with:
- name: Short title from "{{seriesName}}".
- description: 1-2 sentences only, reflecting its portrayal in "{{seriesName}}".
- category: Use "{{category}}".

**Canon accuracy** to "{{seriesName}}" is paramount. Do not invent new lore.`    });
    
    try {
      const batchResult = await batchPrompt({ seriesName: input.seriesName, category });
      if (batchResult.output && batchResult.output.entries.length > 0) {
        console.log(`Successfully generated ${batchResult.output.entries.length} entries for ${category}`);
        return batchResult.output.entries;
      }
      throw new Error("No entries generated");
    } catch (error) {
      if (retries > 0) {
        console.warn(`Failed to generate entries for ${category}, retrying with simpler schema (${retries} retries left):`, error);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        
        try {
          // Use the fallback, simpler prompt for retries
          const fallbackResult = await fallbackPrompt({ seriesName: input.seriesName, category });
          if (fallbackResult.output && fallbackResult.output.entries.length > 0) {
            console.log(`Successfully generated ${fallbackResult.output.entries.length} simplified entries for ${category}`);
            return fallbackResult.output.entries;
          }
        } catch (fallbackError) {
          console.warn(`Fallback generation failed for ${category}:`, fallbackError);
        }
        
        return retryBatchGeneration(category, retries - 1);
      } else {
        console.error(`Failed to generate entries for ${category} after all retries:`, error);
        // Return a minimal fallback entry to ensure we have something
        return [{
          name: `${category} in ${input.seriesName}`,
          description: `Important elements from the ${category.toLowerCase()} in the world of ${input.seriesName}.`,
          category
        }];
      }
    }
  }
  
  // Generate entries in batches by category
  // Note: batchPromises was declared but never used, removed it
  
  // Process some categories in parallel to speed up generation
  // but not too many to avoid rate limiting
  const batchSize = 2; // Process 2 categories at a time
  
  for (let i = 0; i < categories.length; i += batchSize) {
    const currentBatch = categories.slice(i, i + batchSize);
    const currentBatchPromises = currentBatch.map(category => retryBatchGeneration(category));
    
    const results = await Promise.allSettled(currentBatchPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allEntries = [...allEntries, ...result.value];
      } else {
        console.error(`Batch for ${currentBatch[index]} failed completely:`, result.reason);
      }
    });
    
    // Add a delay between batch groups to avoid rate limiting
    if (i + batchSize < categories.length) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  // Ensure we have at least the minimum required entries
  if (allEntries.length < 5) {
    console.warn(`Warning: Generated only ${allEntries.length} lore entries, less than the minimum required 5. Adding generic entries to meet requirement.`);
    
    // If we don't have enough entries, generate generic ones to meet the minimum requirement
    const remainingCount = 5 - allEntries.length;
    const genericCategories = [
      'Key Locations', 'Supporting Characters', 'World Elements'
    ];
    
    for (let i = 0; i < remainingCount; i++) {
      const categoryIndex = i % genericCategories.length;
      const category = genericCategories[categoryIndex];
      const entryNumber = Math.floor(i / genericCategories.length) + 1;
      
      allEntries.push({
        name: `${category} ${entryNumber}`,
        description: `An important ${category.toLowerCase()} in the world of ${input.seriesName} that adds depth to the story universe.`,
        category
      });
    }
  }
  
  // Try to generate additional generic entries to reach target count if we're far below
  if (allEntries.length < ENTRY_TARGET * 0.7) { // If we have less than 70% of target
    console.warn(`Warning: Generated only ${allEntries.length} lore entries, significantly below target of ${ENTRY_TARGET}. Adding additional generic entries.`);
    
    // Add more generic entries to help reach our target
    const additionalNeeded = Math.min(20, Math.floor((ENTRY_TARGET - allEntries.length) / 2)); // Don't add too many at once
    
    const expandedGenericCategories = [
      'Key Locations', 'Minor Locations', 'Supporting Characters', 'Historical Figures',
      'World Elements', 'Cultural Traditions', 'Notable Events', 'Magical Objects',
      'Unique Species', 'Political Systems', 'Military Forces', 'Economic Systems'
    ];
    
    for (let i = 0; i < additionalNeeded; i++) {
      const categoryIndex = i % expandedGenericCategories.length;
      const category = expandedGenericCategories[categoryIndex];
      const entryNumber = Math.floor(i / expandedGenericCategories.length) + 1;
      
      allEntries.push({
        name: `${category} ${entryNumber}`,
        description: `An important ${category.toLowerCase()} in the world of ${input.seriesName} that enriches the narrative universe with additional depth and context.`,
        category
      });
    }
  }
  
  // If we generate too many entries (> 100), trim them down to around our target
  if (allEntries.length > 100) {
    console.warn(`Warning: Generated ${allEntries.length} lore entries, exceeding maximum reasonable limit of 100. Trimming to ~${ENTRY_TARGET} entries.`);
    
    // Create a map to count entries per category
    const categoryCount = new Map<string, number>();
    allEntries.forEach(entry => {
      const count = categoryCount.get(entry.category) || 0;
      categoryCount.set(entry.category, count + 1);
    });
    
    // Sort categories by count (highest first)
    const sortedCategories = [...categoryCount.entries()].sort((a, b) => b[1] - a[1]);
    
    // Calculate how many entries to keep per category to achieve balanced distribution
    const trimmedEntries: z.infer<typeof LoreEntrySchema>[] = [];
    const categoriesToKeep = new Set<string>();
    
    // Keep track of all categories
    for (const [category] of sortedCategories) {
      categoriesToKeep.add(category);
    }
    
    // Allocate entries per category based on total number of categories
    const categoryCount2 = categoriesToKeep.size;
    const baseEntriesPerCategory = Math.floor(ENTRY_TARGET / categoryCount2);
    let remainingSlots = ENTRY_TARGET - (baseEntriesPerCategory * categoryCount2);
    
    // Distribute entries among categories
    for (const category of categoriesToKeep) {
      const entriesInCategory = allEntries.filter(e => e.category === category);
      // Calculate how many to keep for this category
      let keepCount = Math.min(baseEntriesPerCategory, entriesInCategory.length);
      
      // Add an extra entry for categories early in the list if we have remaining slots
      if (remainingSlots > 0) {
        keepCount += 1;
        remainingSlots -= 1;
      }
      
      trimmedEntries.push(...entriesInCategory.slice(0, keepCount));
    }
    
    // If we still have slots available (due to some categories having fewer entries than allowed)
    // add more entries from categories with excess entries
    if (trimmedEntries.length < ENTRY_TARGET) {
      const additionalSlotsNeeded = ENTRY_TARGET - trimmedEntries.length;
      const remainingEntries = allEntries.filter(entry => 
        !trimmedEntries.some(e => e.name === entry.name && e.category === entry.category)
      );
      
      // Sort remaining entries by category priority
      const priorityCategories = [
        'Key Characters & NPCs', 'Supporting Characters', 
        'Major Locations', 'Minor Locations', 
        'Historical Events', 'Recent Events'
      ];
      
      // First add entries from priority categories
      const priorityEntries = remainingEntries.filter(entry => 
        priorityCategories.includes(entry.category)
      );
      
      const otherEntries = remainingEntries.filter(entry => 
        !priorityCategories.includes(entry.category)
      );
      
      // Add entries in priority order until we hit target
      trimmedEntries.push(
        ...priorityEntries.slice(0, Math.min(additionalSlotsNeeded, priorityEntries.length)),
        ...otherEntries.slice(0, Math.max(0, additionalSlotsNeeded - priorityEntries.length))
      );
    }
    
    // Update allEntries to the trimmed version
    allEntries = trimmedEntries;
  }
  
  // Log success
  console.log(`Successfully generated lorebook with ${allEntries.length} entries across ${new Set(allEntries.map(e => e.category)).size} categories`);
  
  return { 
    lorebook: {
      overallSummary,
      entries: allEntries
    }
  };
});
