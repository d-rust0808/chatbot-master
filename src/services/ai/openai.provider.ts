/**
 * OpenAI Provider
 * 
 * WHY: OpenAI GPT-3.5-turbo, GPT-4 integration
 * - Support direct OpenAI API hoặc v98store proxy
 * - Token tracking
 * - Error handling với retry logic
 */

import OpenAI from 'openai';
import { IAIProvider } from '../../domain/ai-provider.interface';
import type { ChatMessage, AIConfig, AIResponse } from '../../types/ai';
import { logger } from '../../infrastructure/logger';
import { config } from '../../infrastructure/config';
import { getProxyConfig } from '../system-config/proxy-config.service';

/**
 * OpenAI Provider Implementation
 * WHY: Support cả direct OpenAI và v98store proxy
 */
export class OpenAIProvider implements IAIProvider {
  private client: OpenAI | null = null;
  private clientPromise: Promise<OpenAI> | null = null;

  /**
   * Get or create OpenAI client
   * WHY: Lazy load với async config từ System Config
   */
  private async getClient(): Promise<OpenAI> {
    if (this.client) {
      return this.client;
    }

    if (this.clientPromise) {
      return this.clientPromise;
    }

    this.clientPromise = this.initializeClient();
    this.client = await this.clientPromise;
    return this.client;
  }

  /**
   * Initialize client với config từ System Config hoặc env
   */
  private async initializeClient(): Promise<OpenAI> {
    // Get proxy config từ System Config (fallback to env)
    const proxyConfig = await getProxyConfig();

    // Ưu tiên dùng proxy nếu có config
    if (proxyConfig.apiKey && proxyConfig.apiBase) {
      const client = new OpenAI({
        apiKey: proxyConfig.apiKey,
        baseURL: proxyConfig.apiBase,
        defaultHeaders: {
          'Accept-Encoding': 'identity',
        },
      });
      logger.info('Using v98store proxy for OpenAI API');
      return client;
    } else if (config.openai.apiKey) {
      const client = new OpenAI({
        apiKey: config.openai.apiKey,
      });
      logger.info('Using direct OpenAI API');
      return client;
    } else {
      throw new Error('Either OPENAI_API_KEY or PROXY_API_KEY must be set');
    }
  }

  /**
   * Generate response với retry logic
   * WHY: Handle rate limits và server errors với exponential backoff
   */
  async generateResponse(
    messages: ChatMessage[],
    aiConfig: AIConfig
  ): Promise<AIResponse> {
    const maxRetries = 3;
    const initialDelayMs = 1000;
    let lastError: Error | unknown;

    // Get client (lazy load)
    const client = await this.getClient();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Use model from config (chatbot config) - không override với proxy model
        // WHY: Mỗi chatbot có thể chọn model riêng
        const model = aiConfig.model;

        const response = await client.chat.completions.create({
          model,
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
          throw new Error('No response from OpenAI');
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

        if (!isRetryable || attempt >= maxRetries) {
          // Log full error details
          const proxyConfig = await getProxyConfig();
          logger.error('OpenAI API error:', {
            ...errorDetails,
            attempt: attempt + 1,
            model: aiConfig.model,
            baseURL: proxyConfig.apiBase || 'https://api.openai.com/v1',
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

          throw new Error(`OpenAI API error: ${errorMessage}`);
        }

        // Exponential backoff
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        logger.warn(`Retrying OpenAI API call in ${delayMs}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }

  /**
   * Stream response (optional)
   */
  async streamResponse(
    messages: ChatMessage[],
    aiConfig: AIConfig,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const stream = await client.chat.completions.create({
        model: aiConfig.model,
        messages: messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        temperature: aiConfig.temperature ?? 0.7,
        max_tokens: aiConfig.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      logger.error('OpenAI stream error:', error);
      throw new Error(`OpenAI stream error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

