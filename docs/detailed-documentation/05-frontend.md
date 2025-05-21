# Mystic Chatways: Frontend Application Documentation

## 1. Overview

The frontend of Mystic Chatways is a modern web application built using **Next.js**, a popular React framework. This provides features like server-side rendering, static site generation, and a file-system based routing mechanism. React is used for building the user interface with a component-based architecture.

## 2. Key UI Components (`src/components/`)

Reusable UI components are organized within the `src/components/` directory, categorized by their functionality.

*   **`src/components/chat/`**: This directory houses components specifically designed for the interactive chat interface, which is central to the gameplay experience.
    *   `ChatInput.tsx`: Likely provides the text input field and send button for players to type their actions and dialogue.
    *   `ChatMessage.tsx`: Probably responsible for rendering individual chat messages, distinguishing between player messages and AI/Game Master responses.
    *   `ChatWindow.tsx`: Likely the main container that displays the flow of chat messages.
    *   `TypingIndicator.tsx`: Likely displays an animation to show when the AI Game Master is "typing" a response.

*   **`src/components/rpg/`**: Components related to core Role-Playing Game elements are found here.
    *   `GameSidebar.tsx`: Likely a sidebar panel displaying essential game information such as character stats, inventory, active quests, or lorebook access.

*   **`src/components/status/`**: This directory contains components for displaying various status indicators to the user.
    *   `ConnectionStatus.tsx`: Likely indicates the status of the connection to the backend or AI services.

*   **`src/components/ui/`**: This is a collection of general-purpose, reusable UI elements that are used throughout the application. It includes a wide variety of common interface controls, promoting consistency and rapid development. Examples include:
    *   `accordion.tsx`: For creating collapsible content sections.
    *   `button.tsx`: Standard clickable button elements.
    *   `card.tsx`: Content containers with a distinct visual style.
    *   `dialog.tsx`: For modal pop-up windows.
    *   `dropdown-menu.tsx`: For creating dropdown menus.
    *   `input.tsx`: Standard input fields.
    *   `label.tsx`: Text labels for form elements.
    *   `sheet.tsx`: A slide-out panel, often used for sidebars or forms on mobile.
    *   `skeleton.tsx`: Placeholder elements used during content loading.
    *   Other components like `alert.tsx`, `avatar.tsx`, `badge.tsx`, `calendar.tsx`, `checkbox.tsx`, `form.tsx`, `menubar.tsx`, `popover.tsx`, `progress.tsx`, `radio-group.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `slider.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `toast.tsx`, `toaster.tsx`, and `tooltip.tsx` indicate a rich set of pre-built UI elements.

## 3. Page Structure and Routing (`src/app/`)

Next.js uses a file-system based router. Directories and files within `src/app/` define the application's routes.

*   **`src/app/page.tsx`**: This is the main entry point of the application, likely serving as the primary game interface where users interact with the chat and RPG elements.
*   **`src/app/lorebook/page.tsx`**: This route renders the page dedicated to the Lorebook feature, allowing players to browse and manage information about the game world, characters, and story.
    *   `src/app/lorebook/layout.tsx`: Provides a specific layout for the lorebook section.
*   **`src/app/settings/page.tsx`**: This route displays the application settings page, where users can customize their experience.
    *   `src/app/settings/layout.tsx`: Provides a specific layout for the settings section.

*   **`src/app/layout.tsx`**: This is the main layout component for the entire application. It typically includes the root HTML structure, global navigation, and any elements shared across all pages.
*   **`src/app/globals.css`**: This file contains global CSS styles that are applied to the entire application, providing a baseline look and feel.
*   **`src/app/favicon.ico`**: The application's favicon.

## 4. State Management (`src/hooks/`, `src/lib/`)

State management in the frontend likely relies on React's built-in hooks (such as `useState`, `useEffect`, and `useContext`) for local and shared component state.

*   **Custom Hooks (`src/hooks/`)**:
    *   `use-mobile.tsx`: This custom hook likely detects if the application is being viewed on a mobile device, allowing for responsive UI adjustments.
    *   `use-toast.ts`: This hook probably provides a convenient way to display toast notifications (small, non-intrusive messages) to the user.

*   **Utility Libraries (`src/lib/`)**:
    *   `game-actions.ts`: This file might contain functions related to managing global game state or dispatching actions that affect the overall game (e.g., starting a new game, saving progress, interacting with the AI backend for game events). It could be involved in fetching data from or sending data to the backend API routes.
    *   `utils.ts`: A common utility file that likely contains helper functions used across various parts of the frontend application.

## 5. API Interaction (`src/app/api/`)

The Next.js frontend communicates with backend services (including the Genkit AI system) through API routes defined in the `src/app/api/` directory. Next.js allows developers to create backend endpoints as part of the same project.

*   **`src/app/api/genkit-health/route.ts`**: This API route likely serves as a health check endpoint specifically for the Genkit AI service. The frontend can call this to verify if the AI backend is operational.
*   **`src/app/api/health/route.ts`**: This is probably a general health check endpoint for the overall Next.js application or other backend services it might rely on.

It's expected that other API routes exist or will be added to handle various game-specific actions, such as:
*   Sending player input to the `advanceStory` Genkit flow.
*   Requesting character generation via the `generateCharacter` flow.
*   Fetching or updating lorebook entries.
*   Managing game sessions.

These API routes act as a bridge between the client-side React components and the server-side Genkit AI flows.

## 6. Styling

The application uses Tailwind CSS for utility-first styling.

*   **`tailwind.config.ts`**: This file contains the configuration for Tailwind CSS, allowing customization of design tokens, themes, and plugins.
*   **`postcss.config.mjs`**: This file configures PostCSS, which is often used with Tailwind CSS for processing and optimizing CSS.
*   **`src/app/globals.css`**: As mentioned earlier, this file contains global styles and Tailwind CSS base directives (`@tailwind base`, `@tailwind components`, `@tailwind utilities`).

This combination allows for efficient and consistent styling across the application.
