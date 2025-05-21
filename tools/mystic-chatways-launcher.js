#!/usr/bin/env node

/**
 * Mystic Chatways Launcher
 * 
 * A robust Node.js launcher script for starting and monitoring the Mystic Chatways app.
 * This script properly handles:
 * - Process management for both servers
 * - Port configuration
 * - Health monitoring
 * - Clean shutdown
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const config = {
  nextjsPort: process.env.PORT || 9003,
  logDir: path.join(process.cwd(), 'logs'),
  readyCheckMaxAttempts: 30,  // Reduced to make startup faster
  readyCheckInterval: 1000, // 1 second between health checks
  startTimeout: 90000,  // 90 seconds overall timeout
  processNames: {
    genkit: 'GenKit',
    nextjs: 'Next.js'
  }
};

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
};

// Store process references
const processes = {
  genkit: null,
  nextjs: null
};

// Store detected ports
const ports = {
  genkitAPI: null,
  genkitUI: null, 
  genkitTelemetry: null,
  nextjs: config.nextjsPort
};

// Setup log directory
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

// Create log streams
const logFiles = {
  genkit: fs.createWriteStream(path.join(config.logDir, 'genkit.log'), { flags: 'a' }),
  nextjs: fs.createWriteStream(path.join(config.logDir, 'nextjs.log'), { flags: 'a' })
};

/**
 * Print a banner message
 */
function printBanner() {
  console.log('\n' + colors.bg.blue + colors.white + '==================================' + colors.reset);
  console.log(colors.bg.blue + colors.bright.green + '    Mystic Chatways Launcher    ' + colors.reset);
  console.log(colors.bg.blue + colors.white + '==================================' + colors.reset + '\n');
}

/**
 * Log a message with timestamp and optional color
 */
function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

/**
 * Log an error message
 */
function logError(message) {
  log(message, colors.bright.red);
}

/**
 * Log a success message
 */
function logSuccess(message) {
  log(message, colors.bright.green);
}

/**
 * Log an info message
 */
function logInfo(message) {
  log(message, colors.bright.yellow);
}

/**
 * Check if a port is in use
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.once('error', (err) => {
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
async function findAvailablePort(startPort) {
  let port = startPort;
  while (await isPortInUse(port)) {
    port++;
  }
  return port;
}

/**
 * Check if a URL is reachable
 */
async function isUrlReachable(url) {
  return new Promise((resolve) => {
    try {
      const req = http.get(url, (res) => {
        res.on('data', () => {}); // Consume data
        resolve(res.statusCode >= 200 && res.statusCode < 400);
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
async function waitForServiceReady(name, checkFn, maxAttempts = config.readyCheckMaxAttempts, allowFailure = false) {
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
        logInfo(`Error checking ${name} readiness: ${err.message}`);
      }
    }
    
    // Every 10 attempts, provide a status update
    if (attempt % 10 === 0) {
      logInfo(`Still waiting for ${name} to be ready (${attempt}/${maxAttempts})...`);
    }
    
    // Short delay before next attempt
    await new Promise(resolve => setTimeout(resolve, config.readyCheckInterval));
  }
  
  if (allowFailure) {
    logInfo(`Couldn't verify ${name} is ready, but continuing anyway as requested`);
    return true;
  } else {
    logError(`Timed out waiting for ${name} to be ready after ${maxAttempts} attempts`);
    return false;
  }
}

/**
 * Extract port information from GenKit server output
 */
function extractPortInfo(data) {
  const stringData = data.toString();
  
  // Log the raw data to the log file
  logFiles.genkit.write(stringData);
  
  // Extract UI port
  const uiPortMatch = stringData.match(/Genkit Developer UI: http:\/\/localhost:(\d+)/);
  if (uiPortMatch && !ports.genkitUI) {
    ports.genkitUI = parseInt(uiPortMatch[1], 10);
    logSuccess(`Detected GenKit UI port: ${ports.genkitUI}`);
  }
  
  // Extract Telemetry port
  const telemetryPortMatch = stringData.match(/Telemetry API running on http:\/\/localhost:(\d+)/);
  if (telemetryPortMatch && !ports.genkitTelemetry) {
    ports.genkitTelemetry = parseInt(telemetryPortMatch[1], 10);
    logSuccess(`Detected GenKit Telemetry port: ${ports.genkitTelemetry}`);
  }
  
  // Return true if we found both UI and Telemetry ports
  return ports.genkitUI && ports.genkitTelemetry;
}

/**
 * Detect the GenKit API port by testing common ports
 */
async function detectGenkitApiPort() {
  // First try guessing - the API port is often the UI port + 1
  const potentialPorts = [];
  
  // If we detected the UI port, the API port is likely close to it
  if (ports.genkitUI) {
    potentialPorts.push(ports.genkitUI + 1);
    potentialPorts.push(ports.genkitUI + 2);
  }
  
  // Add common ports
  potentialPorts.push(4001, 4002, 4003, 4004, 3000, 3001, 8080);
  
  // Try some nearby telemetry port numbers if detected
  if (ports.genkitTelemetry) {
    potentialPorts.push(ports.genkitTelemetry - 2);
    potentialPorts.push(ports.genkitTelemetry - 1);
    potentialPorts.push(ports.genkitTelemetry + 1);
  }
  
  // Remove duplicates and sort
  const uniquePorts = [...new Set(potentialPorts)].sort((a, b) => a - b);
  
  // Log that we're trying to find the API port
  logInfo(`Searching for GenKit API port among candidates: ${uniquePorts.join(', ')}...`);
  
  // Try each port
  for (const port of uniquePorts) {
    logInfo(`Checking for GenKit API on port ${port}...`);
    try {
      if (await isUrlReachable(`http://localhost:${port}/health`)) {
        ports.genkitAPI = port;
        logSuccess(`Detected GenKit API port: ${port}`);
        return true;
      }
    } catch (err) {
      // Continue to the next port if this one fails
    }
  }
  
  // If still not found, try a different approach: check for any port that responds to API-like requests
  logInfo('API port not found with health endpoint, trying alternative detection...');
  
  // Try a wider range of ports as a fallback
  const widerPortRange = Array.from({length: 20}, (_, i) => 4000 + i);
  
  for (const port of widerPortRange) {
    try {
      // Try a simple GET request without the /health endpoint
      if (await isUrlReachable(`http://localhost:${port}`)) {
        // If it responds, try to use it as the API port
        ports.genkitAPI = port;
        logSuccess(`Found potential GenKit API port: ${port} (using fallback method)`);
        return true;
      }
    } catch (err) {
      // Continue to the next port
    }
  }
  
  // Not found but we have UI port, so let's use a fallback
  if (ports.genkitUI) {
    logInfo(`Could not detect GenKit API port. Using UI port ${ports.genkitUI} as fallback.`);
    ports.genkitAPI = ports.genkitUI;
    return true;
  }
  
  return false;
}

/**
 * Start the GenKit server
 */
async function startGenkitServer() {
  logInfo('Starting GenKit server...');
  
  // Kill any existing GenKit processes
  exec('pkill -f "genkit start"');
  
  // Ensure .genkit directory exists
  if (!fs.existsSync('.genkit')) {
    fs.mkdirSync('.genkit', { recursive: true });
  }
  
  // Start the GenKit server
  processes.genkit = spawn('npm', ['run', 'genkit:dev'], {
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let portsDetected = false;
  
  // Handle stdout
  processes.genkit.stdout.on('data', (data) => {
    // Check if we can extract port info from the output
    portsDetected = extractPortInfo(data) || portsDetected;
    
    // Display important messages to the console
    const stringData = data.toString();
    if (stringData.includes('error') || stringData.includes('Error') || 
        stringData.includes('Genkit Developer UI') || stringData.includes('Telemetry API')) {
      log(stringData.trim());
    }
  });
  
  // Handle stderr
  processes.genkit.stderr.on('data', (data) => {
    logFiles.genkit.write(data);
    logError(`GenKit error: ${data.toString().trim()}`);
  });
  
  // Handle process exit
  processes.genkit.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      logError(`GenKit process exited with code ${code}`);
    }
  });
  
  // Wait for GenKit UI and Telemetry ports to be detected
  let startTime = Date.now();
  while (!portsDetected && Date.now() - startTime < 30000) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // If we couldn't detect ports from the log output, try to detect them manually
  if (!portsDetected) {
    logInfo('Could not detect GenKit ports from log output, trying to detect API port manually...');
    await detectGenkitApiPort();
  } else {
    // If we detected UI and Telemetry ports, try to detect the API port
    await detectGenkitApiPort();
  }
  
  // Wait for GenKit API to be ready - but continue even if health check fails
  if (ports.genkitAPI) {
    const apiReady = await waitForServiceReady(
      'GenKit API',
      async () => await isUrlReachable(`http://localhost:${ports.genkitAPI}/health`),
      config.readyCheckMaxAttempts,
      true // Allow failure - continue even if health check fails
    );
  } else {
    // We couldn't detect the API port but already have a fallback from detectGenkitApiPort()
    logInfo('Using best-guess for GenKit API port. The application should still work.');
  }
  
  // If we got this far, we have the UI and at least tried to get the API port
  // Let's consider this a success and let the Next.js app handle any API connectivity issues
  return true;
}

/**
 * Start the Next.js server
 */
async function startNextjsServer() {
  logInfo(`Starting Next.js server on port ${ports.nextjs}...`);
  
  // Kill any existing Next.js processes
  exec('pkill -f "next dev"');
  
  // Set environment variables for the detected GenKit ports
  const env = {
    ...process.env,
    PORT: ports.nextjs,
    GENKIT_API_PORT: ports.genkitAPI,
    GENKIT_UI_PORT: ports.genkitUI,
    GENKIT_TELEMETRY_PORT: ports.genkitTelemetry
  };
  
  // Add flags to ensure proper startup of Next.js
  processes.nextjs = spawn('npm', ['run', 'dev', '--', '--port', ports.nextjs.toString()], {
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Handle stdout
  processes.nextjs.stdout.on('data', (data) => {
    logFiles.nextjs.write(data);
    const stringData = data.toString();
    if (stringData.includes('error') || stringData.includes('Error') || 
        stringData.includes('ready') || stringData.includes('started')) {
      log(stringData.trim());
    }
  });
  
  // Handle stderr
  processes.nextjs.stderr.on('data', (data) => {
    logFiles.nextjs.write(data);
    logError(`Next.js error: ${data.toString().trim()}`);
  });
  
  // Handle process exit
  processes.nextjs.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      logError(`Next.js process exited with code ${code}`);
    }
  });
  
  // Wait for Next.js to be ready (with a longer timeout but allowing failures)
  const nextjsReady = await waitForServiceReady(
    'Next.js',
    async () => await isUrlReachable(`http://localhost:${ports.nextjs}`),
    config.readyCheckMaxAttempts * 2,  // Double the attempts for Next.js
    true  // Continue even if we can't immediately connect
  );
  
  // We'll show it as running even if health check failed
  logSuccess('Next.js server is starting. The application should be available momentarily.');
  
  return true;
}

/**
 * Print a summary of the running services
 */
function printSummary() {
  console.log('\n' + colors.bg.blue + colors.white + '==================================' + colors.reset);
  console.log(colors.bright.green + '  Mystic Chatways is now running!  ' + colors.reset);
  console.log(colors.bg.blue + colors.white + '==================================' + colors.reset);
  
  console.log('\n' + colors.cyan + 'Server Information:' + colors.reset);
  console.log(`${colors.white}• Application:    ${colors.bright.green}http://localhost:${ports.nextjs}${colors.reset}`);
  
  if (ports.genkitUI) {
    console.log(`${colors.white}• GenKit UI:      ${colors.bright.green}http://localhost:${ports.genkitUI}${colors.reset}`);
  }
  
  if (ports.genkitAPI) {
    console.log(`${colors.white}• GenKit API:     ${colors.bright.green}http://localhost:${ports.genkitAPI}${colors.reset}`);
  }
  
  console.log('\n' + colors.cyan + 'Log Files:' + colors.reset);
  console.log(`${colors.white}• GenKit:         ${colors.yellow}${path.join(config.logDir, 'genkit.log')}${colors.reset}`);
  console.log(`${colors.white}• Next.js:        ${colors.yellow}${path.join(config.logDir, 'nextjs.log')}${colors.reset}`);
  
  console.log('\n' + colors.cyan + 'Controls:' + colors.reset);
  console.log(`${colors.white}• Press ${colors.bright.yellow}q${colors.white} to quit${colors.reset}`);
  console.log(`${colors.white}• Press ${colors.bright.yellow}r${colors.white} to restart all servers${colors.reset}`);
  console.log(`${colors.white}• Press ${colors.bright.yellow}l${colors.white} to show logs${colors.reset}`);
}

/**
 * Handle user input for interactive control
 */
function setupInteractiveControls() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  
  process.stdin.on('keypress', (str, key) => {
    // Allow ctrl+c to exit
    if (key.ctrl && key.name === 'c') {
      shutdown();
    }
    
    // Single key commands
    switch(key.name) {
      case 'q':
        shutdown();
        break;
      case 'r':
        logInfo('Restarting servers...');
        restart();
        break;
      case 'l':
        showLogs();
        break;
    }
  });
  
  logInfo('Interactive controls enabled. Press q to quit, r to restart, l to show logs.');
}

/**
 * Show the most recent logs
 */
function showLogs() {
  exec(`tail -n 20 ${path.join(config.logDir, 'genkit.log')}`, (error, stdout) => {
    if (!error) {
      console.log('\n' + colors.yellow + '=== GenKit Logs (last 20 lines) ===' + colors.reset);
      console.log(stdout);
    }
  });
  
  exec(`tail -n 20 ${path.join(config.logDir, 'nextjs.log')}`, (error, stdout) => {
    if (!error) {
      console.log('\n' + colors.yellow + '=== Next.js Logs (last 20 lines) ===' + colors.reset);
      console.log(stdout);
    }
  });
}

/**
 * Clean shutdown of all processes
 */
function shutdown() {
  logInfo('Shutting down servers...');
  
  if (processes.nextjs) {
    processes.nextjs.kill();
  }
  
  if (processes.genkit) {
    processes.genkit.kill();
  }
  
  // Kill any remaining processes by name
  exec('pkill -f "next dev"; pkill -f "genkit start"');
  
  // Close log file streams
  Object.values(logFiles).forEach(stream => stream.end());
  
  logInfo('All servers have been stopped.');
  process.exit(0);
}

/**
 * Restart all servers
 */
async function restart() {
  // Stop existing servers
  if (processes.nextjs) {
    processes.nextjs.kill();
  }
  
  if (processes.genkit) {
    processes.genkit.kill();
  }
  
  // Kill any remaining processes by name
  exec('pkill -f "next dev"; pkill -f "genkit start"');
  
  // Reset port information
  ports.genkitAPI = null;
  ports.genkitUI = null;
  ports.genkitTelemetry = null;
  
  // Start servers again
  await main();
}

/**
 * Main execution function
 */
async function main() {
  printBanner();
  
  // Find available Next.js port
  logInfo(`Checking if port ${ports.nextjs} is available...`);
  ports.nextjs = await findAvailablePort(ports.nextjs);
  logSuccess(`Using port ${ports.nextjs} for Next.js`);
  
  // Start GenKit server
  const genkitStarted = await startGenkitServer();
  if (!genkitStarted) {
    logError('Failed to start GenKit server. Exiting.');
    shutdown();
    return;
  }
  
  // Start Next.js server
  const nextjsStarted = await startNextjsServer();
  if (!nextjsStarted) {
    logError('Failed to start Next.js server. Exiting.');
    shutdown();
    return;
  }
  
  // Print summary
  printSummary();
  
  // Set up event handlers for graceful shutdown
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  // Set up interactive controls
  setupInteractiveControls();
}

// Start the application
main().catch((error) => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  shutdown();
});
