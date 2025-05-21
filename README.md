# Mystic Chatways

Mystic Chatways is an AI-powered text-based RPG application that lets you explore fictional universes through an interactive chat interface with an AI Game Master. Create and play in AI-generated worlds based on your favorite media, manage your inventory, complete quests, and shape your own story.

## Features

- 🎮 Interactive chat interface with a responsive AI Game Master
- 🌌 Create and explore AI-generated fictional worlds
- 📚 Track inventory, quests, and character information
- 💾 Multiple game session support with local storage
- 📖 Lorebook system for each fictional universe
- ⚙️ Customizable user settings

## Prerequisites

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
