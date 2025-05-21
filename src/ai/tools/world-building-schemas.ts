import { z } from 'genkit';

export interface LocationDetail {
  name: string;
  description: string;
  atmosphere: string;
  notableFeatures: string[];
  hiddenElements: string[];
  connectedLocations: string[];
}

export interface EnvironmentalElement {
  type: 'weather' | 'timeOfDay' | 'atmosphere' | 'sound' | 'smell';
  description: string;
  impact: string; // How this affects gameplay/narrative
}

// Tool schema for generating location details
export const generateLocationSchema = z.object({
  locationName: z.string().describe('Name of the location to detail'),
  locationType: z.string().describe('Type of location (e.g., forest, castle, spaceship)'),
  seriesContext: z.string().describe('Context from the fictional series this is based on'),
  mood: z.string().optional().describe('Desired mood for the location description'),
  previouslyMentionedFeatures: z.array(z.string()).optional().describe('Features already mentioned in the narrative')
});

// Tool schema for generating environmental elements
export const generateEnvironmentSchema = z.object({
  currentLocation: z.string().describe('The current location name'),
  timeProgression: z.number().min(0).max(1).describe('How much time has passed (0-1 scale, where 0 is no time passed, 1 is significant time passed)'),
  currentWeather: z.string().optional().describe('Current weather condition if known'),
  currentTimeOfDay: z.string().optional().describe('Current time of day if known'),
  desiredMood: z.string().optional().describe('Desired mood for the environment')
});

// Tool schema for retrieving location information
export const retrieveLocationSchema = z.object({
  locationName: z.string().describe('Name of the location to retrieve details for'),
  includeHidden: z.boolean().default(false).describe('Whether to include hidden elements in the response')
});
