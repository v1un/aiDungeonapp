import { NextResponse } from 'next/server';

// Simple health check endpoint for the backend
export async function GET() {
  try {
    // You could add more detailed checks here if needed
    return NextResponse.json(
      { status: 'ok', message: 'Backend service is running' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'error', message: 'Backend service check failed' },
      { status: 500 }
    );
  }
}
