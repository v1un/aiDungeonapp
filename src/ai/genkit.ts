import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';

// Load environment variables
import dotenv from 'dotenv';
// Try loading from .env and .env.local files
dotenv.config();
dotenv.config({ path: '.env.local' });

/**
 * AI Model Configuration
 * 
 * This module configures the AI model and provides fallback mechanisms for different environments.
 * It handles API key validation and model selection based on environment.
 */

// Note: Server port is configured via the PORT environment variable in start-app.sh
// Get API key from environment variables
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// Define available models with fallback options
const MODELS = {
  production: 'googleai/gemini-2.5-flash-preview-05-20',
  development: 'googleai/gemini-1.5-flash',
  fallback: 'googleai/gemini-1.0-pro'
};

// Validate API key presence
if (!apiKey) {
  console.warn('⚠️ No API key found. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
  // In production, this would be a critical error
  if (process.env.NODE_ENV === 'production') {
    console.error('🛑 Missing API key in production environment. AI functionality will be unavailable.');
  }
}

// Select model based on environment
const selectedModel = process.env.NODE_ENV === 'production' 
  ? MODELS.production 
  : MODELS.development;

// Initialize the AI with proper configuration
export const ai = genkit({
  plugins: [googleAI({
    apiKey: apiKey || 'dummy-key-for-initialization', // Will fail gracefully with API error if key is missing
  })],
  model: selectedModel,
});
// Re-export z for schema definitions to avoid importing from multiple places
// Export both the AI instance and z for schema definitions
export {z, genkit};
