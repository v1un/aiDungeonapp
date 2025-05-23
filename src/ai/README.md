# AI Dungeon - AI System Architecture

This document provides an overview of the AI system architecture used in AI Dungeon, explaining the key components, flows, and tools that power the game's narrative engine.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [AI Flows](#ai-flows)
4. [AI Tools](#ai-tools)
5. [Session Management](#session-management)
6. [Error Handling](#error-handling)
7. [Performance Considerations](#performance-considerations)
8. [Quality Standards](#quality-standards)
9. [Extending the System](#extending-the-system)

## Overview

The AI system is built on top of the Genkit framework and uses Google's Gemini models to generate dynamic, responsive narratives for the game. The system is designed to be modular, maintainable, and scalable, with a focus on providing a rich, immersive storytelling experience.

The architecture follows these key principles:

- **Modularity**: Each component has a single responsibility and can be developed and tested independently.
- **Type Safety**: Extensive use of TypeScript and Zod schemas ensures robust type checking.
- **Error Resilience**: Comprehensive error handling with fallbacks for graceful degradation.
- **Memory Efficiency**: Session management prevents memory leaks in long-running applications.
- **Performance Optimization**: Caching and efficient tool usage minimize latency.
- **Narrative Quality**: All AI-generated content maintains high standards for immersion and engagement.

## Core Components

### 1. AI Model Configuration (`genkit.ts`)

This module configures the AI model and provides fallback mechanisms for different environments:

```typescript
// Initialize the AI with proper configuration
export const ai = genkit({
  plugins: [googleAI({
    apiKey: apiKey || 'dummy-key-for-initialization',
  })],
  model: selectedModel,
  fallbackModel: MODELS.fallback,
  retryOptions: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
  }
});
```

### 2. Tool Registry (`tools/index.ts`)

Central registration point for all AI tools, breaking circular dependencies and providing a consistent interface:

```typescript
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
```

### 3. Game Actions (`game-actions.ts`)

Server-side actions that process player input and manage game state:

```typescript
export async function processPlayerInput(
  playerInput: string, 
  chatHistory: Message[], 
  sessionId?: string
): Promise<ProcessedPlayerInput> {
  // ...
}
```

## AI Flows

AI Flows are high-level processes that orchestrate multiple tools to achieve complex tasks.

### 1. Series Generation (`generate-series-details.ts`)

Generates the initial series details, including:
- Series title and basic information
- Main character details
- Supporting characters
- Relationships
- Initial quest
- World memory

### 2. Story Advancement (`advance-story.ts`)

Processes player input and generates narrative responses:
- Retrieves context from previous interactions
- Generates narrative branches based on player input
- Selects the most appropriate branch
- Generates environmental details
- Retrieves relevant lore information
- Produces a narrative response
- Updates game state

## AI Tools

Tools are specialized functions that the AI can use to perform specific tasks.

### Context Management Tools

- `retrieveContextTool`: Retrieves story context to maintain narrative consistency
- `updateContextTool`: Updates story context with new events, relationships, or world state changes

### Narrative Branching Tools

- `generateBranchesTool`: Generates potential story branches based on player options
- `selectBranchTool`: Selects the most appropriate narrative branch based on the player's action

### World Building Tools

- `generateLocationTool`: Generates detailed information about a location in the story
- `generateEnvironmentTool`: Generates environmental elements like weather, time of day, and sensory details
- `retrieveLocationTool`: Retrieves previously generated details about a location

### Relationship Management Tools

- `updateRelationshipTool`: Updates the relationship between two characters
- `addCharacterMemoryTool`: Adds a memory to a character's history
- `retrieveCharacterMemoriesTool`: Retrieves memories for a specific character

### Lore Tools

- `retrieveLoreInfoTool`: Retrieves information from the lorebook
- `addLocationToLorebookTool`: Adds a new location to the lorebook
- `enrichLorebookTool`: Automatically extracts and adds information to the lorebook from narrative text

## Session Management

The system includes robust session management to prevent memory leaks in long-running applications:

```typescript
// Configuration for session cleanup
const SESSION_CONFIG = {
  // Time after which inactive sessions are cleaned up (4 hours)
  INACTIVE_TIMEOUT_MS: 4 * 60 * 60 * 1000,
  // Maximum number of sessions to keep in memory
  MAX_SESSIONS: 1000,
  // How often to run cleanup (every 30 minutes)
  CLEANUP_INTERVAL_MS: 30 * 60 * 1000
};
```

Sessions are automatically cleaned up based on:
- Inactivity timeout
- Maximum session limit
- Periodic cleanup intervals

## Error Handling

The system includes comprehensive error handling with structured error information:

```typescript
class AIFlowError extends Error {
  public readonly component: string;
  public readonly severity: 'critical' | 'warning' | 'info';
  public readonly originalError?: Error;

  constructor(message: string, component: string, severity: 'critical' | 'warning' | 'info' = 'warning', originalError?: Error) {
    super(message);
    this.name = 'AIFlowError';
    this.component = component;
    this.severity = severity;
    this.originalError = originalError;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIFlowError);
    }
  }
}
```

Tool calls are wrapped in a `safeToolCall` utility that provides:
- Consistent error handling
- Fallback values for non-critical errors
- Detailed error logging
- Performance metrics

## Performance Considerations

The system includes several performance optimizations:

1. **Caching**: Series details are cached to improve performance and handle API failures.
2. **Selective Context Retrieval**: Only relevant context is retrieved to minimize data transfer.
3. **Session Cleanup**: Inactive sessions are automatically cleaned up to prevent memory leaks.
4. **Retry Mechanisms**: Critical operations include retry logic with exponential backoff.
5. **Performance Metrics**: Tool calls are tracked and timed for performance monitoring.

## Quality Standards

### Narrative Generation Quality

All AI prompts are designed to generate responses that meet these quality benchmarks with **absolute series authenticity**:

1. **Series-Authentic Atmosphere**: Rich sensory details that match the specific world's unique characteristics (magic systems, technology levels, cultural elements)
2. **Canon-Compliant Character Voice**: Authentic perspective that perfectly matches the series protagonist's established personality, speech patterns, and worldview
3. **Series-Specific Emotional Engagement**: Stakes and conflicts that align with the series' core themes and emotional tone
4. **World-Accurate Authenticity**: Perfect representation of the fictional universe's rules, cultures, power systems, and established lore
5. **Series-Appropriate Interactive Elements**: Choices and scenarios that feel natural within the specific fictional world
6. **Canon-Consistent Status Awareness**: Location names, time systems, and world states that match the series' established framework

### Example Quality Target

Target narrative quality should seamlessly blend with the original series tone:

```
🌟 Welcome to the World of Re:Zero 🌟
The fluorescent lights of the convenience store flicker one last time before everything goes white...

You blink rapidly as your vision clears, expecting to see the familiar aisles of the store where you were just buying snacks. Instead, you find yourself standing on cobblestone streets beneath an unfamiliar sky. The plastic bag in your hand crinkles as you grip it tighter—the only proof that moments ago you were in modern Japan.

The architecture around you feels distinctly medieval yet fantastical, with pointed rooftops and magical street lamps that glow with an ethereal blue light. The air carries unfamiliar scents of spices and something that might be mana...

[Multiple engaging choices with clear formatting that respect Re:Zero's narrative style]

Current Status: Confused but unharmed | Location: Capital City Streets | Time: Afternoon
```

### Prompt Requirements

Every AI prompt must include these series-authenticity requirements:

- **Mandatory Series Research**: Extensive knowledge of the specific series' world-building, character personalities, power systems, and cultural elements
- **Canon Compliance Verification**: Cross-reference all generated content against established series lore
- **Terminology Accuracy**: Use exact names, terms, and concepts from the original series
- **Tonal Consistency**: Match the original series' narrative voice, pacing, and emotional depth
- **Cultural Authenticity**: Respect the series' societal structures, customs, and belief systems
- **Power System Coherence**: Accurately represent the series' unique magic/ability systems and their limitations
- **Character Personality Fidelity**: Maintain authentic character voices and decision-making patterns
- **World Logic Consistency**: Follow the established rules and physics of the fictional universe