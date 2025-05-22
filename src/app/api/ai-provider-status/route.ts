import { NextResponse } from 'next/server';

// Ensure environment variables are loaded.
// Depending on the deployment environment, this might already be handled,
// but it's good practice for Next.js API routes that rely on process.env.
// import dotenv from 'dotenv';
// dotenv.config(); // For .env
// dotenv.config({ path: '.env.local', override: true }); // For .env.local, potentially overriding .env

export async function GET() {
  // Read the AI_PROVIDER environment variable. Default to 'googleai' if not set.
  const aiProvider = process.env.AI_PROVIDER || 'googleai';
  
  // Log to server console for debugging (optional)
  console.log(`API Route: AI_PROVIDER is currently set to: ${aiProvider}`);

  return NextResponse.json({ aiProvider });
}
