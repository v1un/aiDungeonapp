'use server';
/**
 * @fileOverview Generates details for a fictional series, including an initial quest and a structured lorebook.
 *
 * - generateSeriesDetails - A function that generates details about a series.
 * - GenerateSeriesDetailsInput - The input type for the generateSeriesDetails function.
 * - GenerateSeriesDetailsOutput - The return type for the generateSeriesDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { LorebookSchema, QuestSchema, CharacterStatsSchema, LoreEntrySchema } from '@/types'; // Assuming CharacterStatsSchema is available or defined in types.ts
import dotenv from 'dotenv';

// Load environment variables
dotenv.config(); // For .env
dotenv.config({ path: '.env.local', override: true }); // For .env.local

// Helper function to provide default CharacterStats if not fully parsed
const defaultCharacterStats = (): z.infer<typeof CharacterStatsSchema> => ({
  strength: 'Average',
  dexterity: 'Average',
  intelligence: 'Average',
  magicPower: 'N/A',
  luck: 'Average',
  specialAbility: 'None specified',
});

// Helper function to provide default Quest if not fully parsed
const defaultInitialQuestOmitted = (): Omit<z.infer<typeof QuestSchema>, 'id' | 'status'> => ({
  title: "Survive!",
  description: "Figure out where you are and what to do next.",
  objectives: ["Stay alive", "Explore your surroundings"],
  rewards: ["Experience"],
});


const GenerateSeriesDetailsInputSchema = z.object({
  seriesName: z.string().describe('The name of the fictional series (e.g., "Re:Zero", "Star Wars", "Harry Potter").'),
});
export type GenerateSeriesDetailsInput = z.infer<typeof GenerateSeriesDetailsInputSchema>;

const GenerateSeriesDetailsOutputSchema = z.object({
  seriesTitle: z.string().describe("The canonical, official title of the series."),
  mainCharacter: z.object({
    name: z.string().describe("The full name of the primary protagonist."),
    description: z.string().describe("A detailed description of the main character (2-3 sentences), focusing on their personality, core motivations, iconic abilities/traits relevant at the series' start, and perhaps a key internal conflict they face early on. Use markdown for emphasis (e.g., **bold** for names or key traits, *italics* for thoughts or nuances)."),
    stats: z.object({
      strength: z.string().describe("A thematic or descriptive value for the character's physical strength (e.g., 'Average', 'Overwhelmingly Powerful', 'Weak but Resilient'). Be creative and true to the series."),
      dexterity: z.string().describe("A thematic or descriptive value for the character's agility, reflexes, or nimbleness."),
      intelligence: z.string().describe("A thematic or descriptive value for the character's intellect, knowledge, or cunning."),
      magicPower: z.string().optional().describe("A thematic or descriptive value for magical aptitude, if applicable. Use 'N/A' if not, or describe its nature (e.g., 'Untapped Potential', 'Master of Elemental Magic')."),
      luck: z.string().optional().describe("A thematic or descriptive value for the character's fortune or typical luck (e.g., 'Cursed', 'Surprisingly Fortunate', 'Average')."),
      specialAbility: z.string().optional().describe("A concise description of a notable special ability or unique trait pivotal to the character, especially early in the series (e.g., 'Return by Death - Resets time upon death', 'Force Sensitivity - Untrained').")
    }).describe("Key thematic stats or attributes. These should be fitting and descriptive, reflecting the character's portrayal at the beginning of the series.")
  }).describe("Detailed information about the main protagonist."),
  lorebook: LorebookSchema.describe("A structured and comprehensive lorebook for the series."),
  otherCharacters: z.array(
    z.object({
      name: z.string().describe("The full name of an important supporting character, antagonist, or key figure present or relevant early in the series."),
      description: z.string().describe("A brief description (1-2 sentences) of this character, their relationship to the main character (if any), their primary goal/role at the series' start, and a defining trait. Use markdown for emphasis."),
    })
  ).min(3).max(5).describe("A list of 3 to 5 other notable characters crucial to the initial stages of the series."),
  initialInventory: z.array(z.string()).optional().describe("A list of 2-3 thematic starting items for the main character, directly relevant to their situation at the very beginning of the series. e.g., ['Tattered Clothes', 'A Mysterious Locket', 'Empty Water Canteen']. If none, can be an empty array or omit.").default([]),
  startingLocation: z.string().optional().describe("The specific, named location where the story or player interaction begins, from the main character's perspective at the series' outset. e.g., 'A Dusty Alley in the Lower District of Lugnica', 'Inside the Millennium Falcon Cockpit', 'The Forbidden Forest Edge'. Default to 'An Unfamiliar Place' if truly ambiguous for the series start.").default("An Unfamiliar Place"),
  initialQuest: z.object({
    title: z.string().describe('The title of the generated quest.'),
    description: z.string().describe('A detailed description of the generated quest from the main character\'s perspective.'),
    objectives: z.array(z.string()).min(2).max(4).describe('A list of 2-4 clear, actionable objectives for the quest.'),
    rewards: z.array(z.string()).min(1).max(3).describe('A list of 1-3 thematic rewards for completing the quest (e.g., item, information, new contact).'),
    id: z.string().describe("A unique identifier for the quest.").default(() => `quest-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    status: z.enum(['active', 'completed', 'failed']).describe("The current status of the quest.").default('active')
  }).describe("An initial main quest. This quest must be an *immediate* challenge or goal for the main character, directly stemming from their `startingLocation` and initial predicament as described in `initialPromptForPlayer`. It should guide the player's very first actions."),
  initialPromptForPlayer: z.string().describe("A compelling, direct question or immediate choice to present to the player to start their interaction. This prompt should seamlessly flow from the `startingLocation` and the `initialQuest` description, putting the player in the MC's shoes. e.g., 'The alley is dark, and the thugs are closing in on the silver-haired girl. What do you shout, or what is your first move?' or 'The escape pod has crashed. Alarms are blaring. Your first priority is...? What do you do?' Use markdown for emphasis and atmosphere.")
}).describe("Comprehensive details generated for a fictional series to set up an RPG-like experience.");
export type GenerateSeriesDetailsOutput = z.infer<typeof GenerateSeriesDetailsOutputSchema>;

export async function generateSeriesDetails(input: GenerateSeriesDetailsInput): Promise<SeriesDetailsOutput> {
  const output = await generateSeriesDetailsFlow(input);
  // Ensure the initialQuest, if present, gets a system-generated ID and status
  const fullOutput: SeriesDetailsOutput = { ...output };
  if (output.initialQuest) {
    fullOutput.initialQuest = {
        ...output.initialQuest, // Base properties
        id: `quest-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        status: 'active' as const,
    };
  }
  return fullOutput;
}

// Type alias for the output of the flow before system modifications (like adding quest ID/status)
type SeriesDetailsOutput = z.infer<typeof GenerateSeriesDetailsOutputSchema>;


const prompt = ai.definePrompt({
  name: 'generateSeriesDetailsPrompt',
  input: {schema: GenerateSeriesDetailsInputSchema},
  output: {schema: GenerateSeriesDetailsOutputSchema},
  prompt: `You are an expert world-builder and narrative designer for immersive text-based RPGs. Your task is to generate a rich and detailed starting point for a game set in the universe of "{{seriesName}}".

Adhere strictly to the JSON output schema provided. Encourage the use of simple markdown (like **bold** for emphasis, *italics* for thoughts or nuances) in descriptive text fields.

Key Generation Guidelines:

1.  **Series Title**: Provide the canonical, official title.
2.  **Main Character**:
    *   **Name**: The protagonist's full name.
    *   **Description**: (2-3 sentences) Focus on personality, core motivations, iconic abilities/traits *at the series' beginning*. Mention key internal conflicts.
    *   **Stats**: Thematic, *descriptive* stats (Strength, Dexterity, Intelligence, Magic Power, Luck, Special Ability).

3.  **Lorebook**: This is crucial for immersion. Generate a structured lorebook:
    *   **Overall Summary**: (1-2 paragraphs) Briefly describe the series' world, its primary conflict, and central themes.
    *   **Entries**: Generate 10-20 detailed \\\`LoreEntry\\\` objects. Each entry needs a \\\`name\\\`, a \\\`description\\\` (2-4 sentences, use markdown), and a \\\`category\\\`.
        *   Distribute entries across diverse, relevant categories such as:
            *   'Key Locations': (e.g., specific cities, important landmarks, mystical realms)
            *   'Important NPCs': (e.g., allies, mentors, early antagonists not covered in 'Other Characters')
            *   'Historical Events': (e.g., past wars, founding events, prophecies that shape the present)
            *   'Magic Systems & Unique Technologies': (e.g., how magic works, who uses it, key technologies)
            *   'Factions & Organizations': (e.g., guilds, kingdoms, secret societies, their goals)
            *   'Creatures & Races': (e.g., non-human species, significant beasts)
            *   'Cultural Notes': (e.g., customs, societal norms, beliefs)
            *   'Important Items & Artifacts': (e.g., legendary weapons, key plot devices)
        *   Ensure descriptions are informative and engaging.

4.  **Other Characters**: (3-5 characters) For each:
    *   **Name**: Full name.
    *   **Description**: (1-2 sentences) Relationship to MC, initial role/goal, defining trait.

5.  **Initial Inventory**: (2-3 items) Thematic items the MC would have at the *very beginning*.

6.  **Starting Location**: Specific, descriptive location where the MC finds themselves *immediately*.

7.  **Initial Quest**:
    *   **Title**: Captivating and relevant.
    *   **Description**: (From MC's POV) Set the scene based on \\\`startingLocation\\\`. What is the *immediate* problem, goal, or mystery facing the MC? This should lead directly into the \\\`initialPromptForPlayer\\\`.
    *   **Objectives**: 2-3 clear, actionable first steps the MC needs to take.
    *   **Rewards**: Thematic, initial rewards (can be information, a small item, safety, etc.).
    This quest MUST be the player's first major goal, directly tied to the initial situation.

8.  **Initial Prompt for Player**: A direct, engaging question or choice for the player to start their interaction. This prompt MUST seamlessly flow from the \\\`startingLocation\\\` and the \\\`initialQuest\\\` description, putting the player in the MC's shoes at that very moment. (e.g., 'The alley is dark, and the thugs are closing in on the silver-haired girl. What do you shout, or what is your first move?' or 'The escape pod has crashed. Alarms are blaring. Your first priority is...? What do you do?'). Use markdown for emphasis and atmosphere.

Ensure all generated content is consistent with the "{{seriesName}}" canon, particularly its initial stages. The goal is to create a deeply immersive starting point.
`,
});

const generateSeriesDetailsFlow = ai.defineFlow(
  {
    name: 'generateSeriesDetailsFlow',
    inputSchema: GenerateSeriesDetailsInputSchema,
    outputSchema: GenerateSeriesDetailsOutputSchema,
  },
  async (input: GenerateSeriesDetailsInput): Promise<GenerateSeriesDetailsOutput> => {
    const aiProvider = process.env.AI_PROVIDER || 'googleai';

    if (aiProvider === 'ollama') {
      const gemmaResult = await gemmaGenerateSeriesDetailsPrompt(input);
      const textOutput = typeof gemmaResult === 'string' ? gemmaResult : (gemmaResult as any).seriesDetailsText || '';
      
      // Initialize with defaults
      let output: GenerateSeriesDetailsOutput = {
        seriesTitle: "Title (Parsing Failed)",
        mainCharacter: {
          name: "MC Name (Parsing Failed)",
          description: "MC Description (Parsing Failed)",
          stats: defaultCharacterStats(),
        },
        lorebook: {
          overallSummary: "Lorebook Summary (Parsing Failed)",
          entries: [],
        },
        otherCharacters: [],
        initialInventory: ["Basic Item (Parsing Failed)"],
        startingLocation: "An Unfamiliar Place (Parsing Failed)",
        initialQuest: defaultInitialQuestOmitted(),
        initialPromptForPlayer: "What do you do? (Parsing Failed)",
      };

      try {
        // Canonical Series Title
        const titleMatch = textOutput.match(/# Canonical Series Title\s*([\s\S]*?)(?=\n#|$)/im);
        if (titleMatch && titleMatch[1]) output.seriesTitle = titleMatch[1].trim();

        // Main Character
        const mcNameMatch = textOutput.match(/## Name\s*([\s\S]*?)(?=\n## Description|$)/im);
        if (mcNameMatch && mcNameMatch[1]) output.mainCharacter.name = mcNameMatch[1].trim();
        
        const mcDescMatch = textOutput.match(/## Description\s*([\s\S]*?)(?=\n## Thematic Stats|$)/im);
        if (mcDescMatch && mcDescMatch[1]) output.mainCharacter.description = mcDescMatch[1].trim();

        const statsBlockMatch = textOutput.match(/## Thematic Stats\s*([\s\S]*?)(?=\n# Lorebook|$)/im);
        if (statsBlockMatch && statsBlockMatch[1]) {
          const statsText = statsBlockMatch[1];
          const strMatch = statsText.match(/-\s*Strength:\s*(.*)/im);
          if (strMatch && strMatch[1]) output.mainCharacter.stats.strength = strMatch[1].trim();
          const agiMatch = statsText.match(/-\s*Agility:\s*(.*)/im); // Map Agility to Dexterity
          if (agiMatch && agiMatch[1]) output.mainCharacter.stats.dexterity = agiMatch[1].trim();
          const witsMatch = statsText.match(/-\s*Wits:\s*(.*)/im);     // Map Wits to Intelligence
          if (witsMatch && witsMatch[1]) output.mainCharacter.stats.intelligence = witsMatch[1].trim();
          const charmMatch = statsText.match(/-\s*Charm:\s*(.*)/im);  // Map Charm to Charisma (schema has charisma, but prompt used charm for Gemma)
                                                                    // Assuming CharacterStatsSchema has charisma. If not, this needs adjustment or schema change.
                                                                    // For now, let's assume charisma is not in CharacterStatsSchema, so we map to an existing optional field or ignore.
                                                                    // Let's map it to 'luck' as a placeholder if available.
          if (charmMatch && charmMatch[1]) output.mainCharacter.stats.luck = `Charm: ${charmMatch[1].trim()}`; // Or map to a more appropriate field
           // For magicPower, specialAbility, they are not explicitly asked in Gemma's prompt for simplicity. They'll use defaults.
        }

        // Lorebook
        const loreSummaryMatch = textOutput.match(/## Overall Summary\s*([\s\S]*?)(?=\n## Lore Entries|$)/im);
        if (loreSummaryMatch && loreSummaryMatch[1]) output.lorebook.overallSummary = loreSummaryMatch[1].trim();
        
        const loreEntriesBlockMatch = textOutput.match(/## Lore Entries\s*([\s\S]*?)(?=\n# Other Notable Characters|$)/im);
        if (loreEntriesBlockMatch && loreEntriesBlockMatch[1]) {
          const categoriesText = loreEntriesBlockMatch[1].split(/### Category:/im).slice(1);
          for (const catText of categoriesText) {
            const categoryNameMatch = catText.match(/^(.*?)\n/im);
            if (categoryNameMatch && categoryNameMatch[1]) {
              const category = categoryNameMatch[1].trim();
              const entryMatches = catText.matchAll(/-\s*\*\*(.*?):\*\*\s*(.*)/gim);
              for (const entryMatch of entryMatches) {
                if (entryMatch[1] && entryMatch[2]) {
                  output.lorebook.entries.push({ name: entryMatch[1].trim(), description: entryMatch[2].trim(), category });
                }
              }
            }
          }
        }

        // Other Notable Characters
        const otherCharsBlockMatch = textOutput.match(/# Other Notable Characters\s*([\s\S]*?)(?=\n# Initial Inventory|$)/im);
        if (otherCharsBlockMatch && otherCharsBlockMatch[1]) {
          const charMatches = otherCharsBlockMatch[1].matchAll(/-\s*\*\*(.*?):\*\*\s*(.*)/gim);
          for (const charMatch of charMatches) {
            if (charMatch[1] && charMatch[2]) {
              output.otherCharacters.push({ name: charMatch[1].trim(), description: charMatch[2].trim() });
            }
          }
        }

        // Initial Inventory
        const inventoryBlockMatch = textOutput.match(/# Initial Inventory\s*([\s\S]*?)(?=\n# Starting Location|$)/im);
        if (inventoryBlockMatch && inventoryBlockMatch[1]) {
          output.initialInventory = inventoryBlockMatch[1]
            .split('\n')
            .map(item => item.replace(/-\s*/, '').trim())
            .filter(item => item.length > 0);
        }

        // Starting Location
        const startLocNameMatch = textOutput.match(/# Starting Location\s*## Name\s*([\s\S]*?)(?=\n## Description|$)/im);
        if (startLocNameMatch && startLocNameMatch[1]) output.startingLocation = startLocNameMatch[1].trim();
        // Note: The schema's startingLocation is a single string. The Gemma prompt asked for Name and Description.
        // The description part of starting location can be naturally part of the initialPromptForPlayer.

        // Initial Quest
        const questTitleMatch = textOutput.match(/# Initial Quest\s*## Title\s*([\s\S]*?)(?=\n## Description|$)/im);
        if (questTitleMatch && questTitleMatch[1]) output.initialQuest.title = questTitleMatch[1].trim();
        
        const questDescMatch = textOutput.match(/## Description\s*([\s\S]*?)(?=\n# Initial Player Prompt|$)/im);
        if (questDescMatch && questDescMatch[1]) output.initialQuest.description = questDescMatch[1].trim();
        // Objectives and Rewards for initialQuest are not explicitly parsed here for simplicity, uses defaults.

        // Initial Player Prompt
        const playerPromptMatch = textOutput.match(/# Initial Player Prompt\s*([\s\S]*)/im);
        if (playerPromptMatch && playerPromptMatch[1]) output.initialPromptForPlayer = playerPromptMatch[1].trim();

      } catch (parseError) {
        console.error("Error parsing Gemma output for generateSeriesDetails:", parseError);
        // Output will retain defaults for fields that failed to parse
      }
      return output;

    } else {
      // Google AI / Gemini Path (existing logic)
      const geminiResult = await prompt(input);
      if (!geminiResult.output) {
          console.error("AI (Gemini) failed to generate series details. Output was null/undefined.");
          // Return a default structure that matches GenerateSeriesDetailsOutputSchema
           return {
            seriesTitle: input.seriesName + " (Generation Failed)",
            mainCharacter: {
              name: "Default Character",
              description: "Default description due to generation error.",
              stats: defaultCharacterStats(),
            },
            lorebook: {
              overallSummary: "Default lorebook summary due to generation error.",
              entries: [{name: "Default Entry", description: "Default entry description", category: "Default"}],
            },
            otherCharacters: [{name: "Default Other Character", description: "Default other character description"}],
            initialInventory: ["Default item"],
            startingLocation: "Default starting location",
            initialQuest: defaultInitialQuestOmitted(),
            initialPromptForPlayer: "What do you do? (Generation failed)",
          };
      }
      return geminiResult.output;
    }
  }
);

// New prompt for Gemma (Ollama) - tool-less
const gemmaGenerateSeriesDetailsPrompt = ai.definePrompt({
  name: 'gemmaGenerateSeriesDetailsPrompt',
  input: { schema: GenerateSeriesDetailsInputSchema },
  // No explicit output schema, expect raw string.
  // NO TOOLS for Gemma
  prompt: `You are an expert world-builder and narrative designer. Generate detailed starting information for a game based on the series: "{{seriesName}}".
Format your response strictly using Markdown as follows:

# Canonical Series Title
[Provide the full, official title of the series]

# Main Character Profile
## Name
[Protagonist's Full Name]
## Description
[2-3 sentences: personality, core motivations, iconic abilities/traits at series start, key internal conflict. Use **bold** and *italics* for emphasis.]
## Thematic Stats
- Strength: [Thematic value/descriptor, e.g., Average, Overwhelmingly Powerful, Weak but Resilient]
- Agility: [Thematic value/descriptor, e.g., Cat-like Reflexes, Clumsy, Swift]
- Wits: [Thematic value/descriptor, e.g., Master Strategist, Average, Easily Fooled]
- Charm: [Thematic value/descriptor, e.g., Highly Charismatic, Socially Awkward, Manipulative]
(Note: Magic Power, Luck, Special Ability can be omitted for this simpler output, or briefly mentioned in Description if vital.)

# Lorebook
## Overall Summary
[1-2 paragraphs: series' world, primary conflict, central themes.]
## Lore Entries
(Provide 5-7 diverse entries. Use the specified categories.)
### Category: Key Locations
- **[Location Name 1]:** [Brief description, 1-2 sentences. e.g., A bustling port city known for its trade.]
- **[Location Name 2]:** [Brief description. e.g., An ancient forest rumored to hold magical secrets.]
### Category: Key NPCs
- **[NPC Name 1 (Ally/Mentor/Early Antagonist)]:** [Brief description, 1-2 sentences. e.g., The wise old wizard who guides the hero.]
- **[NPC Name 2 (Different Role)]:** [Brief description. e.g., A cunning rival who often crosses the hero's path.]
### Category: Historical Events
- **[Event Name 1]:** [Brief description, 1-2 sentences. e.g., The Great War that shaped the current political landscape.]
### Category: Magic Systems / Unique Technologies (If applicable, otherwise omit category)
- **[System/Technology Name]:** [Brief description, 1-2 sentences. e.g., How elemental magic works in this world.]
### Category: Factions / Organizations
- **[Faction Name 1]:** [Brief description, 1-2 sentences. e.g., The Royal Guard sworn to protect the kingdom.]

# Other Notable Characters
(Provide 2-3 other important characters relevant at the start.)
- **[Character Name 1]:** [Brief description, 1-2 sentences: role, relationship to MC, defining trait.]
- **[Character Name 2]:** [Brief description.]

# Initial Inventory
(List 2-3 thematic starting items.)
- [Item 1]
- [Item 2]

# Starting Location
## Name
[Specific, named location where the story begins]
## Description
[Brief, 1-2 sentence description of this starting location. This sets the immediate scene.]

# Initial Quest
## Title
[Captivating title for the MC's very first, immediate quest/goal]
## Description
[1-2 sentences describing the immediate problem or goal from MC's perspective, tied to Starting Location and Initial Player Prompt.]

# Initial Player Prompt
[A compelling, direct question or immediate choice for the player to start the game, flowing from the Starting Location and Initial Quest. e.g., "You see the guards approaching. Do you try to hide, or stand your ground?"]

Ensure all content is consistent with the "{{seriesName}}" canon, especially its initial stages. Use Markdown strictly as shown.
`,
});

