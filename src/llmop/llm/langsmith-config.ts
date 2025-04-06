/**
 * LangSmith configuration module for LLMOP YouTube
 * Handles LangSmith settings and integration
 */

import { createLogger } from '../debug';
import { Client } from 'langsmith/client';

// Create a logger for this module
const logger = createLogger('LangSmithConfig');

// Default configuration values
export const DEFAULT_LANGSMITH_TRACING = false;
export const DEFAULT_LANGSMITH_ENDPOINT = 'https://api.smith.langchain.com';
export const DEFAULT_LANGSMITH_PROJECT = 'llmop-youtube';
export const DEFAULT_LANGSMITH_SAMPLING_RATE = 0.1; // 10% sampling rate to stay within limits

// LangSmith client instance
let langsmithClient: Client | null = null;

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
 * Get or create a LangSmith client instance
 * @returns A promise that resolves to a LangSmith client or null if not configured
 */
export async function getLangSmithClient(): Promise<Client | null> {
  // If we already have a client, return it
  if (langsmithClient) {
    return langsmithClient;
  }

  // Get the configuration
  const config = await getLangSmithConfig();

  // If tracing is not enabled or API key is not set, return null
  if (!config.tracing) {
    return null;
  }

  try {
    // Create a new client
    langsmithClient = new Client({
      apiKey: config.apiKey,
      apiUrl: config.endpoint,
    });

    logger.info('LangSmith client created successfully');
    return langsmithClient;
  } catch (error) {
    logger.error('Error creating LangSmith client', error);
    return null;
  }
}
