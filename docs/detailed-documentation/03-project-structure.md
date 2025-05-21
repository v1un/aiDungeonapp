# Mystic Chatways: Project Structure

This document provides an overview of the Mystic Chatways project's directory structure, explaining the purpose of key directories and files.

## Root Level

The root of the project contains several key configuration files and directories:

-   **`package.json`**: Defines project metadata, dependencies, and scripts.
-   **`next.config.ts`**: Configuration file for the Next.js framework.
-   **`tsconfig.json`**: Configuration file for the TypeScript compiler.
-   **`postcss.config.mjs`**: Configuration for PostCSS, a tool for transforming CSS.
-   **`tailwind.config.ts`**: Configuration file for Tailwind CSS.
-   **`.gitignore`**: Specifies intentionally untracked files that Git should ignore.
-   **`README.md`**: Provides a general overview of the project, setup instructions, and other relevant information.

## Main Directories

### `src/`

This is the primary directory containing the application's source code.

-   **`src/ai/`**: Houses all AI-related logic and Genkit integration.
    -   **`src/ai/flows/`**: Contains specific Genkit flows that define multi-step AI processes. Examples include `advance-story.ts`, `generate-character.ts`, `generate-npc.ts`, `generate-quest.ts`, and `generate-series-details.ts`.
    -   **`src/ai/tools/`**: Includes specialized AI tools and functionalities used by the Genkit flows. This directory contains schemas and implementations for context management, narrative branching, lore retrieval, and world-building.
    -   `src/ai/genkit.ts`: Likely the main configuration or initialization file for Genkit.
    -   `src/ai/lore-tools.ts`: Tools specifically for interacting with the lorebook.
    -   `src/ai/tool-schemas.ts`: TypeScript schemas defining the structure of data used by AI tools.

-   **`src/app/`**: The core Next.js application directory, following the App Router conventions.
    -   **`src/app/api/`**: Contains backend API route handlers. This includes routes for Genkit health checks (`genkit-health/`) and general application health (`health/`).
    -   **`src/app/lorebook/`**: Contains the Next.js pages and components for the lorebook feature, allowing users to view and manage game world information.
    -   **`src/app/settings/`**: Contains the Next.js pages and components for application settings.
    -   `src/app/layout.tsx`: The main layout component for the Next.js application.
    -   `src/app/page.tsx`: The entry point page for the application.
    -   `src/app/globals.css`: Global CSS styles for the application.

-   **`src/components/`**: Contains reusable React components used throughout the application.
    -   **`src/components/chat/`**: Components specifically designed for the chat interface, such as `ChatInput.tsx`, `ChatMessage.tsx`, and `ChatWindow.tsx`.
    -   **`src/components/rpg/`**: Components related to RPG elements, like `GameSidebar.tsx`.
    -   **`src/components/status/`**: Components for displaying status information, e.g., `ConnectionStatus.tsx`.
    -   **`src/components/ui/`**: General-purpose UI components like buttons, dialogs, cards, forms, and other antd-inspired elements (e.g., `accordion.tsx`, `button.tsx`, `card.tsx`).

-   **`src/config/`**: Stores application-wide configuration files and constants (e.g., `constants.ts`).

-   **`src/hooks/`**: Contains custom React hooks to encapsulate and reuse stateful logic (e.g., `use-mobile.tsx`, `use-toast.ts`).

-   **`src/lib/`**: Includes utility functions, helper scripts, and libraries that support various parts of the application (e.g., `utils.ts`, `game-actions.ts`).

-   **`src/types/`**: Contains TypeScript type definitions and interfaces used across the project (e.g., `index.ts`).

### `public/`

This directory stores static assets that are publicly accessible from the browser, such as images (e.g., `subtle-pattern.png`), favicons (`favicon.ico`), and other files that don't need to be processed by the build pipeline.

### `docs/`

Contains project documentation.

-   **`docs/blueprint.md`**: Initial design and feature outline for the application.
-   **`docs/detailed-documentation/`**: This directory, intended for more detailed markdown documents like this one, covering aspects like architecture, project structure, etc.

### `dist/`

This directory contains the output of the build process. These are the compiled and minified files that are deployed for production. For example, `mystic-chatways-launcher.js` and its associated map file.

### `tools/`

This directory seems to contain utility scripts or tools related to the project, possibly for development or deployment, such as `mystic-chatways-launcher.ts` and its compiled JavaScript version.

### `node_modules/`

This standard directory is created by npm or yarn and contains all the project's dependencies (third-party libraries and packages). It is typically not version-controlled directly.

### `logs/`
This directory contains log files for different parts of the application, such as `backend.log`, `frontend.log`, and error logs. This is crucial for debugging and monitoring.

---

This structure promotes modularity and separation of concerns, making the codebase easier to understand, maintain, and scale.
