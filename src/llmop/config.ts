// Configuration module for LLMOP YouTube

// Default configuration values
export const DEFAULT_POLLING_INTERVAL_MS = 2000; // 2 seconds

/**
 * Get the Google Gemini API key from Violentmonkey storage
 * @returns A promise that resolves to the API key or an empty string if not set
 */
export async function getApiKey(): Promise<string> {
  return await GM.getValue('geminiApiKey', '');
}

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
