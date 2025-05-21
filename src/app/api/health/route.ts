import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import path from 'path';

// Track application start time for uptime calculation
const startTime = new Date();

/**
 * Calculate application uptime in human-readable format
 */
function getUptime(): string {
  const uptime = new Date().getTime() - startTime.getTime();
  const seconds = Math.floor((uptime / 1000) % 60);
  const minutes = Math.floor((uptime / (1000 * 60)) % 60);
  const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Get application version from package.json
 */
function getAppVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || 'unknown';
  } catch (error) {
    console.error('Error reading package.json:', error);
    return 'unknown';
  }
}

/**
 * Get system information for health reporting
 */
function getSystemInfo() {
  return {
    platform: process.platform,
    nodeVersion: process.version,
    memoryUsage: {
      total: Math.round(os.totalmem() / (1024 * 1024)) + ' MB',
      free: Math.round(os.freemem() / (1024 * 1024)) + ' MB',
      percentUsed: Math.round((1 - os.freemem() / os.totalmem()) * 100) + '%'
    },
    cpuLoad: os.loadavg(),
    cpuCores: os.cpus().length
  };
}

// Enhanced health check endpoint for the backend
export async function GET() {
  try {
    // Get GenKit API port from environment or use default
    const genkitPort = process.env.GENKIT_API_PORT || '4001';
    
    // Check if GenKit service is accessible
    let genkitStatus: { status: string; message: string } = {
      status: 'unknown',
      message: 'GenKit status check not performed'
    };
    
    try {
      const response = await fetch(`http://localhost:${genkitPort}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(500), // Short timeout to avoid delays
      });
      
      if (response.ok) {
        genkitStatus = {
          status: 'ok',
          message: `Connected to GenKit on port ${genkitPort}`
        };
      } else {
        genkitStatus = {
          status: 'error',
          message: `GenKit returned status ${response.status}`
        };
      }
    } catch (error) {
      genkitStatus = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error connecting to GenKit'
      };
    }
    
    // Full health response
    return NextResponse.json({
      status: 'ok',
      version: getAppVersion(),
      uptime: getUptime(),
      startTime: startTime.toISOString(),
      serverTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      system: getSystemInfo(),
      services: {
        backend: {
          status: 'ok',
          message: 'Backend service is running'
        },
        genkit: genkitStatus
      }
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Backend service check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json'
      }
    });
  }
}
