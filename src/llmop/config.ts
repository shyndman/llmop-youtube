// Simple configuration module for LLMOP YouTube

/**
 * Get the Google Gemini API key from Violentmonkey storage
 * @returns The API key or an empty string if not set
 */
export function getApiKey(): string {
  return GM_getValue('geminiApiKey', '');
}

/**
 * Set the Google Gemini API key in Violentmonkey storage
 * @param apiKey The API key to store
 */
export function setApiKey(apiKey: string): void {
  GM_setValue('geminiApiKey', apiKey);
}
