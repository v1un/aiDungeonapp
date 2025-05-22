import { NextResponse } from 'next/server';

// Health check endpoint for GenKit connectivity
export async function GET() {
  try {
    // Get the GenKit API port - try both port and URL variables
    // The launcher sets both GENKIT_API_PORT and GENKIT_API_URL
    const genkitPort = process.env.GENKIT_API_PORT || '4000'; // Default to 4000 now
    const genkitApiUrl = process.env.GENKIT_API_URL || `http://localhost:${genkitPort}`;
    
    // Extract port from URL if available, otherwise use the port directly
    const effectivePort = genkitApiUrl.includes('://') 
      ? new URL(genkitApiUrl).port || '4000' 
      : genkitPort;
    
    console.log(`Checking GenKit health on port ${effectivePort}`);
    
    try {
      // Check the API port with the health endpoint
      const response = await fetch(`http://localhost:${effectivePort}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(2000),
      });
      
      if (response.ok) {
        return NextResponse.json(
          { status: 'ok', message: `GenKit service is running on port ${genkitPort}` },
          { status: 200 }
        );
      } else {
        console.error(`GenKit health check failed with status: ${response.status}`);
        throw new Error(`GenKit returned status ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to connect to GenKit on port ${genkitPort}:`, errorMessage);
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('GenKit health check failed:', errorMessage);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'GenKit service connection failed. Make sure to run "npm run genkit:dev" in another terminal.' 
      },
      { status: 503 }
    );
  }
}
