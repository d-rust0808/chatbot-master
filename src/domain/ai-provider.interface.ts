/**
 * AI Provider Interface
 * 
 * WHY: Unified interface cho multiple AI providers
 * - OpenAI, Gemini, DeepSeek
 * - Consistent API
 * - Easy to switch providers
 */

import type { ChatMessage, AIConfig, AIResponse } from '../types/ai';

/**
 * AI Provider Interface
 * WHY: Abstraction layer cho multiple providers
 */
export interface IAIProvider {
  /**
   * Generate response từ messages
   */
  generateResponse(
    messages: ChatMessage[],
    config: AIConfig
  ): Promise<AIResponse>;

  /**
   * Stream response (optional)
   */
  streamResponse?(
    messages: ChatMessage[],
    config: AIConfig,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}

