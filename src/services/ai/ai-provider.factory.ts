/**
 * AI Provider Factory
 * 
 * WHY: Factory pattern để tạo providers
 * - Easy to switch providers
 * - Centralized provider creation
 * - Type-safe
 */

import { IAIProvider } from '../../domain/ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { DeepSeekProvider } from './deepseek.provider';
import type { AIProvider } from '../../types/ai';
import { logger } from '../../infrastructure/logger';

/**
 * AI Provider Factory
 */
export class AIProviderFactory {
  /**
   * Create AI provider instance
   */
  static create(provider: AIProvider): IAIProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider();
      case 'gemini':
        // Gemini models dùng qua OpenAI-compatible API của v98store
        // Nên dùng OpenAI provider (compatible)
        logger.info('Gemini model detected, using OpenAI-compatible provider');
        return new OpenAIProvider();
      case 'deepseek':
        return new DeepSeekProvider();
      default:
        logger.error(`Unsupported AI provider: ${provider}`);
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Get provider từ model name
   * WHY: Auto-detect provider từ model string
   */
  static getProviderFromModel(model: string): AIProvider {
    const modelLower = model.toLowerCase().trim();
    
    // OpenAI models
    if (modelLower.startsWith('gpt-') || modelLower.startsWith('o1')) {
      return 'openai';
    }
    
    // Gemini models (dùng OpenAI-compatible API)
    if (modelLower.startsWith('gemini')) {
      return 'gemini'; // Will use OpenAI provider (compatible)
    }
    
    // DeepSeek models
    if (
      modelLower.startsWith('deepseek-') ||
      modelLower.startsWith('deepseek-v') ||
      modelLower.startsWith('deepseek-r') ||
      modelLower === 'deepseek-chat'
    ) {
      return 'deepseek';
    }
    
    // Default to OpenAI
    return 'openai';
  }
}

