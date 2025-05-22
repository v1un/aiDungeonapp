# Mystic Chatways: AI System Documentation

This document details the AI system of Mystic Chatways, which is responsible for dynamic storytelling, character generation, and world management. The system leverages Google's Genkit toolkit.

## 1. Overview of Genkit Usage

The core AI capabilities of Mystic Chatways are powered by **Genkit**, a generative AI toolkit. The central configuration for Genkit is managed in `src/ai/genkit.ts`. This file is responsible for initializing the appropriate Genkit plugins and selecting the AI model based on the chosen provider. The system now supports two primary AI provider configurations:

1.  **Google AI (Cloud)**: Utilizes Google's powerful models (e.g., Gemini series like `gemini-2.5-flash-preview`) through the `@genkit-ai/googleai` Genkit plugin. This is the default provider if no specific configuration is set. This path leverages Genkit's tool-calling capabilities, allowing the AI to interact with defined tools for structured data retrieval, game state manipulation, and complex action execution.
2.  **Local LLM (via Ollama)**: Allows for running language models locally using Ollama. The recommended and tested model for this setup is `google/gemma-3-4b-it`, accessed via the `genkitx-ollama` Genkit plugin. This option is ideal for offline use, development, or when you prefer to use local hardware resources.
    *   **Tool-less Approach**: When this provider is active, the AI flows (`advanceStory`, `generateCharacter`, `generateNpc`, `generateQuest`, `generateSeriesDetails`, `summarizeAdventure`) switch to using specially crafted **tool-less prompts**. Instead of the AI calling specific tools for structured operations (like inventory updates or detailed quest status changes), the Gemma model is instructed to embed all relevant information—narrative progression, game state changes, character details—directly within its textual response.
    *   **Text Parsing**: The application then parses this narrative output to extract the necessary data and update game state. This can lead to variations in how game events are represented and processed compared to the more discrete, structured events from the Google AI path. For example, inventory changes or quest updates are inferred from the narrative rather than resulting from a direct function call by the AI.
    *   **Behavioral Differences**: Consequently, advanced tool-based features and complex context management or narrative branching tools that the Google AI path might use internally could have simplified or different behaviors in the Gemma path. The interaction will generally feel more purely narrative-driven. The precision and granularity of game state updates depend on the model's ability to follow the structured prompt format and the robustness of the parsing logic.

The selection between these providers is controlled by the `AI_PROVIDER` environment variable. For detailed instructions on how to set this variable, configure Ollama, and download the necessary local models, please refer to the "Using a Local LLM (Ollama + Gemma)" section in the main `README.md` file, which also includes a summary of these behavioral differences.

The `ai` instance exported by `src/ai/genkit.ts` is then used consistently across all AI flows and tools within the application, abstracting the specific provider details from the core logic of the flows.

## 2. AI Flows (`src/ai/flows/`)

AI Flows in Genkit are used to define multi-step AI processes. These flows orchestrate calls to AI models and tools to achieve complex tasks. The primary flows in Mystic Chatways are located in the `src/ai/flows/` directory:

*   **`advance-story.ts`**:
    *   **Purpose**: This flow is central to gameplay, driving the narrative forward. It takes player input, chat history, character details, current location, inventory, and active quests as input. It then generates a narrative response, potentially updating the location, inventory, and quest progress.
    *   **Tools Used**: It utilizes several tools, including `retrieveLoreInfoTool` for lore consistency, and tools from `context-manager`, `narrative-branching`, and `world-building` to manage state and generate dynamic content.

*   **`generate-character.ts`**:
    *   **Purpose**: Responsible for creating new player characters. It takes a character concept, the series title, and world context as input.
    *   **Output**: It generates the character's name, a detailed backstory, core statistics (strength, dexterity, etc.), and a list of skills, all tailored to fit within the specified fictional universe.

*   **`generate-npc.ts`**:
    *   **Purpose**: Generates Non-Player Characters (NPCs). It considers the player character's description, the series title, existing NPCs (for uniqueness), world context, current location, and the intended purpose of the NPC (e.g., ally, antagonist).
    *   **Output**: It produces a comprehensive NPC profile including name, background, personality, goals, appearance, key relationships, and a formatted lorebook entry.

*   **`generate-quest.ts`**:
    *   **Purpose**: Creates new quests for the player. It takes player context (current situation, series name, character details) and optionally the number of previous quests completed to vary difficulty or type.
    *   **Output**: It defines a quest with a title, description, a list of objectives, and thematic rewards. The output structure aligns with the `Quest` type defined in the application.

*   **`generate-series-details.ts`**:
    *   **Purpose**: This flow is designed to generate comprehensive foundational details for a new game series or world based on a given series name (e.g., "Star Wars").
    *   **Output**: It produces a rich set of information including the canonical series title, detailed main character profile (name, description, thematic stats), a structured lorebook (with an overall summary and 10-20 entries across various categories like locations, NPCs, history, magic systems), a list of 3-5 other notable characters, initial inventory for the main character, a starting location, an initial quest (tied to the starting situation), and an initial prompt for the player to kickstart the interaction.

*   **`summarize-adventure.ts`**:
    *   **Purpose**: Takes the player's past adventure history as input and generates a concise, engaging summary.
    *   **Output**: A short summary of the adventure.

## 3. AI Tools (`src/ai/tools/`)

AI Tools provide specific, reusable functionalities that AI flows can leverage to perform sub-tasks. These tools often encapsulate logic for interacting with game systems, managing data, or performing specialized generation tasks.

*   **General Purpose**: Tools abstract complex operations into simpler interfaces for the AI models, enabling them to request specific actions or information. For example, instead of the AI trying to manipulate a database directly, it can use a tool to retrieve or update information.

*   **Key Tool Categories and Files**:

    *   **`context-manager.ts`** (along with `context-manager-schemas.ts` and `context-manager-tools.ts`):
        *   **Purpose**: This toolset appears to be responsible for maintaining the narrative context and game state for the AI. It manages important story events, character relationships, and the overall world state (location, time, weather, themes).
        *   **Functionality**: It includes functions like `retrieveContext` (to get current story events, relationships, or world state) and `updateContext` (to add new events, modify relationships, or change the world state). It uses in-memory storage for this data, which would likely be a database in a production environment.

    *   **`narrative-branching.ts`** (along with `narrative-branching-schemas.ts` and `narrative-branching-tools.ts`):
        *   **Purpose**: This system handles dynamic story progression by generating potential story branches and consequences based on player choices or unfolding events.
        *   **Functionality**: It provides functions like `generateBranches` (to create new story possibilities based on the current situation, player options, genre, characters, and tone) and `selectBranch` (to choose the most appropriate branch based on player action and other factors). It also uses in-memory storage for active branches.

    *   **`retrieve-lore-info.ts`**:
        *   **Purpose**: This is a specific tool (also exposed via `src/ai/lore-tools.ts`) that allows the AI to query the established lorebook for the current game series.
        *   **Functionality**: It takes a search term and an optional category hint. It then searches the lorebook (overall summary and individual entries) stored in the game state and returns relevant snippets of information. This is crucial for maintaining narrative consistency and answering player queries about the world.

    *   **`world-building.ts`** (along with `world-building-schemas.ts` and `world-building-tools.ts`):
        *   **Purpose**: This set of tools is dedicated to creating and managing the game world's environments and locations.
        *   **Functionality**: It includes functions like:
            *   `generateLocation`: Creates detailed information for a new location (description, atmosphere, notable features, hidden elements) or updates existing ones.
            *   `generateEnvironment`: Generates dynamic environmental elements for a given location, such as weather, time of day, atmosphere, sounds, and smells, considering desired mood and time progression.
            *   `retrieveLocation`: Fetches details for an existing location.
        *   It uses helper functions to generate descriptive content for various location types (forest, castle, cave, etc.) and environmental conditions.

    *   **`src/ai/lore-tools.ts`**:
        *   **Purpose**: This file consolidates lore-related tools to avoid circular dependencies. It explicitly defines and exports `retrieveLoreInfoTool` (described above) and `addNpcToLorebookTool`.
        *   `addNpcToLorebookTool`: Allows the AI to add a new NPC to the lorebook or update an existing one, ensuring the NPC becomes part of the persistent world knowledge.

    *   **`src/ai/tools/index.ts`**: This file likely serves as a central export point for all the tools, making them easily importable by the AI flows.

## 4. Data Schemas

Data schemas are crucial for defining the expected structure of inputs and outputs for AI flows and tools. They ensure that data exchanged between the AI models, flows, and tools is consistent and well-defined. Genkit uses Zod for schema definition.

*   **`src/ai/tool-schemas.ts`**: This file appears to be a central place for defining common schemas used by multiple tools, particularly for lore retrieval (`RetrieveLoreInfoInputSchema`, `RetrieveLoreInfoOutputSchema`) and adding NPCs to the lorebook (`AddNpcToLorebookInputSchema`, `AddNpcToLorebookOutputSchema`). This helps prevent circular dependencies if tools need to reference each other's schemas.

*   **`src/ai/tools/*-schemas.ts`**: Each tool category within `src/ai/tools/` (e.g., `context-manager`, `narrative-branching`, `world-building`) has its own dedicated `*-schemas.ts` file.
    *   **`context-manager-schemas.ts`**: Defines structures like `StoryEvent`, `CharacterRelationship`, `WorldState`, and schemas for retrieving and updating context (`retrieveContextSchema`, `updateContextSchema`).
    *   **`narrative-branching-schemas.ts`**: Defines `StoryBranch` and schemas for generating and selecting branches (`generateBranchesSchema`, `selectBranchSchema`).
    *   **`world-building-schemas.ts`**: Defines `LocationDetail`, `EnvironmentalElement`, and schemas for generating locations and environments (`generateLocationSchema`, `generateEnvironmentSchema`, `retrieveLocationSchema`).

*   **Importance**: These schemas ensure that when an AI flow calls a tool, it provides the correct input data structure, and the tool returns data in the expected format. This is vital for the reliability and predictability of the AI system. For example, the `AdvanceStoryInputSchema` in `advance-story.ts` clearly defines all the pieces of information the story advancement flow expects, and its corresponding output schema details what the flow will return. Similarly, flows like `generate-character.ts` have precise input and output schemas (e.g., `GenerateCharacterInputSchema`, `GenerateCharacterOutputSchema`) defining the expected data for character creation.The file `docs/detailed-documentation/04-ai-system.md` has been created and populated with the detailed documentation of the AI system, covering Genkit usage, AI flows, AI tools, and data schemas as requested.
I will now submit the subtask report.
