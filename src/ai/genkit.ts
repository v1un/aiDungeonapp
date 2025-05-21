import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Note: Server port is configured via the PORT environment variable in start-app.sh
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash-preview-05-20',
});
