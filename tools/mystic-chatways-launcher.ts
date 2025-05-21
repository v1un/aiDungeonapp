#!/usr/bin/env node

/**
 * Mystic Chatways Launcher (TypeScript Version)
 * 
 * A robust Node.js launcher script for starting and monitoring the Mystic Chatways app.
 * This script properly handles:
 * - Process management for both servers
 * - Port configuration
 * - Health monitoring
 * - Clean shutdown
 */

import { spawn, exec, ChildProcess } from 'child_process';
import * as http from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';

// Types
interface ProcessInfo {
  process: ChildProcess | null;
  name: string;
  logStream: fs.FileHandle | null;
  logFile: string;
  frontendLogFile?: string;
  backendLogFile?: string;
  errorLogFile?: string;
}

interface Ports {
  genkitAPI: number | null;
  genkitUI: number | null;
  genkitTelemetry: number | null;
  nextjs: number;
}

interface Config {
  nextjsPort: number;
  logDir: string;
  readyCheckMaxAttempts: number;
  readyCheckInterval: number;
  startTimeout: number;
  processNames: {
    genkit: string;
    nextjs: string;
  };
}

// Configuration
const config: Config = {
  nextjsPort: parseInt(process.env.PORT || '9003', 10),
  logDir: path.join(process.cwd(), 'logs'),
  readyCheckMaxAttempts: 30,  // Reduced to make startup faster
  readyCheckInterval: 1000, // 1 second between health checks
  startTimeout: 90000,  // 90 seconds overall timeout
  processNames: {
    genkit: 'GenKit',
    nextjs: 'Next.js'
  }
};

// Frontend detection patterns (used to filter and categorize logs)
const FRONTEND_PATTERNS = [
  /client/i,
  /browser/i,
  /react/i,
  /component/i,
  /rendering/i,
  /jsx|tsx/i,
  /\[HMR\]/i
];

// Backend detection patterns
const BACKEND_PATTERNS = [
  /api/i,
  /server/i,
  /route/i,
  /endpoint/i,
  /http/i,
  /POST|GET|PUT|DELETE/i
];

// Error detection patterns
const ERROR_PATTERNS = [
  /error/i,
  /exception/i,
  /fail/i,
  /crash/i,
  /unable to/i
];

// Store detected ports
const ports: Ports = {
  genkitAPI: null,
  genkitUI: null, 
  genkitTelemetry: null,
  nextjs: config.nextjsPort
};

// Function to ensure we have an available port for Next.js
async function setupAvailablePorts(): Promise<void> {
  // Check if default Next.js port is available, if not find one that is
  const availablePort = await findAvailablePort(config.nextjsPort);
  if (availablePort !== config.nextjsPort) {
    console.log(`Port ${config.nextjsPort} is already in use, using port ${availablePort} instead`);
    config.nextjsPort = availablePort;
    ports.nextjs = availablePort;
  }
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bright: {
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    red: '\x1b[91m',
  },
  bg: {
    black: '\x1b[40m',
    blue: '\x1b[44m',
  }
} as const;

// Store process references
const processes: Record<string, ProcessInfo> = {
  genkit: {
    process: null,
    name: config.processNames.genkit,
    logStream: null,
    logFile: path.join(config.logDir, 'genkit.log'),
    errorLogFile: path.join(config.logDir, 'genkit-error.log')
  },
  nextjs: {
    process: null,
    name: config.processNames.nextjs,
    logStream: null,
    logFile: path.join(config.logDir, 'nextjs.log'),
    frontendLogFile: path.join(config.logDir, 'frontend.log'),
    backendLogFile: path.join(config.logDir, 'backend.log'),
    errorLogFile: path.join(config.logDir, 'nextjs-error.log')
  }
};

// Create a centralized error log
const centralErrorLogFile = path.join(config.logDir, 'errors.log');

/**
 * Print a banner message
 */
function printBanner(): void {
  console.log('\n' + colors.bg.blue + colors.white + '==================================' + colors.reset);
  console.log(colors.bg.blue + colors.bright.green + '    Mystic Chatways Launcher    ' + colors.reset);
  console.log(colors.bg.blue + colors.white + '==================================' + colors.reset + '\n');
}

/**
 * Log a message with timestamp and optional color
 */
function log(message: string, color: string = colors.reset): void {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

/**
 * Write a message to a log file with timestamp
 */
async function writeToLog(message: string, logFile: string, category?: string): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}]${category ? ` [${category}]` : ''} ${message}\n`;
    await fs.appendFile(logFile, logMessage);
  } catch (error) {
    console.error(`Failed to write to log file ${logFile}: ${(error as Error).message}`);
  }
}

/**
 * Process log output to categorize as frontend, backend, or error
 */
async function processLogOutput(message: string, source: 'genkit' | 'nextjs'): Promise<void> {
  const sourceProcess = processes[source];
  
  // Write to main log file
  await writeToLog(message, sourceProcess.logFile);
  
  // Check if it's an error message
  const isError = ERROR_PATTERNS.some(pattern => pattern.test(message));
  if (isError) {
    if (sourceProcess.errorLogFile) {
      await writeToLog(message, sourceProcess.errorLogFile, 'ERROR');
    }
    await writeToLog(`[${sourceProcess.name}] ${message}`, centralErrorLogFile, 'ERROR');
  }
  
  // Only categorize frontend/backend for nextjs
  if (source === 'nextjs') {
    const isFrontend = FRONTEND_PATTERNS.some(pattern => pattern.test(message));
    const isBackend = BACKEND_PATTERNS.some(pattern => pattern.test(message));
    
    if (isFrontend && sourceProcess.frontendLogFile) {
      await writeToLog(message, sourceProcess.frontendLogFile, 'FRONTEND');
    } else if (isBackend && sourceProcess.backendLogFile) {
      await writeToLog(message, sourceProcess.backendLogFile, 'BACKEND');
    }
  }
}

/**
 * Log an error message
 */
function logError(message: string): void {
  log(message, colors.bright.red);
}

/**
 * Log a success message
 */
function logSuccess(message: string): void {
  log(message, colors.bright.green);
}

/**
 * Log an info message
 */
function logInfo(message: string): void {
  log(message, colors.bright.yellow);
}

/**
 * Check if a port is in use
 */
async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
}

/**
 * Find an available port starting from the specified one
 */
async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (await isPortInUse(port)) {
    port++;
  }
  return port;
}

/**
 * Check if a URL is reachable
 */
async function isUrlReachable(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const req = http.get(url, (res) => {
        res.on('data', () => {}); // Consume data
        resolve(res.statusCode ? res.statusCode >= 200 && res.statusCode < 400 : false);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    } catch (err) {
      // In case of any unexpected errors
      resolve(false);
    }
  });
}

/**
 * Wait for a service to be ready by checking its health endpoint
 */
async function waitForServiceReady(
  name: string, 
  checkFn: () => Promise<boolean>,
  maxAttempts: number = config.readyCheckMaxAttempts,
  allowFailure: boolean = false
): Promise<boolean> {
  logInfo(`Waiting for ${name} to be ready...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (await checkFn()) {
        logSuccess(`${name} is ready!`);
        return true;
      }
    } catch (err) {
      // Just log and continue if there's an error during the check
      if (attempt % 10 === 0) {
        logInfo(`Error checking ${name} readiness: ${(err as Error).message}`);
      }
    }
    
    // Every 10 attempts, provide a status update
    if (attempt % 10 === 0) {
      logInfo(`Still waiting for ${name} to be ready (${attempt}/${maxAttempts})...`);
    }
    
    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, config.readyCheckInterval));
  }
  
  if (!allowFailure) {
    logError(`Timed out waiting for ${name} to be ready after ${maxAttempts} attempts`);
  }
  
  return false;
}

/**
 * Extract port information from GenKit server output
 */
function extractPortInfo(data: string): void {
  const lines = data.toString().split('\n');
  
  for (const line of lines) {
    // Match API server port
    const apiMatch = line.match(/API server running at http:\/\/[^:]+:(\d+)/);
    if (apiMatch && !ports.genkitAPI) {
      ports.genkitAPI = parseInt(apiMatch[1], 10);
      logInfo(`Detected GenKit API port: ${ports.genkitAPI}`);
    }
    
    // Match UI server port
    const uiMatch = line.match(/UI server running at http:\/\/[^:]+:(\d+)/);
    if (uiMatch && !ports.genkitUI) {
      ports.genkitUI = parseInt(uiMatch[1], 10);
      logInfo(`Detected GenKit UI port: ${ports.genkitUI}`);
    }
    
    // Match Telemetry server port
    const telemetryMatch = line.match(/Telemetry server running at http:\/\/[^:]+:(\d+)/);
    if (telemetryMatch && !ports.genkitTelemetry) {
      ports.genkitTelemetry = parseInt(telemetryMatch[1], 10);
      logInfo(`Detected GenKit Telemetry port: ${ports.genkitTelemetry}`);
    }
  }
}

/**
 * Detect the GenKit API port by testing common ports
 */
async function detectGenkitApiPort(): Promise<number> {
  const commonPorts = [4000, 4001, 3000, 3001, 5000, 5001, 8080, 8081];
  
  for (const port of commonPorts) {
    const isReachable = await isUrlReachable(`http://localhost:${port}/health`);
    if (isReachable) {
      logInfo(`Detected GenKit API on port ${port}`);
      return port;
    }
  }
  
  // If no port found, return default
  return 4000;
}

/**
 * Start the GenKit server
 */
async function startGenkitServer(): Promise<void> {
  logInfo('Starting GenKit server...');
  
  try {
    // Create logs directory if it doesn't exist
    await fs.mkdir(config.logDir, { recursive: true });
    
    // Open log file
    const logStream = await fs.open(processes.genkit.logFile, 'a');
    processes.genkit.logStream = logStream;
    
    // Start the GenKit server
    const genkitProcess = spawn('npm', ['run', 'genkit:dev'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
    processes.genkit.process = genkitProcess;
    
    // Handle process output
    genkitProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      logStream.write(output);
      extractPortInfo(output);
      processLogOutput(output, 'genkit');
      console.log(`[${processes.genkit.name}] ${output}`);
    });
    
    genkitProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      logStream.write(`ERROR: ${error}`);
      processLogOutput(`ERROR: ${error}`, 'genkit');
      console.error(`[${processes.genkit.name} ERROR] ${error}`);
    });
    
    genkitProcess.on('exit', (code) => {
      logError(`GenKit server exited with code ${code}`);
      if (code !== 0) {
        logError('GenKit server failed to start. Check the logs for more details.');
      }
    });
    
    // Wait for GenKit to be ready
    const isReady = await waitForServiceReady(
      'GenKit',
      async () => {
        if (!ports.genkitAPI) {
          // Try to detect the port if not found in logs
          ports.genkitAPI = await detectGenkitApiPort();
        }
        return ports.genkitAPI !== null && 
               await isUrlReachable(`http://localhost:${ports.genkitAPI}/health`);
      },
      config.readyCheckMaxAttempts,
      true // Allow failure to continue
    );
    
    if (!isReady) {
      logError('GenKit server did not start properly. Continuing anyway...');
    }
    
  } catch (error) {
    logError(`Failed to start GenKit server: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Start the Next.js server
 */
async function startNextjsServer(): Promise<void> {
  logInfo('Starting Next.js server...');
  
  try {
    // Create logs directory if it doesn't exist
    await fs.mkdir(config.logDir, { recursive: true });
    
    // Open log file
    const logStream = await fs.open(processes.nextjs.logFile, 'a');
    processes.nextjs.logStream = logStream;
    
    // Start the Next.js server
    const nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { 
        ...process.env, 
        PORT: ports.nextjs.toString(),
        FORCE_COLOR: '1',
        // Pass GenKit ports to the Next.js app
        GENKIT_API_URL: ports.genkitAPI ? `http://localhost:${ports.genkitAPI}` : '',
        GENKIT_UI_URL: ports.genkitUI ? `http://localhost:${ports.genkitUI}` : ''
      }
    });
    
    processes.nextjs.process = nextProcess;
    
    // Handle process output
    nextProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      logStream.write(output);
      processLogOutput(output, 'nextjs');
      console.log(`[${processes.nextjs.name}] ${output}`);
    });
    
    nextProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      logStream.write(`ERROR: ${error}`);
      processLogOutput(`ERROR: ${error}`, 'nextjs');
      console.error(`[${processes.nextjs.name} ERROR] ${error}`);
    });
    
    nextProcess.on('exit', (code) => {
      logError(`Next.js server exited with code ${code}`);
      if (code !== 0) {
        logError('Next.js server failed to start. Check the logs for more details.');
      }
    });
    
    // Wait for Next.js to be ready
    const isReady = await waitForServiceReady(
      'Next.js',
      () => isUrlReachable(`http://localhost:${ports.nextjs}/`)
    );
    
    if (!isReady) {
      throw new Error('Next.js server did not start properly');
    }
    
  } catch (error) {
    logError(`Failed to start Next.js server: ${(error as Error).message}`);
    throw error;
  }
}

// ... (rest of the code remains the same)

/**
 * Print a summary of the running services
 */
function printSummary(): void {
  console.log('\n' + colors.bg.blue + colors.white + '='.repeat(80) + colors.reset);
  console.log(colors.bg.blue + colors.bright.green + ' ' + 'Mystic Chatways - Services Status'.padEnd(78) + ' ' + colors.reset);
  console.log(colors.bg.blue + colors.white + '='.repeat(80) + colors.reset);
  
  console.log(`\n${colors.bright.green}Services:${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} ${processes.genkit.name.padEnd(10)}: ${processes.genkit.process ? colors.green + 'Running' + colors.reset : colors.red + 'Stopped' + colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} ${processes.nextjs.name.padEnd(10)}: ${processes.nextjs.process ? colors.green + 'Running' + colors.reset : colors.red + 'Stopped' + colors.reset}`);
  
  console.log(`\n${colors.bright.green}Ports:${colors.reset}`);
  if (ports.genkitAPI) console.log(`  ${colors.cyan}•${colors.reset} GenKit API:       ${colors.yellow}http://localhost:${ports.genkitAPI}${colors.reset}`);
  if (ports.genkitUI) console.log(`  ${colors.cyan}•${colors.reset} GenKit UI:        ${colors.yellow}http://localhost:${ports.genkitUI}${colors.reset}`);
  if (ports.genkitTelemetry) console.log(`  ${colors.cyan}•${colors.reset} GenKit Telemetry:  ${colors.yellow}http://localhost:${ports.genkitTelemetry}${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} Next.js:         ${colors.yellow}http://localhost:${ports.nextjs}${colors.reset}`);
  
  console.log(`\n${colors.bright.green}Logs:${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} GenKit:          ${colors.yellow}${processes.genkit.logFile}${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} Next.js:         ${colors.yellow}${processes.nextjs.logFile}${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} Frontend:        ${colors.yellow}${processes.nextjs.frontendLogFile}${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} Backend:         ${colors.yellow}${processes.nextjs.backendLogFile}${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} GenKit Errors:   ${colors.yellow}${processes.genkit.errorLogFile}${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} Next.js Errors:  ${colors.yellow}${processes.nextjs.errorLogFile}${colors.reset}`);
  console.log(`  ${colors.cyan}•${colors.reset} All Errors:      ${colors.yellow}${centralErrorLogFile}${colors.reset}`);
  
  console.log('\n' + colors.bg.blue + colors.white + '='.repeat(80) + colors.reset + '\n');
}

/**
 * Clean shutdown of all processes
 */
async function shutdown(exitCode: number = 0): Promise<void> {
  logInfo('Shutting down services...');
  
  // Shutdown Next.js server
  if (processes.nextjs.process) {
    logInfo('Stopping Next.js server...');
    processes.nextjs.process.kill('SIGTERM');
    
    // Close log stream
    if (processes.nextjs.logStream) {
      await processes.nextjs.logStream.close();
    }
  }
  
  // Shutdown GenKit server
  if (processes.genkit.process) {
    logInfo('Stopping GenKit server...');
    processes.genkit.process.kill('SIGTERM');
    
    // Close log stream
    if (processes.genkit.logStream) {
      await processes.genkit.logStream.close();
    }
  }
  
  // Exit the process
  process.exit(exitCode);
}

/**
 * Set up signal handlers for graceful shutdown
 */
function setupSignalHandlers(): void {
  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    logInfo('Received SIGINT. Shutting down gracefully...');
    await shutdown(0);
  });
  
  // Handle other termination signals
  process.on('SIGTERM', async () => {
    logInfo('Received SIGTERM. Shutting down gracefully...');
    await shutdown(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logError(`Uncaught exception: ${error.message}`);
    console.error(error);
    await shutdown(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason) => {
    logError(`Unhandled rejection: ${reason}`);
    console.error(reason);
    await shutdown(1);
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Print banner
    printBanner();
    
    // Set up signal handlers for graceful shutdown
    setupSignalHandlers();
    
    logInfo('Starting Mystic Chatways services...');
    
    // Create logs directory
    await fs.mkdir(config.logDir, { recursive: true });
    
    // Clear or rotate log files
    const logFiles = [
      processes.genkit.logFile,
      processes.nextjs.logFile,
      processes.nextjs.frontendLogFile,
      processes.nextjs.backendLogFile,
      processes.genkit.errorLogFile,
      processes.nextjs.errorLogFile,
      centralErrorLogFile
    ];
    
    for (const logFile of logFiles) {
      if (!logFile) continue;
      
      try {
        // Check if file exists
        const stats = await fs.stat(logFile).catch(() => null);
        
        if (stats) {
          // If larger than 10MB, rotate the log
          if (stats.size > 10 * 1024 * 1024) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            await fs.rename(logFile, `${logFile}.${timestamp}.bak`);
          } else {
            // Otherwise just clear it
            await fs.writeFile(logFile, '');
          }
        }
      } catch (err) {
        // Ignore errors
      }
    }
    
    // Check for available ports before starting
    await setupAvailablePorts();
    
    // Start GenKit server
    await startGenkitServer();
    
    // Start Next.js server
    await startNextjsServer();
    
    // Print summary
    printSummary();
    
    logSuccess('Mystic Chatways is now running!');
    logInfo('Press Ctrl+C to stop all services.');
    
  } catch (error) {
    logError(`Failed to start Mystic Chatways: ${(error as Error).message}`);
    console.error(error);
    await shutdown(1);
  }
}

// Start the application
main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
