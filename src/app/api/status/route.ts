import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';

// Get application version from package.json
async function getAppVersion(): Promise<string> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    return packageJson.version || 'unknown';
  } catch (error) {
    console.error('Error reading package.json:', error);
    return 'unknown';
  }
}

// Get log file content
async function getLogSummary(logFilePath: string, maxLines: number = 10): Promise<string[]> {
  try {
    const fileContent = await fs.readFile(path.join(process.cwd(), logFilePath), 'utf8');
    return fileContent.split('\n')
      .filter(line => line.trim() !== '')
      .slice(-maxLines);
  } catch (error) {
    return [`Error reading log: ${error instanceof Error ? error.message : String(error)}`];
  }
}

// Check if service is running on specific port
async function isServiceUp(port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);
    
    const response = await fetch(`http://localhost:${port}/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function GET(request: Request) {
  // Check if this is an authenticated request
  // In a real app, you'd implement proper auth here
  const url = new URL(request.url);
  const apiKey = url.searchParams.get('api_key');
  
  // Very basic auth check - in production, use proper auth
  const isAuthorized = apiKey === process.env.STATUS_API_KEY || process.env.NODE_ENV !== 'production';
  
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Should we include logs? (only with detailed=true parameter)
  const detailed = url.searchParams.get('detailed') === 'true';
  
  try {
    const version = await getAppVersion();
    
    // Get service statuses
    const nextjsPort = parseInt(process.env.PORT || '9003', 10);
    const genkitPort = parseInt(process.env.GENKIT_API_PORT || '4001', 10);
    
    const genkitUp = await isServiceUp(genkitPort);
    
    // Basic status response
    const statusResponse: any = {
      application: {
        name: 'Mystic Chatways',
        version,
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime() + ' seconds',
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          total: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
          free: `${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`,
          usage: `${Math.round((1 - os.freemem() / os.totalmem()) * 100)}%`
        },
        cpuCores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      services: {
        nextjs: { 
          status: 'up',
          port: nextjsPort
        },
        genkit: { 
          status: genkitUp ? 'up' : 'down',
          port: genkitPort
        }
      }
    };
    
    // Add detailed log information if requested
    if (detailed) {
      statusResponse.logs = {
        error: await getLogSummary('logs/errors.log', 20),
        genkit: await getLogSummary('logs/genkit.log', 10),
        nextjs: await getLogSummary('logs/nextjs.log', 10)
      };
    }
    
    return NextResponse.json(statusResponse);
  } catch (error) {
    console.error('Status check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to get application status',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
