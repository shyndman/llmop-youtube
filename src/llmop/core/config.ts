// Configuration module for LLMOP YouTube

// Default configuration values
export const DEFAULT_POLLING_INTERVAL_MS = 2000; // 2 seconds
export const DEFAULT_GEMINI_MODEL = 'models/gemini-2.0-flash';
export const DEFAULT_CAPTIONS_CACHE_SIZE = 10; // Number of videos to cache

/**
 * Get the Google Gemini API key from Violentmonkey storage
 * @returns A promise that resolves to the API key or an empty string if not set
 */
export async function getApiKey(): Promise<string> {
  return await GM.getValue('geminiApiKey', '');
}
adsf
/**
 * Get the Google Gemini API key synchronously (for backward compatibility)
 * @returns The API key or an empty string if not set
 */
export function getApiKeySync(): string {
  // For cases where we can't use async/await
  return GM_getValue('geminiApiKey', '');
}

/**
 * Set the Google Gemini API key in Violentmonkey storage
 * @param apiKey The API key to store
 * @returns A promise that resolves when the value is set
 */
export async function setApiKey(apiKey: string): Promise<void> {
  await GM.setValue('geminiApiKey', apiKey);
}

/**
 * Get the debug mode setting from storage
 * @returns A promise that resolves to whether debug mode is enabled
 */
export async function getDebugEnabled(): Promise<boolean> {
  return await GM.getValue('debugEnabled', false);
}

/**
 * Set the debug mode setting in storage
 * @param enabled Whether debug mode should be enabled
 * @returns A promise that resolves when the value is set
 */
export async function setDebugEnabled(enabled: boolean): Promise<void> {
  await GM.setValue('debugEnabled', enabled);
}

/**
 * Get the polling interval for URL checking from storage
 * @returns A promise that resolves to the polling interval in milliseconds
 */
export async function getPollingInterval(): Promise<number> {
  return await GM.getValue('pollingIntervalMs', DEFAULT_POLLING_INTERVAL_MS);
}

/**
 * Get the polling interval synchronously (for immediate use)
 * @returns The polling interval in milliseconds
 */
export function getPollingIntervalSync(): number {
  return GM_getValue('pollingIntervalMs', DEFAULT_POLLING_INTERVAL_MS);
}

/**
 * Set the polling interval in Violentmonkey storage
 * @param intervalMs The interval in milliseconds
 * @returns A promise that resolves when the value is set
 */
export async function setPollingInterval(intervalMs: number): Promise<void> {
  await GM.setValue('pollingIntervalMs', intervalMs);
}

/**
 * Get the Gemini model name from storage
 * @returns A promise that resolves to the model name or the default model
 */
export async function getGeminiModel(): Promise<string> {
  return await GM.getValue('geminiModel', DEFAULT_GEMINI_MODEL);
}

/**
 * Get the Gemini model name synchronously (for immediate use)
 * @returns The model name or the default model
 */
export function getGeminiModelSync(): string {
  return GM_getValue('geminiModel', DEFAULT_GEMINI_MODEL);
}

/**
 * Set the Gemini model name in Violentmonkey storage
 * @param model The model name to store
 * @returns A promise that resolves when the value is set
 */
export async function setGeminiModel(model: string): Promise<void> {
  await GM.setValue('geminiModel', model);
}

/**
 * Get the Gemini temperature setting from storage
 * @returns A promise that resolves to the temperature or the default (0.2)
 */
export async function getGeminiTemperature(): Promise<number> {
  return await GM.getValue('geminiTemperature', 0.2);
}

/**
 * Set the Gemini temperature in Violentmonkey storage
 * @param temperature The temperature value to store (0.0 to 1.0)
 * @returns A promise that resolves when the value is set
 */
export async function setGeminiTemperature(temperature: number): Promise<void> {
  await GM.setValue('geminiTemperature', temperature);
}

/**
 * Get the captions cache size from storage
 * @returns A promise that resolves to the cache size or the default (10)
 */
export async function getCaptionsCacheSize(): Promise<number> {
  return await GM.getValue('captionsCacheSize', DEFAULT_CAPTIONS_CACHE_SIZE);
}

/**
 * Get the captions cache size synchronously (for immediate use)
 * @returns The cache size or the default
 */
export function getCaptionsCacheSizeSync(): number {
  return GM_getValue('captionsCacheSize', DEFAULT_CAPTIONS_CACHE_SIZE);
}

/**
 * Set the captions cache size in Violentmonkey storage
 * @param size The cache size to store
 * @returns A promise that resolves when the value is set
 */
export async function setCaptionsCacheSize(size: number): Promise<void> {
  await GM.setValue('captionsCacheSize', size);
}
