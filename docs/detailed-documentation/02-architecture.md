# Mystic Chatways: Application Architecture

This document outlines the architecture of the Mystic Chatways application, detailing its main components and how they interact.

## Components

The application is structured into two primary components:

1.  **Frontend**: The frontend is built using **Next.js**, a React framework. It is responsible for:
    *   Rendering the user interface (UI).
    *   Handling user input and interactions.
    *   Displaying game information, chat messages, inventory, quests, and lore.
    *   Managing client-side state.

2.  **Backend**: The backend is powered by **Genkit** (Google's Generative AI toolkit). It is responsible for:
    *   AI-driven game mastering.
    *   Generating dynamic story narratives based on player choices.
    *   Creating Non-Player Characters (NPCs) with unique personalities and backstories.
    *   Managing world states, quests, items, and encounters.
    *   Processing player actions and determining outcomes.

## Interaction

The Next.js frontend communicates with the Genkit AI backend through API calls. As detailed in the project's `README.md`, Genkit runs as a separate server. The Next.js application makes requests to this Genkit server to trigger AI functionalities and receive generated content.

## Data Flow

The typical data flow in Mystic Chatways is as follows:

1.  **User Input**: The player interacts with the UI, providing input (e.g., choosing an action, typing a message).
2.  **Frontend Processing**: The Next.js frontend captures this input.
3.  **API Request**: The frontend sends an API request to the Genkit AI backend, including the user's input and relevant context (e.g., current game state, character information).
4.  **Backend Processing**: The Genkit backend processes the request using its AI models and tools. This may involve:
    *   Generating new story elements.
    *   Updating the world state.
    *   Creating or modifying NPCs.
    *   Determining the outcome of player actions.
5.  **API Response**: The Genkit backend sends a response back to the Next.js frontend, containing the generated content or updated game state.
6.  **Frontend Update**: The Next.js frontend receives the response and updates the UI accordingly. This could involve:
    *   Displaying new chat messages from the AI Game Master.
    *   Updating the character's inventory or quest log.
    *   Reflecting changes in the game world.
7.  **User Display**: The player sees the updated information on their screen, continuing the interactive experience.
