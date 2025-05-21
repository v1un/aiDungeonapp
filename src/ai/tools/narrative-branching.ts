'use server';

import { z } from 'genkit';
import { StoryBranch, generateBranchesSchema, selectBranchSchema } from './narrative-branching-schemas';

/**
 * Narrative Branching Tool
 * 
 * This tool helps the AI generate potential story branches and consequences
 * for player choices, creating a more dynamic and responsive narrative.
 */

// In-memory storage for narrative branches
// In production, this would be in a database
let storyBranches: StoryBranch[] = [];

// Function to generate narrative branches
export async function generateBranches(input: z.infer<typeof generateBranchesSchema>) {
  const { currentSituation, playerOptions, storyGenre, currentCharacters, tonePreference } = input;
  
  // Clear old branches that might no longer be relevant
  storyBranches = storyBranches.filter(branch => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return branch.created > oneHourAgo;
  });
  
  // Generate a new branch for each player option
  const newBranches: StoryBranch[] = playerOptions.map((action, index) => {
    // In a real implementation, this would use more sophisticated AI branching
    // Here we're using a simplified approach
    
    // Generate a consequence based on the action and current situation
    let consequence = `The character ${action.toLowerCase()}, resulting in `;
    
    // Simple, rule-based consequence generation
    if (action.toLowerCase().includes('attack') || action.toLowerCase().includes('fight')) {
      consequence += 'a confrontation that could lead to injury or defeat.';
    } else if (action.toLowerCase().includes('talk') || action.toLowerCase().includes('negotiate')) {
      consequence += 'a conversation that might reveal new information or allies.';
    } else if (action.toLowerCase().includes('hide') || action.toLowerCase().includes('sneak')) {
      consequence += 'avoiding immediate danger but potentially missing an opportunity.';
    } else if (action.toLowerCase().includes('examine') || action.toLowerCase().includes('search')) {
      consequence += 'discovering something that was previously hidden.';
    } else {
      consequence += 'an outcome that will shape future events in the story.';
    }
    
    // Generate a narrative hook for this branch
    let narrativeHook = '';
    
    // Adjust the narrative hook based on the tone preference
    switch (tonePreference) {
      case 'dark':
        narrativeHook = 'Shadows loom ahead, and the consequences of this choice may be more severe than anticipated.';
        break;
      case 'hopeful':
        narrativeHook = 'A glimmer of opportunity appears, suggesting this path might lead to a favorable outcome.';
        break;
      case 'mysterious':
        narrativeHook = 'Unknown forces are at play, and this choice will reveal secrets previously concealed.';
        break;
      case 'comedic':
        narrativeHook = 'This could lead to an unexpectedly humorous situation, though not without its own challenges.';
        break;
      case 'dramatic':
        narrativeHook = 'Tensions rise as this decision will significantly impact relationships and future events.';
        break;
      default:
        narrativeHook = 'The story could branch in multiple directions from here, each with their own consequences.';
    }
    
    // Calculate a probability based on consistency with story genre and characters
    // This is simplified - in a real implementation this would be more sophisticated
    let probability = 0.5; // Base probability
    
    if (currentCharacters.length > 0) {
      // Slightly higher probability if characters are involved
      probability += 0.1;
    }
    
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
  
  // Save the new branches
  storyBranches = [...storyBranches, ...newBranches];
  
  return { branches: newBranches };
}

// Function to select the most appropriate branch based on player action
export async function selectBranch(input: z.infer<typeof selectBranchSchema>) {
  const { playerAction, relevantFactors, preferTone } = input;
  
  if (storyBranches.length === 0) {
    return {
      selectedBranch: null,
      fallbackResponse: "No story branches have been generated yet. The story continues based on the player's action.",
      needsNewBranches: true
    };
  }
  
  // Find branches that closely match the player's action
  const matchedBranches = storyBranches.filter(branch => {
    // Check if the player action contains the branch action or vice versa
    return branch.playerAction.toLowerCase().includes(playerAction.toLowerCase()) ||
           playerAction.toLowerCase().includes(branch.playerAction.toLowerCase());
  });
  
  if (matchedBranches.length === 0) {
    return {
      selectedBranch: null,
      fallbackResponse: "The character's action leads into uncharted territory, opening new possibilities in the story.",
      needsNewBranches: true
    };
  }
  
  // Score each matched branch
  const scoredBranches = matchedBranches.map(branch => {
    let score = branch.probability;
    
    // Adjust score based on relevant factors if provided
    if (relevantFactors && relevantFactors.length > 0) {
      relevantFactors.forEach(factor => {
        if (branch.consequence.toLowerCase().includes(factor.toLowerCase()) || 
            branch.narrativeHook.toLowerCase().includes(factor.toLowerCase())) {
          score += 0.1;
        }
      });
    }
    
    // Adjust score based on tone preference if provided
    if (preferTone && branch.narrativeHook.toLowerCase().includes(preferTone.toLowerCase())) {
      score += 0.2;
    }
    
    return { branch, score };
  });
  
  // Sort by score and select the best match
  scoredBranches.sort((a, b) => b.score - a.score);
  const selectedBranch = scoredBranches[0].branch;
  
  return { selectedBranch, needsNewBranches: false };
}


