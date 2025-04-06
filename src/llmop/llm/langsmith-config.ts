/**
 * LangSmith configuration module for LLMOP YouTube
 * Handles LangSmith settings and integration
 */

import { createLogger } from '../debug';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';

// Create a logger for this module
const logger = createLogger('LangSmithConfig');

// Default configuration values
export const DEFAULT_LANGSMITH_TRACING = false;
export const DEFAULT_LANGSMITH_ENDPOINT = 'https://api.smith.langchain.com';
export const DEFAULT_LANGSMITH_PROJECT = 'llmop-youtube';
export const DEFAULT_LANGSMITH_SAMPLING_RATE = 0.1; // 10% sampling rate to stay within limits

// LangChain tracer instance
let langChainTracer: LangChainTracer | null = null;

/**
 * Get the LangSmith API key from Violentmonkey storage
 * @returns A promise that resolves to the API key or an empty string if not set
 */
export async function getLangSmithApiKey(): Promise<string> {
  return await GM.getValue('langsmithApiKey', '');
}

/**
 * Set the LangSmith API key in Violentmonkey storage
 * @param apiKey The API key to store
 * @returns A promise that resolves when the value is set
 */
export async function setLangSmithApiKey(apiKey: string): Promise<void> {
  await GM.setValue('langsmithApiKey', apiKey);
  logger.info('LangSmith API key updated');
}

/**
 * Get whether LangSmith tracing is enabled
 * @returns A promise that resolves to whether tracing is enabled
 */
export async function getLangSmithTracingEnabled(): Promise<boolean> {
  return await GM.getValue(
    'langsmithTracingEnabled',
    DEFAULT_LANGSMITH_TRACING,
  );
}

/**
 * Set whether LangSmith tracing is enabled
 * @param enabled Whether tracing should be enabled
 * @returns A promise that resolves when the value is set
 */
export async function setLangSmithTracingEnabled(
  enabled: boolean,
): Promise<void> {
  await GM.setValue('langsmithTracingEnabled', enabled);
  logger.info(`LangSmith tracing ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Get the LangSmith endpoint URL
 * @returns A promise that resolves to the endpoint URL
 */
export async function getLangSmithEndpoint(): Promise<string> {
  return await GM.getValue('langsmithEndpoint', DEFAULT_LANGSMITH_ENDPOINT);
}

/**
 * Set the LangSmith endpoint URL
 * @param endpoint The endpoint URL to store
 * @returns A promise that resolves when the value is set
 */
export async function setLangSmithEndpoint(endpoint: string): Promise<void> {
  await GM.setValue('langsmithEndpoint', endpoint);
  logger.info(`LangSmith endpoint updated to ${endpoint}`);
}

/**
 * Get the LangSmith project name
 * @returns A promise that resolves to the project name
 */
export async function getLangSmithProject(): Promise<string> {
  return await GM.getValue('langsmithProject', DEFAULT_LANGSMITH_PROJECT);
}

/**
 * Set the LangSmith project name
 * @param project The project name to store
 * @returns A promise that resolves when the value is set
 */
export async function setLangSmithProject(project: string): Promise<void> {
  await GM.setValue('langsmithProject', project);
  logger.info(`LangSmith project updated to ${project}`);
}

/**
 * Get the LangSmith sampling rate (0.0 to 1.0)
 * @returns A promise that resolves to the sampling rate
 */
export async function getLangSmithSamplingRate(): Promise<number> {
  return await GM.getValue(
    'langsmithSamplingRate',
    DEFAULT_LANGSMITH_SAMPLING_RATE,
  );
}

/**
 * Set the LangSmith sampling rate
 * @param rate The sampling rate to store (0.0 to 1.0)
 * @returns A promise that resolves when the value is set
 */
export async function setLangSmithSamplingRate(rate: number): Promise<void> {
  if (rate < 0 || rate > 1) {
    throw new Error('Sampling rate must be between 0.0 and 1.0');
  }
  await GM.setValue('langsmithSamplingRate', rate);
  logger.info(`LangSmith sampling rate updated to ${rate}`);
}

/**
 * Determine if the current request should be traced based on sampling rate
 * @returns True if the request should be traced, false otherwise
 */
export async function shouldTraceRequest(): Promise<boolean> {
  // If tracing is disabled, never trace
  const tracingEnabled = await getLangSmithTracingEnabled();
  if (!tracingEnabled) {
    return false;
  }

  // Get the sampling rate
  const samplingRate = await getLangSmithSamplingRate();

  // If sampling rate is 1.0, always trace
  if (samplingRate >= 1.0) {
    return true;
  }

  // If sampling rate is 0.0, never trace
  if (samplingRate <= 0.0) {
    return false;
  }

  // Otherwise, randomly decide based on sampling rate
  return Math.random() < samplingRate;
}

/**
 * Get LangSmith configuration for the current session
 * @returns Configuration object for LangSmith
 */
export async function getLangSmithConfig(): Promise<{
  tracing: boolean;
  apiKey: string;
  endpoint: string;
  project: string;
}> {
  const tracingEnabled = await getLangSmithTracingEnabled();
  const apiKey = await getLangSmithApiKey();
  const endpoint = await getLangSmithEndpoint();
  const project = await getLangSmithProject();

  return {
    tracing: tracingEnabled && !!apiKey,
    apiKey: apiKey || '',
    endpoint,
    project,
  };
}

/**
 * Get or create a LangChain tracer instance for LangSmith
 * @returns A promise that resolves to a LangChainTracer or null if not configured
 */
export async function getLangChainTracer(): Promise<LangChainTracer | null> {
  // If we already have a tracer, return it
  if (langChainTracer) {
    return langChainTracer;
  }

  // Get the configuration
  const config = await getLangSmithConfig();

  // If tracing is not enabled or API key is not set, return null
  if (!config.tracing) {
    return null;
  }

  try {
    // Create a new LangChain tracer
    langChainTracer = new LangChainTracer({
      projectName: config.project,
    });

    // Set environment variables for the tracer
    // These will be picked up by LangChain.js
    globalThis.LANGCHAIN_TRACING = 'true';
    globalThis.LANGCHAIN_API_KEY = config.apiKey;
    globalThis.LANGCHAIN_ENDPOINT = config.endpoint;
    globalThis.LANGCHAIN_PROJECT = config.project;

    logger.info('LangChain tracer created successfully');
    return langChainTracer;
  } catch (error) {
    logger.error('Error creating LangChain tracer', error);
    return null;
  }
}

/**
 * Set up LangSmith environment for tracing
 * This should be called early in the application lifecycle
 */
export async function setupLangSmithEnvironment(): Promise<void> {
  try {
    const config = await getLangSmithConfig();

    if (config.tracing) {
      // Set global variables for LangChain.js to use
      globalThis.LANGCHAIN_TRACING = 'true';
      globalThis.LANGCHAIN_API_KEY = config.apiKey;
      globalThis.LANGCHAIN_ENDPOINT = config.endpoint;
      globalThis.LANGCHAIN_PROJECT = config.project;

      // For better performance in browser environments
      globalThis.LANGCHAIN_CALLBACKS_BACKGROUND = 'true';

      logger.info('LangSmith environment configured successfully');
    } else {
      // Clear environment variables if tracing is disabled
      globalThis.LANGCHAIN_TRACING = 'false';
      delete globalThis.LANGCHAIN_API_KEY;
      delete globalThis.LANGCHAIN_ENDPOINT;
      delete globalThis.LANGCHAIN_PROJECT;

      if (!(await getLangSmithTracingEnabled())) {
        logger.info('LangSmith tracing is disabled');
      } else if (!config.apiKey) {
        logger.warn('LangSmith API key not set, tracing will be disabled');
      }
    }
  } catch (error) {
    logger.error('Error setting up LangSmith environment', error);
  }
}
