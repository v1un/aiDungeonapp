import { NextResponse } from 'next/server';

// Health check endpoint for GenKit connectivity
export async function GET() {
  try {
    // Check if the GenKit server is running by trying multiple common ports
    // Based on actual GenKit startup output, it's running on ports 3101, 4001, and 4034
    const ports = [3101, 4001, 4034, 8080, 3000, 3001];
    let lastError: Error | null = null;
    
    for (const port of ports) {
      try {
        const response = await fetch(`http://localhost:${port}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(1000), // shorter timeout for each attempt
        });
        
        if (response.ok) {
          return NextResponse.json(
            { status: 'ok', message: `GenKit service is running on port ${port}` },
            { status: 200 }
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Failed to connect to GenKit on port ${port}:`, errorMessage);
        if (error instanceof Error) {
          lastError = error;
        } else {
          lastError = new Error(String(error));
        }
      }
    }

    // Alternative check - try to execute a simple GenKit request
    try {
      // Make a direct request to the GenKit server's root URL as a fallback
      const response = await fetch('http://localhost:8080/', {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      
      if (response.ok) {
        return NextResponse.json(
          { status: 'ok', message: 'GenKit service appears to be running' },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error('Alternative GenKit check failed:', 
        error instanceof Error ? error.message : String(error));
    }
    
    throw lastError || new Error('No GenKit server found on any port');
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
