/**
 * LangSmith integration module for LLMOP YouTube
 * Handles LangSmith tracing with LangChain
 */

import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { Client } from 'langsmith';
import { createLogger } from '../debug';
import { getLangSmithConfig, shouldTraceRequest } from '../config';

// Create a logger for this module
const logger = createLogger('LangSmith');

// LangChain tracer instance
let langChainTracer: LangChainTracer | null = null;

/**
 * Get or create a LangChain tracer for LangSmith
 * @returns A promise that resolves to a LangChainTracer or null if not configured
 */
export async function getLangChainTracer(): Promise<LangChainTracer | null> {
  try {
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

    // Create a LangSmith client
    const client = new Client({
      apiKey: config.apiKey,
      apiUrl: config.endpoint,
    });

    // Create a new LangChain tracer with the client
    langChainTracer = new LangChainTracer({
      projectName: config.project,
      client: client,
    });

    logger.info('LangChain tracer created successfully');
    return langChainTracer;
  } catch (error) {
    logger.error('Error creating LangChain tracer', error);
    return null;
  }
}

/**
 * Create callbacks array for LangChain if tracing is enabled
 * @returns A promise that resolves to an array of callbacks or undefined
 */
export async function createTracingCallbacks(): Promise<
  Array<LangChainTracer> | undefined
> {
  // Check if this request should be traced
  const shouldTrace = await shouldTraceRequest();
  if (!shouldTrace) {
    return undefined;
  }

  // Get the LangChain tracer
  const tracer = await getLangChainTracer();
  if (!tracer) {
    return undefined;
  }

  logger.info('LangSmith tracing enabled for this request');
  return [tracer];
}
