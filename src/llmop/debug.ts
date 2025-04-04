/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Debug utility for LLMOP YouTube
 * Provides logging functions that can be toggled on/off via configuration
 */

/**
 * Logger interface defining the structure of logger objects
 */
export interface Logger {
  /**
   * Log a debug message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  log(message: string, ...args: any[]): void;

  /**
   * Log an error message
   * @param message The error message
   * @param args Additional arguments to log
   */
  error(message: string, ...args: any[]): void;

  /**
   * Log a warning message
   * @param message The warning message
   * @param args Additional arguments to log
   */
  warn(message: string, ...args: any[]): void;

  /**
   * Log an informational message
   * @param message The info message
   * @param args Additional arguments to log
   */
  info(message: string, ...args: any[]): void;
}

// Track debug state
let isDebugEnabled = false;

/**
 * Get the current debug state
 * @returns Whether debug mode is enabled
 */
export function getDebugState(): boolean {
  return isDebugEnabled;
}

/**
 * Initialize the debug system
 * Loads the debug setting from storage
 */
export async function initDebug(): Promise<void> {
  try {
    const debugEnabled = await GM.getValue('debugEnabled', false);
    isDebugEnabled = !!debugEnabled;
    log('Debug system initialized', { enabled: isDebugEnabled });
  } catch (error) {
    // Use console directly for initialization errors since our logging system isn't ready yet
    console.error('[LLMOP] Error initializing debug system:', error);
  }
}

/**
 * Base logging function that all other logging functions use
 * @param logFn The console function to use for logging
 * @param prefix The prefix to add to the log message
 * @param message The message to log
 * @param args Additional arguments to log
 */
function baseLog(
  logFn: typeof console.log | typeof console.error | typeof console.warn,
  prefix: string,
  message: string,
  ...args: any[]
): void {
  if (!isDebugEnabled) return;

  const formattedMessage = `[${prefix}] ${message}`;

  if (args.length > 0) {
    logFn(formattedMessage, ...args);
  } else {
    logFn(formattedMessage);
  }
}

/**
 * Log a message if debug mode is enabled
 * @param message The message to log
 * @param args Additional arguments to log
 */
export function log(message: string, ...args: any[]): void {
  baseLog(console.log, 'LLMOP Debug', message, ...args);
}

/**
 * Log an error message (only shown if debug mode is enabled)
 * @param message The error message
 * @param args Additional arguments to log
 */
export function error(message: string, ...args: any[]): void {
  baseLog(console.error, 'LLMOP Error', message, ...args);
}

/**
 * Log a warning message (only shown if debug mode is enabled)
 * @param message The warning message
 * @param args Additional arguments to log
 */
export function warn(message: string, ...args: any[]): void {
  baseLog(console.warn, 'LLMOP Warning', message, ...args);
}

/**
 * Log information (only shown if debug mode is enabled)
 * @param message The info message
 * @param args Additional arguments to log
 */
export function info(message: string, ...args: any[]): void {
  baseLog(console.log, 'LLMOP Info', message, ...args);
}

/**
 * Create a logger for a specific module
 * @param moduleName The name of the module
 * @returns An object implementing the Logger interface
 */
export function createLogger(moduleName: string): Logger {
  return {
    log: (message: string, ...args: any[]) => {
      baseLog(console.log, `LLMOP:${moduleName}`, message, ...args);
    },
    error: (message: string, ...args: any[]) => {
      baseLog(console.error, `LLMOP:${moduleName} Error`, message, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      baseLog(console.warn, `LLMOP:${moduleName} Warning`, message, ...args);
    },
    info: (message: string, ...args: any[]) => {
      baseLog(console.log, `LLMOP:${moduleName} Info`, message, ...args);
    },
  };
}
