'use server';

import { z } from 'genkit';
import { StoryBranch, generateBranchesSchema, selectBranchSchema } from './narrative-branching-schemas';

/**
 * Narrative Branching Tool
 * 
 * This tool helps the AI generate potential story branches and consequences
 * for player choices, creating a more dynamic and responsive narrative.
 */

// Session-based storage for narrative branches
const sessionStoryBranches = new Map<string, StoryBranch[]>();

// Helper to get the current session ID
const getCurrentSessionId = (): string => {
  // Use a default session ID if none is set
  const sessionId = (global as {currentSessionId?: string}).currentSessionId || 'default-session';
  return sessionId;
};

// Helper functions to get session-specific data
const getStoryBranches = (): StoryBranch[] => {
  const sessionId = getCurrentSessionId();
  if (!sessionStoryBranches.has(sessionId)) {
    sessionStoryBranches.set(sessionId, []);
  }
  return sessionStoryBranches.get(sessionId)!;
};

// Function to generate narrative branches
export async function generateBranches(input: z.infer<typeof generateBranchesSchema>) {
  const { currentSituation, playerOptions, storyGenre, currentCharacters, tonePreference } = input;
  
  // Get session-specific story branches
  const storyBranches = getStoryBranches();
  
  // Clear old branches that might no longer be relevant
  const filteredBranches = storyBranches.filter(branch => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return branch.created > oneHourAgo;
  });
  
  // Clear the array and add filtered elements back
  storyBranches.length = 0;
  filteredBranches.forEach(branch => storyBranches.push(branch));
  
  // Generate a new branch for each player option with enhanced narrative design
  const newBranches: StoryBranch[] = playerOptions.map((action, index) => {
    // More sophisticated branch generation with context awareness
    
    // Extract key action type for more specific consequences
    const actionType = determineActionType(action);
    
    // Generate consequence based on action type, situation, and genre
    const consequence = generateDetailedConsequence(
      action, 
      actionType, 
      currentSituation, 
      storyGenre, 
      currentCharacters
    );
    
    // Generate a narrative hook with deeper storytelling elements
    const narrativeHook = generateNarrativeHook(
      action, 
      actionType, 
      storyGenre, 
      tonePreference, 
      currentCharacters
    );
    
    // Calculate probability based on multiple contextual factors
    const probability = calculateBranchProbability(
      action, 
      currentSituation, 
      storyGenre, 
      currentCharacters
    );
    
    // Generate a unique ID for this branch
    const branchId = `branch-${Date.now()}-${index}`;
    
    return {
      id: branchId,
      playerAction: action,
      consequence,
      narrativeHook,
      probability,
      created: Date.now()
    };
  });
  
  // Save the new branches to the session-specific array
  const sessionBranches = getStoryBranches();
  sessionBranches.push(...newBranches);
  
  return { branches: newBranches };
}

// Function to select the most appropriate branch based on player action
export async function selectBranch(input: z.infer<typeof selectBranchSchema>) {
  const { playerAction, relevantFactors, preferTone } = input;
  
  const storyBranches = getStoryBranches();
  
  if (storyBranches.length === 0) {
    return {
      selectedBranch: null,
      fallbackResponse: "No story branches have been generated yet. The story continues based on the player's action.",
      needsNewBranches: true
    };
  }
  
  // Improved branch matching with semantic relevance detection
  const matchedBranches = storyBranches.filter(branch => {
    // Check if the player action contains the branch action or vice versa
    const playerActionLower = playerAction.toLowerCase();
    const branchActionLower = branch.playerAction.toLowerCase();
    
    // Enhanced matching using semantic similarity detection
    const directMatch = branchActionLower.includes(playerActionLower) || 
                        playerActionLower.includes(branchActionLower);
    
    // Check for verb/action similarity
    const playerVerbs = extractActionVerbs(playerActionLower);
    const branchVerbs = extractActionVerbs(branchActionLower);
    const verbMatch = playerVerbs.some(v => branchVerbs.includes(v));
    
    // Match by keywords or concepts
    const playerKeywords = extractKeywords(playerActionLower);
    const branchKeywords = extractKeywords(branchActionLower);
    const keywordMatch = playerKeywords.some(k => branchKeywords.includes(k));
    
    return directMatch || verbMatch || keywordMatch;
  });
  
  if (matchedBranches.length === 0) {
    return {
      selectedBranch: null,
      fallbackResponse: "The character's action leads into uncharted territory, opening new possibilities in the story.",
      needsNewBranches: true
    };
  }
  
  // Score each matched branch with improved algorithm
  const scoredBranches = matchedBranches.map(branch => {
    // Start with base probability
    let score = branch.probability;
    
    // Factor in recency for more coherent narratives
    const currentTime = Date.now();
    const branchAge = currentTime - branch.created;
    const recencyBonus = Math.max(0, 0.2 - (branchAge / (60 * 60 * 1000)) * 0.05);
    score += recencyBonus;
    
    // Adjust score based on relevant factors if provided
    if (relevantFactors && relevantFactors.length > 0) {
      const relevanceFactor = relevantFactors.reduce((acc, factor) => {
        const factorLower = factor.toLowerCase();
        // Check if the factor is mentioned in the branch consequence or hook
        const consequenceMatch = branch.consequence.toLowerCase().includes(factorLower);
        const hookMatch = branch.narrativeHook.toLowerCase().includes(factorLower);
        // Weight these matches
        return acc + (consequenceMatch ? 0.15 : 0) + (hookMatch ? 0.1 : 0);
      }, 0);
      
      score += relevanceFactor;
    }
    
    // Adjust score based on tone preference if provided
    if (preferTone) {
      const toneMatch = branch.narrativeHook.toLowerCase().includes(preferTone.toLowerCase());
      score += toneMatch ? 0.25 : 0;
    }
    
    return { branch, score };
  });
  
  // Sort by score and select the best match
  scoredBranches.sort((a, b) => b.score - a.score);
  const selectedBranch = scoredBranches[0].branch;
  
  return { selectedBranch, needsNewBranches: false };
}

// Helper functions to extract action verbs and keywords
function extractActionVerbs(text: string): string[] {
  const commonActionVerbs = [
    "walk", "run", "attack", "talk", "speak", "ask", "examine", "look", "search", 
    "take", "grab", "pick", "open", "close", "use", "hide", "jump", "climb",
    "push", "pull", "move", "touch", "eat", "drink", "sleep", "rest", "swim",
    "fight", "flee", "escape", "investigate", "study", "read", "write", "cast",
    "throw", "drop", "give", "buy", "sell", "trade", "equip", "unequip"
  ];
  
  return commonActionVerbs.filter(verb => text.includes(verb));
}

function extractKeywords(text: string): string[] {
  // Remove common words and split into words
  const words = text.replace(/\b(the|a|an|and|or|but|in|on|at|to|for|with|by|of|is|are|am|was|were|be|been|being)\b/gi, '')
                    .split(/\s+/)
                    .filter(word => word.length > 2);
  return words;
}

// Helper function to determine action type
function determineActionType(action: string): string {
  const actionLower = action.toLowerCase();
  
  if (actionLower.match(/attack|fight|strike|hit|kill|shoot|stab|punch|kick|battle/))
    return "combat";
  
  if (actionLower.match(/talk|speak|ask|negotiate|persuade|convince|discuss|chat|conversation/))
    return "social";
  
  if (actionLower.match(/hide|sneak|stealth|quiet|silently|unseen|conceal/))
    return "stealth";
  
  if (actionLower.match(/examine|search|look|investigate|study|analyze|inspect|check/))
    return "investigation";
  
  if (actionLower.match(/cast|spell|magic|incantation|enchant|summon|conjure/))
    return "magic";
  
  if (actionLower.match(/run|flee|escape|leave|exit|get away|retreat/))
    return "escape";
  
  if (actionLower.match(/pick|take|grab|acquire|obtain|loot|steal/))
    return "acquisition";
  
  if (actionLower.match(/heal|rest|sleep|recover|treat|bandage|cure/))
    return "recovery";
  
  if (actionLower.match(/climb|jump|swim|fly|traverse|cross/))
    return "movement";
  
  return "general";
}

// Generate more detailed consequences based on action type and context
function generateDetailedConsequence(
  action: string, 
  actionType: string, 
  situation: string, 
  genre: string, 
  characters: string[]
): string {
  const characterPresence = characters.length > 0;
  let consequence = `As ${action.toLowerCase()}, `;
  
  // Map action types to their consequence categories
  switch (actionType) {
    case "combat":
      consequence += characterPresence 
        ? `the conflict escalates quickly. ${getRandomElement(characters)} ${getRandomCombatReaction()}` 
        : "violence erupts in a tense moment that could determine survival or defeat.";
      break;
    case "social":
      consequence += characterPresence 
        ? `${getRandomElement(characters)} ${getRandomSocialReaction()}` 
        : "new information comes to light, potentially changing your understanding of the situation.";
      break;
    case "stealth":
      consequence += "you manage to stay hidden, observing crucial details without being detected, though certain opportunities might be missed.";
      break;
    case "investigation":
      consequence += "you discover something unexpected that adds a new dimension to your understanding.";
      break;
    case "magic":
      if (genre.toLowerCase().includes("fantasy") || genre.toLowerCase().includes("magic")) {
        consequence += "mystical energies respond to your will, creating effects that may draw both awe and unwanted attention.";
      } else {
        consequence += "you attempt something beyond normal human capabilities, with uncertain results.";
      }
      break;
    case "escape":
      consequence += "you create distance from the immediate danger, but may leave something important behind or invite pursuit.";
      break;
    case "acquisition":
      consequence += "you obtain something that may prove useful, though the act doesn't go completely unnoticed.";
      break;
    case "recovery":
      consequence += "you tend to your needs, restoring yourself while the world continues to move around you.";
      break;
    case "movement":
      consequence += "you navigate the environment, revealing new perspectives and potentially new dangers or opportunities.";
      break;
    default:
      consequence += "the situation evolves in ways that will shape future events significantly.";
  }
  
  return consequence;
}

// Generate rich narrative hooks based on tone preference and context
function generateNarrativeHook(
  action: string, 
  actionType: string, 
  genre: string, 
  tonePreference?: string,
  _characters: string[] = []
): string {
  // Default hooks by tone, with enhanced narrative quality
  const hooks: Record<string, string[]> = {
    "dark": [
      "Shadows seem to lengthen as this path unfolds, hinting at hidden dangers lurking just beyond perception.",
      "A sense of foreboding settles over the scene, as if fate itself senses tragedy approaching.",
      "The air grows heavy with tension, a harbinger of darker things to come should this course continue.",
      "Something watches from the darkness, its interest piqued by this turn of events."
    ],
    "hopeful": [
      "A ray of possibility breaks through the clouds of uncertainty, suggesting a path forward where before there seemed none.",
      "Something about this choice resonates with a deeper purpose, as if aligning with destiny itself.",
      "The burden seems lighter somehow, as if this direction holds the promise of resolution and growth.",
      "Seeds of potential are planted with this action, their growth just beginning to take root."
    ],
    "mysterious": [
      "Puzzle pieces shift in the grand design, though the picture they form remains tantalizingly obscured.",
      "Ancient forces stir at the edges of awareness, their attention drawn to this seemingly simple decision.",
      "Coincidence feels too convenient as events align in ways that suggest hidden patterns beneath the surface.",
      "Whispers of forgotten knowledge seem to echo, as if this path might unveil secrets long buried."
    ],
    "comedic": [
      "The universe seems to have a sense of humor about this particular choice, setting up circumstances ripe for unexpected hilarity.",
      "The serious façade of the situation threatens to crack under the weight of its own absurdity.",
      "Somehow, despite everything, there's a cosmic punchline waiting to be delivered here.",
      "This decision has 'entertaining consequences' written all over it, for better or worse."
    ],
    "dramatic": [
      "Personal connections strain and strengthen under the pressure of this moment, revealing their true nature.",
      "Emotions run deeper than expected, transforming what seemed simple into something profoundly consequential.",
      "The true cost of this path may be measured not in gold, but in how relationships are forever changed.",
      "Lines are drawn that cannot be easily uncrossed, as this choice echoes through relationships and loyalties."
    ],
  };
  
  // Determine which hooks to use based on tone preference or use a mix if none specified
  const toneToUse = tonePreference?.toLowerCase() || getRandomElement(Object.keys(hooks));
  let narrativeHook = getRandomElement(hooks[toneToUse] || hooks["mysterious"]);
  
  // Add genre-specific elements to enhance the hook
  if (genre.toLowerCase().includes("fantasy")) {
    narrativeHook += " The threads of magic seem to respond to this choice, weaving new patterns in the tapestry of destiny.";
  } else if (genre.toLowerCase().includes("sci-fi")) {
    narrativeHook += " Technology and humanity intersect at this crossroads, each influencing the other in unpredictable ways.";
  } else if (genre.toLowerCase().includes("horror")) {
    narrativeHook += " The boundary between safety and terror grows thinner, more permeable with each step down this path.";
  } else if (genre.toLowerCase().includes("romance")) {
    narrativeHook += " Hearts and intentions become clearer through this choice, revealing layers of connection previously unacknowledged.";
  }
  
  return narrativeHook;
}

// Calculate branch probability with multiple factors
function calculateBranchProbability(
  action: string,
  situation: string,
  genre: string,
  characters: string[]
): number {
  // Base probability
  let probability = 0.5;
  
  // Adjust for character involvement
  if (characters.length > 0) {
    probability += Math.min(0.2, characters.length * 0.05); // Max +0.2 from characters
  }
  
  // Adjust for situation relevance
  const actionLower = action.toLowerCase();
  const situationLower = situation.toLowerCase();
  
  if (situationLower.includes(actionLower.split(' ')[0])) {
    probability += 0.1; // Action verb appears in situation
  }
  
  // Genre consistency bonus
  const genreLower = genre.toLowerCase();
  if (
    (genreLower.includes('action') && actionLower.match(/attack|fight|chase/)) ||
    (genreLower.includes('mystery') && actionLower.match(/investigate|search|examine/)) ||
    (genreLower.includes('horror') && actionLower.match(/hide|run|escape/)) ||
    (genreLower.includes('fantasy') && actionLower.match(/cast|spell|magic/)) ||
    (genreLower.includes('romance') && actionLower.match(/talk|comfort|embrace/))
  ) {
    probability += 0.15; // Genre-typical action
  }
  
  // Cap probability at 0.95
  return Math.min(0.95, probability);
}

// Helper function to get a random element from an array
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper functions for generating character reactions
function getRandomCombatReaction(): string {
  const reactions = [
    "responds with unexpected ferocity, their skills clearly underestimated.",
    "attempts to evade the attack, creating an opening you didn't anticipate.",
    "seems prepared for this confrontation, as if they've been anticipating it.",
    "is caught off guard, but recovers with remarkable speed.",
    "calls out for allies, potentially complicating the encounter further."
  ];
  return getRandomElement(reactions);
}

function getRandomSocialReaction(): string {
  const reactions = [
    "reveals information that casts events in a new light, changing your understanding.",
    "seems hesitant to share everything they know, suggesting deeper secrets remain.",
    "responds with unexpected emotion, revealing how personally invested they are.",
    "mentions a name or place that connects disparate threads of your journey.",
    "offers an alliance or deal that presents both opportunity and risk."
  ];
  return getRandomElement(reactions);
}


