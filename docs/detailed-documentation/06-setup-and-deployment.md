# Mystic Chatways: Setup, Development, and Deployment

This document provides instructions for setting up the Mystic Chatways application for development, building it for production, and general guidance on deployment.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js**: Version 18 or later.
*   **npm**: Version 9 or later (or Yarn as an alternative package manager).
*   **Google Cloud Account**: Required for the Genkit AI functionality, as the application leverages Google Cloud services for its AI capabilities.

## 2. Getting Started

Follow these steps to get the project up and running on your local machine:

1.  **Clone the Repository**:
    ```bash
    git clone [your-repository-url]
    cd aiDungeonapp
    ```
    (Replace `[your-repository-url]` with the actual URL of the repository).

2.  **Install Dependencies**:
    Navigate to the project's root directory and install the necessary dependencies using either npm or Yarn:
    ```bash
    npm install
    ```
    or
    ```bash
    yarn install
    ```

## 3. Environment Variables

The application requires certain environment variables to be configured for proper operation, especially for connecting to Google Cloud services.

*   Create a file named `.env.local` in the root directory of the project.
*   Add the following environment variables to this file:

    *   **`GOOGLE_APPLICATION_CREDENTIALS`**:
        *   **Description**: Path to your Google Cloud service account key JSON file. This key allows the application to authenticate with Google Cloud services used by Genkit.
        *   **Example**: `GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"`

    *   **`NEXT_PUBLIC_GENKIT_API_KEY`**:
        *   **Description**: Your API key for Genkit.
        *   **Example**: `NEXT_PUBLIC_GENKIT_API_KEY="your-genkit-api-key"`

    *   **`PORT`** (Optional, for Next.js development server):
        *   **Description**: The `package.json` script for `dev` shows `next dev --turbopack -p ${PORT:-9003}`. This means the Next.js development server will run on port `9003` by default, but you can specify a different port by setting the `PORT` environment variable.
        *   **Example**: `PORT="3000"` (to run on port 3000 instead of 9003)

*   **Note**: Ensure that the `.env.local` file is included in your `.gitignore` to prevent committing sensitive credentials to version control.

## 4. Running the Application (Development)

To run Mystic Chatways in a development environment, you need to start two separate servers: the Genkit AI server and the Next.js frontend server.

1.  **Start the GenKit AI Server**:
    Open a new terminal window, navigate to the project root, and run:
    ```bash
    npm run genkit:dev
    ```
    or if using Yarn:
    ```bash
    yarn genkit:dev
    ```
    This script, defined in `package.json` as `genkit start -- tsx src/ai/dev.ts`, starts the Genkit development server, which handles the AI logic. The `genkit:watch` script is also available for running with watch mode.

2.  **Start the Next.js Development Server**:
    Open another terminal window, navigate to the project root, and run:
    ```bash
    npm run dev
    ```
    or if using Yarn:
    ```bash
    yarn dev
    ```
    This script (`next dev --turbopack -p ${PORT:-9003}`) starts the Next.js frontend development server. By default, it will be accessible at port `9003` unless overridden by the `PORT` environment variable.

3.  **Access the Application**:
    Once both servers are running, open your web browser and navigate to:
    `http://localhost:9003` (or the port you specified in the `PORT` environment variable, e.g., `http://localhost:3000`).

## 5. Available Scripts

The `package.json` file defines several scripts for common development and build tasks:

*   **`dev`**:
    *   Command: `next dev --turbopack -p ${PORT:-9003}`
    *   Description: Starts the Next.js development server with Turbopack for faster development. Uses port 9003 by default.

*   **`genkit:dev`**:
    *   Command: `genkit start -- tsx src/ai/dev.ts`
    *   Description: Starts the Genkit AI development server.

*   **`genkit:watch`**:
    *   Command: `genkit start -- tsx --watch src/ai/dev.ts`
    *   Description: Starts the Genkit AI development server in watch mode, automatically restarting when AI-related files change.

*   **`build`**:
    *   Command: `next build`
    *   Description: Builds the Next.js application for production.

*   **`start`**:
    *   Command: `next start`
    *   Description: Starts a Next.js production server after the application has been built using `npm run build`.

*   **`lint`**:
    *   Command: `next lint`
    *   Description: Runs the Next.js ESLint checker to identify and fix code quality issues.

*   **`typecheck`**:
    *   Command: `tsc --noEmit`
    *   Description: Runs the TypeScript compiler to check for type errors in the codebase without generating JavaScript output.

*   **`test`**:
    *   (The `README.md` mentions `npm test` or `yarn test`, but there is no explicit "test" script in the provided `package.json`. If tests were configured, this command would typically run them.)

## 6. Building for Production

To build the Mystic Chatways application for a production environment:

1.  Ensure all dependencies are installed (`npm install` or `yarn install`).
2.  Run the build script:
    ```bash
    npm run build
    ```
    or
    ```bash
    yarn build
    ```
    This command compiles and optimizes the Next.js frontend. The output is typically generated in the `.next/` directory (standard for Next.js). The `ls()` output also showed a `dist/` directory which might be used for other build artifacts, possibly related to the Genkit tools or launcher scripts.

## 7. Deployment

Deploying Mystic Chatways involves deploying two main components: the Next.js frontend and the Genkit AI backend.

*   **Next.js Frontend**:
    *   The Next.js application (after being built with `npm run build`) can be deployed to various platforms that support Node.js applications.
    *   Popular choices include:
        *   **Vercel**: A platform by the creators of Next.js, offering seamless deployment for Next.js projects.
        *   **Netlify**: Another platform with strong support for Jamstack applications, including Next.js.
        *   **Custom Node.js Server**: You can host the application on your own server by running `npm start` after building the project.
        *   Other cloud platforms like AWS (e.g., Amplify, EC2+Nginx/PM2), Google Cloud (e.g., App Engine, Cloud Run), Azure (e.g., App Service).

*   **Genkit AI Server**:
    *   The Genkit AI server (started with `npm run genkit:dev` in development) needs to be deployed as a separate, long-running service.
    *   Suitable platforms for deploying Node.js-based AI backends include:
        *   **Google Cloud Run**: A serverless platform that can run stateless containers, ideal for Genkit applications.
        *   **Google Cloud Functions**: If the AI logic can be structured into individual functions.
        *   Other container-based services like AWS Fargate, Azure Container Instances, or Kubernetes.

*   **Environment Variables**:
    *   Regardless of the chosen deployment platform, you **must** configure the same environment variables (`GOOGLE_APPLICATION_CREDENTIALS`, `NEXT_PUBLIC_GENKIT_API_KEY`, etc.) in your production environment. Deployment platforms usually provide a way to set these securely.

*   **Considerations**:
    *   **Database/Storage**: If the application evolves to use a persistent database for lorebooks, game state, or user accounts (beyond the in-memory storage seen in some development tools), this database will also need to be provisioned and managed in the production environment.
    *   **Networking**: Ensure that the deployed frontend can communicate with the deployed Genkit AI server. This might involve configuring CORS or API gateways depending on your setup.
