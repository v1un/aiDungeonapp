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
8. [Extending the System](#extending-the-system)

## Overview

The AI system is built on top of the Genkit framework and uses Google's Gemini models to generate dynamic, responsive narratives for the game. The system is designed to be modular, maintainable, and scalable, with a focus on providing a rich, immersive storytelling experience.

The architecture follows these key principles:

- **Modularity**: Each component has a single responsibility and can be developed and tested independently.
- **Type Safety**: Extensive use of TypeScript and Zod schemas ensures robust type checking.
- **Error Resilience**: Comprehensive error handling with fallbacks for graceful degradation.
- **Memory Efficiency**: Session management prevents memory leaks in long-running applications.
- **Performance Optimization**: Caching and efficient tool usage minimize latency.

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

## Extending the System

### Adding a New Tool

1. Define the tool schema in a schema file
2. Implement the tool functionality
3. Register the tool in `tools/index.ts`
4. Use the tool in your flow

Example:

```typescript
// 1. Define schema
const MyToolSchema = z.object({
  input1: z.string().describe("Description of input1"),
  input2: z.number().describe("Description of input2")
});

// 2. Implement functionality
async function myToolImplementation(input: z.infer<typeof MyToolSchema>) {
  // Tool implementation
  return { result: "Success" };
}

// 3. Register in tools/index.ts
export const myTool = ai.defineTool(
  {
    name: "myTool",
    description: "Description of my tool",
    inputSchema: MyToolSchema,
    outputSchema: z.object({
      result: z.string()
    }),
  },
  myToolImplementation
);

// 4. Use in a flow
const result = await safeToolCall(
  'myTool',
  myTool,
  { input1: "value", input2: 42 },
  { result: "Fallback" }
);
```

### Adding a New Flow

1. Define input and output schemas
2. Implement the flow functionality
3. Export the flow function

Example:

```typescript
// 1. Define schemas
const MyFlowInputSchema = z.object({
  input1: z.string().describe("Description of input1"),
  input2: z.number().describe("Description of input2")
});

const MyFlowOutputSchema = z.object({
  result: z.string().describe("Description of result")
});

// 2. Implement flow
const myFlow = ai.defineFlow(
  {
    name: 'myFlow',
    inputSchema: MyFlowInputSchema,
    outputSchema: MyFlowOutputSchema,
  },
  async (input) => {
    // Flow implementation
    return { result: "Success" };
  }
);

// 3. Export flow function
export async function myFlowFunction(input: z.infer<typeof MyFlowInputSchema>): Promise<z.infer<typeof MyFlowOutputSchema>> {
  return myFlow(input);
}
```

---

This architecture provides a solid foundation for building complex AI-driven narrative experiences. By following the patterns and principles outlined in this document, you can extend and enhance the system while maintaining its robustness and performance.