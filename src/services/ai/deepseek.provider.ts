/**
 * DeepSeek Provider
 * 
 * WHY: DeepSeek integration
 * - Support DeepSeek models qua v98store proxy
 * - OpenAI-compatible API
 * - Error handling với retry
 */

import OpenAI from 'openai';
import { IAIProvider } from '../../domain/ai-provider.interface';
import type { ChatMessage, AIConfig, AIResponse } from '../../types/ai';
import { logger } from '../../infrastructure/logger';
import { config } from '../../infrastructure/config';

/**
 * DeepSeek Provider Implementation
 * WHY: DeepSeek uses OpenAI-compatible API
 */
export class DeepSeekProvider implements IAIProvider {
  private client: OpenAI;
  private readonly maxRetries = 3;
  private readonly initialDelayMs = 1000;

  constructor() {
    if (!config.proxy.apiKey || !config.proxy.apiBase) {
      throw new Error('PROXY_API_KEY and PROXY_API_BASE are required for DeepSeek');
    }

    // DeepSeek uses OpenAI-compatible API qua v98store proxy
    this.client = new OpenAI({
      apiKey: config.proxy.apiKey,
      baseURL: config.proxy.apiBase,
      defaultHeaders: {
        'Accept-Encoding': 'identity',
      },
    });

    logger.info('Using DeepSeek provider via v98store proxy');
  }

  /**
   * Generate response với retry logic
   */
  async generateResponse(
    messages: ChatMessage[],
    aiConfig: AIConfig
  ): Promise<AIResponse> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: aiConfig.model, // DeepSeek model name
          messages: messages.map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
          temperature: aiConfig.temperature ?? 0.7,
          max_tokens: aiConfig.maxTokens,
          top_p: aiConfig.topP,
          frequency_penalty: aiConfig.frequencyPenalty,
          presence_penalty: aiConfig.presencePenalty,
        });

        const choice = response.choices[0];
        if (!choice || !choice.message.content) {
          throw new Error('No response from DeepSeek');
        }

        return {
          content: choice.message.content,
          tokens: {
            prompt: response.usage?.prompt_tokens || 0,
            completion: response.usage?.completion_tokens || 0,
            total: response.usage?.total_tokens || 0,
          },
          model: response.model,
          finishReason: choice.finish_reason || undefined,
        };
      } catch (error: unknown) {
        lastError = error;

        // Extract error details
        const errorDetails: any = {
          message: error instanceof Error ? error.message : String(error),
          status: (error as any)?.status || (error as any)?.response?.status,
          code: (error as any)?.code,
          cause: error instanceof Error ? error.cause : undefined,
        };

        // Extract more details from OpenAI SDK error
        if ((error as any)?.response) {
          errorDetails.responseStatus = (error as any).response.status;
          errorDetails.responseStatusText = (error as any).response.statusText;
          errorDetails.responseData = (error as any).response.data;
        }

        // Check if error is retryable
        const status = errorDetails.status;
        const isRetryable =
          status === 429 || (status >= 500 && status < 600);

        if (!isRetryable || attempt >= this.maxRetries) {
          // Log full error details
          logger.error('DeepSeek API error:', {
            ...errorDetails,
            attempt: attempt + 1,
            model: aiConfig.model,
            baseURL: config.proxy.apiBase,
          });

          // Build detailed error message
          let errorMessage = errorDetails.message;
          if (errorDetails.responseStatus) {
            errorMessage += ` (HTTP ${errorDetails.responseStatus})`;
          }
          if (errorDetails.responseData?.error?.message) {
            errorMessage += `: ${errorDetails.responseData.error.message}`;
          }
          if (errorDetails.code) {
            errorMessage += ` [${errorDetails.code}]`;
          }

          throw new Error(`DeepSeek API error: ${errorMessage}`);
        }

        // Exponential backoff
        const delayMs = this.initialDelayMs * Math.pow(2, attempt);
        logger.warn(`Retrying DeepSeek API call in ${delayMs}ms... (attempt ${attempt + 1}/${this.maxRetries + 1})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }
}

