# Mystic Chatways - Enhanced Edition

![CI/CD Status](https://github.com/v1un/aiDungeonapp/actions/workflows/ci-cd.yml/badge.svg)
![Deploy Status](https://github.com/v1un/aiDungeonapp/actions/workflows/deploy.yml/badge.svg)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://github.com/v1un/aiDungeonapp/pkgs/container/mystic-chatways)

Mystic Chatways is an AI-powered text-based RPG application that lets you explore fictional universes through an interactive chat interface with an AI Game Master. Create and play in AI-generated worlds based on your favorite media, manage your inventory, complete quests, and shape your own story.

## Features

- 🎮 Interactive chat interface with a responsive AI Game Master
- 🌌 Create and explore AI-generated fictional worlds
- 📚 Track inventory, quests, and character information
- 💾 Multiple game session support with local storage
- 🧠 Enhanced narrative branching for more coherent storytelling
- 📖 Improved Lorebook integration for a richer world experience
- 📖 Lorebook system for each fictional universe
- ⚙️ Customizable user settings

## Prerequisites

- **Gemini API Key**: This application requires a Google Gemini API key to function. See [API_KEY_SETUP.md](API_KEY_SETUP.md) for detailed instructions on how to obtain and set up your key.

Before you begin, ensure you have the following installed:

- Node.js (v18 or later)
- npm (v9 or later) or yarn
- Google Cloud account (for GenKit AI functionality)

## Getting Started

### 1. Clone the Repository

```bash
git clone [your-repository-url]
cd aiDungeonapp
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory and add your Google Cloud credentials:

```
GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"
NEXT_PUBLIC_GENKIT_API_KEY="your-genkit-api-key"
```

### 4. Running the Application

You'll need to run two servers:

1. **Start the GenKit AI Server** (in a new terminal):

   ```bash
   npm run genkit:dev
   # or
   yarn genkit:dev
   ```

2. **Start the Next.js Development Server** (in another terminal):

   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to access the application.

## Using a Local LLM (Ollama + Gemma)

This application can be configured to use a local Large Language Model (LLM) through Ollama, providing an alternative to cloud-based AI providers. The recommended and tested model for local use is `google/gemma-3-4b-it`.

### Prerequisites

- **Ollama Installed**: You must have Ollama installed on your system. You can download it from the official [Ollama download page](https://ollama.com/download).

### Installing the Gemma Model

Once Ollama is running, open your terminal and pull the `google/gemma-3-4b-it` model:

```bash
ollama pull google/gemma-3-4b-it
```

While other Gemma variants (e.g., `gemma:7b`) might also work with this application, `google/gemma-3-4b-it` is the one that has been specifically tested and is recommended for optimal compatibility.

### Configuration

To use your local Ollama-served model, you need to configure the following environment variables:

1.  **`AI_PROVIDER`**:
    *   Set `AI_PROVIDER="ollama"` to instruct the application to use your local Ollama instance.
    *   Set `AI_PROVIDER="googleai"` (or leave this variable unset) to use the default Google AI (Gemini) provider. This will require a Gemini API key.

2.  **`OLLAMA_BASE_URL`** (Optional):
    *   This variable specifies the base URL for your Ollama API.
    *   It defaults to `http://localhost:11434`.
    *   If your Ollama service is running on a different host or port, you must set this variable to the correct URL.

**How to Set Environment Variables:**

You can set these variables by creating or editing a `.env.local` file in the root directory of the project.

Example `.env.local` content for using Ollama:

```env
AI_PROVIDER="ollama"
# OLLAMA_BASE_URL="http://customhost:11434" # Optional: Uncomment and set if your Ollama is not on localhost:11434
```

Alternatively, you can set these variables directly in your shell environment before running the application.

### Running the Application with Ollama

After configuring the environment variables to use Ollama:

1.  Ensure your Ollama application is running and the `google/gemma-3-4b-it` model is available.
2.  Start the GenKit AI server and the Next.js development server as described in the "Getting Started" section.
    ```bash
    npm run genkit:dev
    ```
    ```bash
    npm run dev
    ```
3.  If the application was already running, **you must restart both the Genkit AI server and the Next.js server** for the environment variable changes to take effect.

With these settings, the application will direct its AI requests to your local Ollama instance using the Gemma model.

### Behavioral Differences with Local LLM

When `AI_PROVIDER="ollama"` is used, the system employs a **tool-less approach** for interacting with the Gemma model. This is different from the Google AI (Gemini) provider, which leverages Genkit's tool-calling capabilities for more structured operations.

Key differences to expect:

-   **Narrative-Driven Output**: Gemma will attempt to include all information—narrative progression, game state changes (like inventory updates or quest status), and character interactions—directly within its textual responses. The application then parses this text to extract relevant details.
-   **Structured Data Extraction**: Because the system relies on parsing text rather than receiving structured data from AI tools, the precision of updates to game elements (e.g., specific items added/removed from inventory, exact quest objective completions) might vary. The process is more interpretive.
-   **Interaction Feel**: The interaction with the local LLM might feel more purely narrative-driven and less like the AI is using distinct "tools" or functions for specific game mechanics.
-   **Dependence on Model and Parsing**: The quality, coherence, and accuracy of game state changes will depend significantly on the capabilities of the specific Gemma model being used and the effectiveness of the application's text parsing logic.

This approach allows for flexibility and the use of local models but may result in a different gameplay experience compared to the more function-driven Google AI provider.

## Available Scripts

- `npm run dev` or `yarn dev` - Start the Next.js development server
- `npm run build` or `yarn build` - Build the application for production
- `npm start` or `yarn start` - Start the production server
- `npm run genkit:dev` or `yarn genkit:dev` - Start the GenKit AI development server
- `npm test` or `yarn test` - Run tests

## Project Structure

```
/
├── src/
│   ├── app/                  # Next.js app directory
│   ├── components/           # Reusable React components
│   ├── lib/                  # Utility functions and configurations
│   ├── styles/               # Global styles and themes
│   └── types/                # TypeScript type definitions
├── public/                   # Static files
├── .env.local                # Environment variables
└── package.json              # Project dependencies and scripts
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## CI/CD Pipeline

Mystic Chatways uses GitHub Actions for continuous integration and deployment. The pipeline automates testing, building, and deploying the application.

### Workflows

1. **CI/CD Pipeline** (`ci-cd.yml`)
   - Triggers on pushes to main, master, dev, development branches and pull requests to main/master
   - Builds and tests the application
   - Creates Docker images for successful builds on main/master

2. **Deployment** (`deploy.yml`)
   - Runs after successful CI/CD workflow on main/master
   - Deploys the application to the production environment
   - Can be manually triggered via GitHub Actions

3. **Dependabot Auto-Merge** (`dependabot.yml`)
   - Automatically merges Dependabot pull requests that pass tests

### Running CI Checks Locally

You can run the same checks used in CI locally:

```bash
# Run TypeScript checks
npm run typecheck

# Run linting
npm run lint

# Run CI preparation steps
npm run prepare-ci
```

### Docker Support

The application includes Docker support for containerized deployment:

```bash
# Build the Docker image
npm run docker-build

# Run the application in Docker
npm run docker-run

# Use Docker Compose for local development
npm run docker-compose-up
npm run docker-compose-down
```

### VS Code Tasks

The repository includes VS Code tasks for common CI/CD operations:

- **CI Workflow Check**: Run local CI checks
- **Docker Build**: Build the Docker image
- **Docker Run**: Run the application in Docker
- **Docker Compose Up/Down**: Manage Docker Compose environment

To run these tasks in VS Code, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and select "Tasks: Run Task".

## Deployment

The application can be deployed in several ways:

### Automatic Deployment

When changes are merged to the main/master branch, the GitHub Actions workflow automatically:

1. Builds and tests the application
2. Creates a Docker image
3. Deploys to the production environment

### Manual Deployment

You can manually trigger a deployment through the GitHub Actions interface.

### Self-Hosted Deployment

To deploy on your own server:

1. Pull the Docker image:

   ```bash
   docker pull ghcr.io/v1un/mystic-chatways:latest
   ```

2. Run the container:

   ```bash
   docker run -d \
     --name mystic-chatways \
     -p 9003:9003 \
     -v mystic-data:/app/.genkit/servers \
     -v mystic-logs:/app/logs \
     ghcr.io/v1un/mystic-chatways:latest
   ```
