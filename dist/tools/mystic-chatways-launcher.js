#!/usr/bin/env node
"use strict";
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var http = require("http");
var fs = require("fs/promises");
var path = require("path");
// Configuration
var config = {
    nextjsPort: parseInt(process.env.PORT || '9003', 10),
    logDir: path.join(process.cwd(), 'logs'),
    readyCheckMaxAttempts: 30, // Reduced to make startup faster
    readyCheckInterval: 1000, // 1 second between health checks
    startTimeout: 90000, // 90 seconds overall timeout
    processNames: {
        genkit: 'GenKit',
        nextjs: 'Next.js'
    }
};
// Frontend detection patterns (used to filter and categorize logs)
var FRONTEND_PATTERNS = [
    /client/i,
    /browser/i,
    /react/i,
    /component/i,
    /rendering/i,
    /jsx|tsx/i,
    /\[HMR\]/i
];
// Backend detection patterns
var BACKEND_PATTERNS = [
    /api/i,
    /server/i,
    /route/i,
    /endpoint/i,
    /http/i,
    /POST|GET|PUT|DELETE/i
];
// Error detection patterns
var ERROR_PATTERNS = [
    /error/i,
    /exception/i,
    /fail/i,
    /crash/i,
    /unable to/i
];
// Store detected ports
var ports = {
    genkitAPI: null,
    genkitUI: null,
    genkitTelemetry: null,
    nextjs: config.nextjsPort
};
// Function to ensure we have an available port for Next.js
function setupAvailablePorts() {
    return __awaiter(this, void 0, void 0, function () {
        var availablePort;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, findAvailablePort(config.nextjsPort)];
                case 1:
                    availablePort = _a.sent();
                    if (availablePort !== config.nextjsPort) {
                        console.log("Port ".concat(config.nextjsPort, " is already in use, using port ").concat(availablePort, " instead"));
                        config.nextjsPort = availablePort;
                        ports.nextjs = availablePort;
                    }
                    return [2 /*return*/];
            }
        });
    });
}
// ANSI color codes
var colors = {
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
var processes = {
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
var centralErrorLogFile = path.join(config.logDir, 'errors.log');
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
function log(message, color) {
    if (color === void 0) { color = colors.reset; }
    var timestamp = new Date().toLocaleTimeString();
    console.log("".concat(color, "[").concat(timestamp, "] ").concat(message).concat(colors.reset));
}
/**
 * Write a message to a log file with timestamp
 */
function writeToLog(message, logFile, category) {
    return __awaiter(this, void 0, void 0, function () {
        var timestamp, logMessage, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    timestamp = new Date().toISOString();
                    logMessage = "[".concat(timestamp, "]").concat(category ? " [".concat(category, "]") : '', " ").concat(message, "\n");
                    return [4 /*yield*/, fs.appendFile(logFile, logMessage)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error("Failed to write to log file ".concat(logFile, ": ").concat(error_1.message));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Process log output to categorize as frontend, backend, or error
 */
function processLogOutput(message, source) {
    return __awaiter(this, void 0, void 0, function () {
        var sourceProcess, isError, isFrontend, isBackend;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sourceProcess = processes[source];
                    // Write to main log file
                    return [4 /*yield*/, writeToLog(message, sourceProcess.logFile)];
                case 1:
                    // Write to main log file
                    _a.sent();
                    isError = ERROR_PATTERNS.some(function (pattern) { return pattern.test(message); });
                    if (!isError) return [3 /*break*/, 5];
                    if (!sourceProcess.errorLogFile) return [3 /*break*/, 3];
                    return [4 /*yield*/, writeToLog(message, sourceProcess.errorLogFile, 'ERROR')];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [4 /*yield*/, writeToLog("[".concat(sourceProcess.name, "] ").concat(message), centralErrorLogFile, 'ERROR')];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    if (!(source === 'nextjs')) return [3 /*break*/, 9];
                    isFrontend = FRONTEND_PATTERNS.some(function (pattern) { return pattern.test(message); });
                    isBackend = BACKEND_PATTERNS.some(function (pattern) { return pattern.test(message); });
                    if (!(isFrontend && sourceProcess.frontendLogFile)) return [3 /*break*/, 7];
                    return [4 /*yield*/, writeToLog(message, sourceProcess.frontendLogFile, 'FRONTEND')];
                case 6:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 7:
                    if (!(isBackend && sourceProcess.backendLogFile)) return [3 /*break*/, 9];
                    return [4 /*yield*/, writeToLog(message, sourceProcess.backendLogFile, 'BACKEND')];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    });
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
function isPortInUse(port) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var server = http.createServer();
                    server.once('error', function (err) {
                        if (err.code === 'EADDRINUSE') {
                            resolve(true);
                        }
                        else {
                            resolve(false);
                        }
                    });
                    server.once('listening', function () {
                        server.close();
                        resolve(false);
                    });
                    server.listen(port);
                })];
        });
    });
}
/**
 * Find an available port starting from the specified one
 */
function findAvailablePort(startPort) {
    return __awaiter(this, void 0, void 0, function () {
        var port;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    port = startPort;
                    _a.label = 1;
                case 1: return [4 /*yield*/, isPortInUse(port)];
                case 2:
                    if (!_a.sent()) return [3 /*break*/, 3];
                    port++;
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, port];
            }
        });
    });
}
/**
 * Check if a URL is reachable
 */
function isUrlReachable(url) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    try {
                        var req_1 = http.get(url, function (res) {
                            res.on('data', function () { }); // Consume data
                            resolve(res.statusCode ? res.statusCode >= 200 && res.statusCode < 400 : false);
                        });
                        req_1.on('error', function () {
                            resolve(false);
                        });
                        req_1.setTimeout(1000, function () {
                            req_1.destroy();
                            resolve(false);
                        });
                    }
                    catch (err) {
                        // In case of any unexpected errors
                        resolve(false);
                    }
                })];
        });
    });
}
/**
 * Wait for a service to be ready by checking its health endpoint
 */
function waitForServiceReady(name_1, checkFn_1) {
    return __awaiter(this, arguments, void 0, function (name, checkFn, maxAttempts, allowFailure) {
        var attempt, err_1;
        if (maxAttempts === void 0) { maxAttempts = config.readyCheckMaxAttempts; }
        if (allowFailure === void 0) { allowFailure = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logInfo("Waiting for ".concat(name, " to be ready..."));
                    attempt = 1;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= maxAttempts)) return [3 /*break*/, 8];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, checkFn()];
                case 3:
                    if (_a.sent()) {
                        logSuccess("".concat(name, " is ready!"));
                        return [2 /*return*/, true];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    // Just log and continue if there's an error during the check
                    if (attempt % 10 === 0) {
                        logInfo("Error checking ".concat(name, " readiness: ").concat(err_1.message));
                    }
                    return [3 /*break*/, 5];
                case 5:
                    // Every 10 attempts, provide a status update
                    if (attempt % 10 === 0) {
                        logInfo("Still waiting for ".concat(name, " to be ready (").concat(attempt, "/").concat(maxAttempts, ")..."));
                    }
                    // Wait before next attempt
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, config.readyCheckInterval); })];
                case 6:
                    // Wait before next attempt
                    _a.sent();
                    _a.label = 7;
                case 7:
                    attempt++;
                    return [3 /*break*/, 1];
                case 8:
                    if (!allowFailure) {
                        logError("Timed out waiting for ".concat(name, " to be ready after ").concat(maxAttempts, " attempts"));
                    }
                    return [2 /*return*/, false];
            }
        });
    });
}
/**
 * Extract port information from GenKit server output
 */
function extractPortInfo(data) {
    var lines = data.toString().split('\n');
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        // Match API server port
        var apiMatch = line.match(/API server running at http:\/\/[^:]+:(\d+)/);
        if (apiMatch && !ports.genkitAPI) {
            ports.genkitAPI = parseInt(apiMatch[1], 10);
            logInfo("Detected GenKit API port: ".concat(ports.genkitAPI));
        }
        // Match UI server port
        var uiMatch = line.match(/UI server running at http:\/\/[^:]+:(\d+)/);
        if (uiMatch && !ports.genkitUI) {
            ports.genkitUI = parseInt(uiMatch[1], 10);
            logInfo("Detected GenKit UI port: ".concat(ports.genkitUI));
        }
        // Match Telemetry server port
        var telemetryMatch = line.match(/Telemetry server running at http:\/\/[^:]+:(\d+)/);
        if (telemetryMatch && !ports.genkitTelemetry) {
            ports.genkitTelemetry = parseInt(telemetryMatch[1], 10);
            logInfo("Detected GenKit Telemetry port: ".concat(ports.genkitTelemetry));
        }
    }
}
/**
 * Detect the GenKit API port by testing common ports
 */
function detectGenkitApiPort() {
    return __awaiter(this, void 0, void 0, function () {
        var commonPorts, _i, commonPorts_1, port, isReachable;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    commonPorts = [4000, 4001, 3000, 3001, 5000, 5001, 8080, 8081];
                    _i = 0, commonPorts_1 = commonPorts;
                    _a.label = 1;
                case 1:
                    if (!(_i < commonPorts_1.length)) return [3 /*break*/, 4];
                    port = commonPorts_1[_i];
                    return [4 /*yield*/, isUrlReachable("http://localhost:".concat(port, "/health"))];
                case 2:
                    isReachable = _a.sent();
                    if (isReachable) {
                        logInfo("Detected GenKit API on port ".concat(port));
                        return [2 /*return*/, port];
                    }
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: 
                // If no port found, return default
                return [2 /*return*/, 4000];
            }
        });
    });
}
/**
 * Start the GenKit server
 */
function startGenkitServer() {
    return __awaiter(this, void 0, void 0, function () {
        var logStream_1, genkitProcess, isReady, error_2;
        var _this = this;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    logInfo('Starting GenKit server...');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 5, , 6]);
                    // Create logs directory if it doesn't exist
                    return [4 /*yield*/, fs.mkdir(config.logDir, { recursive: true })];
                case 2:
                    // Create logs directory if it doesn't exist
                    _c.sent();
                    return [4 /*yield*/, fs.open(processes.genkit.logFile, 'a')];
                case 3:
                    logStream_1 = _c.sent();
                    processes.genkit.logStream = logStream_1;
                    genkitProcess = (0, child_process_1.spawn)('npm', ['run', 'genkit:dev'], {
                        stdio: ['pipe', 'pipe', 'pipe'],
                        shell: true,
                        env: __assign(__assign({}, process.env), { FORCE_COLOR: '1' })
                    });
                    processes.genkit.process = genkitProcess;
                    // Handle process output
                    (_a = genkitProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
                        var output = data.toString();
                        logStream_1.write(output);
                        extractPortInfo(output);
                        processLogOutput(output, 'genkit');
                        console.log("[".concat(processes.genkit.name, "] ").concat(output));
                    });
                    (_b = genkitProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
                        var error = data.toString();
                        logStream_1.write("ERROR: ".concat(error));
                        processLogOutput("ERROR: ".concat(error), 'genkit');
                        console.error("[".concat(processes.genkit.name, " ERROR] ").concat(error));
                    });
                    genkitProcess.on('exit', function (code) {
                        logError("GenKit server exited with code ".concat(code));
                        if (code !== 0) {
                            logError('GenKit server failed to start. Check the logs for more details.');
                        }
                    });
                    return [4 /*yield*/, waitForServiceReady('GenKit', function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        if (!!ports.genkitAPI) return [3 /*break*/, 2];
                                        // Try to detect the port if not found in logs
                                        _a = ports;
                                        return [4 /*yield*/, detectGenkitApiPort()];
                                    case 1:
                                        // Try to detect the port if not found in logs
                                        _a.genkitAPI = _c.sent();
                                        _c.label = 2;
                                    case 2:
                                        _b = ports.genkitAPI !== null;
                                        if (!_b) return [3 /*break*/, 4];
                                        return [4 /*yield*/, isUrlReachable("http://localhost:".concat(ports.genkitAPI, "/health"))];
                                    case 3:
                                        _b = (_c.sent());
                                        _c.label = 4;
                                    case 4: return [2 /*return*/, _b];
                                }
                            });
                        }); }, config.readyCheckMaxAttempts, true // Allow failure to continue
                        )];
                case 4:
                    isReady = _c.sent();
                    if (!isReady) {
                        logError('GenKit server did not start properly. Continuing anyway...');
                    }
                    return [3 /*break*/, 6];
                case 5:
                    error_2 = _c.sent();
                    logError("Failed to start GenKit server: ".concat(error_2.message));
                    throw error_2;
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Start the Next.js server
 */
function startNextjsServer() {
    return __awaiter(this, void 0, void 0, function () {
        var logStream_2, nextProcess, isReady, error_3;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    logInfo('Starting Next.js server...');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 5, , 6]);
                    // Create logs directory if it doesn't exist
                    return [4 /*yield*/, fs.mkdir(config.logDir, { recursive: true })];
                case 2:
                    // Create logs directory if it doesn't exist
                    _c.sent();
                    return [4 /*yield*/, fs.open(processes.nextjs.logFile, 'a')];
                case 3:
                    logStream_2 = _c.sent();
                    processes.nextjs.logStream = logStream_2;
                    nextProcess = (0, child_process_1.spawn)('npm', ['run', 'dev'], {
                        stdio: ['pipe', 'pipe', 'pipe'],
                        shell: true,
                        env: __assign(__assign({}, process.env), { PORT: ports.nextjs.toString(), FORCE_COLOR: '1', 
                            // Pass GenKit ports to the Next.js app
                            GENKIT_API_URL: ports.genkitAPI ? "http://localhost:".concat(ports.genkitAPI) : '', GENKIT_UI_URL: ports.genkitUI ? "http://localhost:".concat(ports.genkitUI) : '' })
                    });
                    processes.nextjs.process = nextProcess;
                    // Handle process output
                    (_a = nextProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
                        var output = data.toString();
                        logStream_2.write(output);
                        processLogOutput(output, 'nextjs');
                        console.log("[".concat(processes.nextjs.name, "] ").concat(output));
                    });
                    (_b = nextProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
                        var error = data.toString();
                        logStream_2.write("ERROR: ".concat(error));
                        processLogOutput("ERROR: ".concat(error), 'nextjs');
                        console.error("[".concat(processes.nextjs.name, " ERROR] ").concat(error));
                    });
                    nextProcess.on('exit', function (code) {
                        logError("Next.js server exited with code ".concat(code));
                        if (code !== 0) {
                            logError('Next.js server failed to start. Check the logs for more details.');
                        }
                    });
                    return [4 /*yield*/, waitForServiceReady('Next.js', function () { return isUrlReachable("http://localhost:".concat(ports.nextjs, "/")); })];
                case 4:
                    isReady = _c.sent();
                    if (!isReady) {
                        throw new Error('Next.js server did not start properly');
                    }
                    return [3 /*break*/, 6];
                case 5:
                    error_3 = _c.sent();
                    logError("Failed to start Next.js server: ".concat(error_3.message));
                    throw error_3;
                case 6: return [2 /*return*/];
            }
        });
    });
}
// ... (rest of the code remains the same)
/**
 * Print a summary of the running services
 */
function printSummary() {
    console.log('\n' + colors.bg.blue + colors.white + '='.repeat(80) + colors.reset);
    console.log(colors.bg.blue + colors.bright.green + ' ' + 'Mystic Chatways - Services Status'.padEnd(78) + ' ' + colors.reset);
    console.log(colors.bg.blue + colors.white + '='.repeat(80) + colors.reset);
    console.log("\n".concat(colors.bright.green, "Services:").concat(colors.reset));
    console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " ").concat(processes.genkit.name.padEnd(10), ": ").concat(processes.genkit.process ? colors.green + 'Running' + colors.reset : colors.red + 'Stopped' + colors.reset));
    console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " ").concat(processes.nextjs.name.padEnd(10), ": ").concat(processes.nextjs.process ? colors.green + 'Running' + colors.reset : colors.red + 'Stopped' + colors.reset));
    console.log("\n".concat(colors.bright.green, "Ports:").concat(colors.reset));
    if (ports.genkitAPI)
        console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " GenKit API:       ").concat(colors.yellow, "http://localhost:").concat(ports.genkitAPI).concat(colors.reset));
    if (ports.genkitUI)
        console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " GenKit UI:        ").concat(colors.yellow, "http://localhost:").concat(ports.genkitUI).concat(colors.reset));
    if (ports.genkitTelemetry)
        console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " GenKit Telemetry:  ").concat(colors.yellow, "http://localhost:").concat(ports.genkitTelemetry).concat(colors.reset));
    console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " Next.js:         ").concat(colors.yellow, "http://localhost:").concat(ports.nextjs).concat(colors.reset));
    console.log("\n".concat(colors.bright.green, "Logs:").concat(colors.reset));
    console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " GenKit:          ").concat(colors.yellow).concat(processes.genkit.logFile).concat(colors.reset));
    console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " Next.js:         ").concat(colors.yellow).concat(processes.nextjs.logFile).concat(colors.reset));
    console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " Frontend:        ").concat(colors.yellow).concat(processes.nextjs.frontendLogFile).concat(colors.reset));
    console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " Backend:         ").concat(colors.yellow).concat(processes.nextjs.backendLogFile).concat(colors.reset));
    console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " GenKit Errors:   ").concat(colors.yellow).concat(processes.genkit.errorLogFile).concat(colors.reset));
    console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " Next.js Errors:  ").concat(colors.yellow).concat(processes.nextjs.errorLogFile).concat(colors.reset));
    console.log("  ".concat(colors.cyan, "\u2022").concat(colors.reset, " All Errors:      ").concat(colors.yellow).concat(centralErrorLogFile).concat(colors.reset));
    console.log('\n' + colors.bg.blue + colors.white + '='.repeat(80) + colors.reset + '\n');
}
/**
 * Clean shutdown of all processes
 */
function shutdown() {
    return __awaiter(this, arguments, void 0, function (exitCode) {
        if (exitCode === void 0) { exitCode = 0; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logInfo('Shutting down services...');
                    if (!processes.nextjs.process) return [3 /*break*/, 2];
                    logInfo('Stopping Next.js server...');
                    processes.nextjs.process.kill('SIGTERM');
                    if (!processes.nextjs.logStream) return [3 /*break*/, 2];
                    return [4 /*yield*/, processes.nextjs.logStream.close()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    if (!processes.genkit.process) return [3 /*break*/, 4];
                    logInfo('Stopping GenKit server...');
                    processes.genkit.process.kill('SIGTERM');
                    if (!processes.genkit.logStream) return [3 /*break*/, 4];
                    return [4 /*yield*/, processes.genkit.logStream.close()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    // Exit the process
                    process.exit(exitCode);
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Set up signal handlers for graceful shutdown
 */
function setupSignalHandlers() {
    var _this = this;
    // Handle Ctrl+C
    process.on('SIGINT', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logInfo('Received SIGINT. Shutting down gracefully...');
                    return [4 /*yield*/, shutdown(0)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // Handle other termination signals
    process.on('SIGTERM', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logInfo('Received SIGTERM. Shutting down gracefully...');
                    return [4 /*yield*/, shutdown(0)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // Handle uncaught exceptions
    process.on('uncaughtException', function (error) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logError("Uncaught exception: ".concat(error.message));
                    console.error(error);
                    return [4 /*yield*/, shutdown(1)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // Handle unhandled promise rejections
    process.on('unhandledRejection', function (reason) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logError("Unhandled rejection: ".concat(reason));
                    console.error(reason);
                    return [4 /*yield*/, shutdown(1)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
}
/**
 * Main entry point
 */
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var logFiles, _i, logFiles_1, logFile, stats, timestamp, err_2, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 15, , 17]);
                    // Print banner
                    printBanner();
                    // Set up signal handlers for graceful shutdown
                    setupSignalHandlers();
                    logInfo('Starting Mystic Chatways services...');
                    // Create logs directory
                    return [4 /*yield*/, fs.mkdir(config.logDir, { recursive: true })];
                case 1:
                    // Create logs directory
                    _a.sent();
                    logFiles = [
                        processes.genkit.logFile,
                        processes.nextjs.logFile,
                        processes.nextjs.frontendLogFile,
                        processes.nextjs.backendLogFile,
                        processes.genkit.errorLogFile,
                        processes.nextjs.errorLogFile,
                        centralErrorLogFile
                    ];
                    _i = 0, logFiles_1 = logFiles;
                    _a.label = 2;
                case 2:
                    if (!(_i < logFiles_1.length)) return [3 /*break*/, 11];
                    logFile = logFiles_1[_i];
                    if (!logFile)
                        return [3 /*break*/, 10];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 9, , 10]);
                    return [4 /*yield*/, fs.stat(logFile).catch(function () { return null; })];
                case 4:
                    stats = _a.sent();
                    if (!stats) return [3 /*break*/, 8];
                    if (!(stats.size > 10 * 1024 * 1024)) return [3 /*break*/, 6];
                    timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    return [4 /*yield*/, fs.rename(logFile, "".concat(logFile, ".").concat(timestamp, ".bak"))];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 8];
                case 6: 
                // Otherwise just clear it
                return [4 /*yield*/, fs.writeFile(logFile, '')];
                case 7:
                    // Otherwise just clear it
                    _a.sent();
                    _a.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    err_2 = _a.sent();
                    return [3 /*break*/, 10];
                case 10:
                    _i++;
                    return [3 /*break*/, 2];
                case 11: 
                // Check for available ports before starting
                return [4 /*yield*/, setupAvailablePorts()];
                case 12:
                    // Check for available ports before starting
                    _a.sent();
                    // Start GenKit server
                    return [4 /*yield*/, startGenkitServer()];
                case 13:
                    // Start GenKit server
                    _a.sent();
                    // Start Next.js server
                    return [4 /*yield*/, startNextjsServer()];
                case 14:
                    // Start Next.js server
                    _a.sent();
                    // Print summary
                    printSummary();
                    logSuccess('Mystic Chatways is now running!');
                    logInfo('Press Ctrl+C to stop all services.');
                    return [3 /*break*/, 17];
                case 15:
                    error_4 = _a.sent();
                    logError("Failed to start Mystic Chatways: ".concat(error_4.message));
                    console.error(error_4);
                    return [4 /*yield*/, shutdown(1)];
                case 16:
                    _a.sent();
                    return [3 /*break*/, 17];
                case 17: return [2 /*return*/];
            }
        });
    });
}
// Start the application
main().catch(function (error) {
    logError("Unexpected error: ".concat(error.message));
    console.error(error);
    process.exit(1);
});
