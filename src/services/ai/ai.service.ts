/**
 * AI Service
 * 
 * WHY: Main service để generate AI responses
 * - Integrate AI providers + context builder
 * - Save messages to database
 * - Token tracking và cost calculation
 * - Error handling với fallback
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { AIProviderFactory } from './ai-provider.factory';
import { ConversationContextBuilder } from './conversation-context-builder';
import { calculateCost } from '../../utils/token-manager';
import type { IAIProvider } from '../../domain/ai-provider.interface';
import { promptBuilder } from './prompt-builder.service';
import { responseProcessor } from './response-processor.service';
import { intentDetector } from './intent-detector.service';
import { conversationMemoryService } from './conversation-memory.service';

/**
 * AI Service
 * WHY: Centralized AI response generation
 */
export class AIService {
  private contextBuilder: ConversationContextBuilder;

  constructor() {
    this.contextBuilder = new ConversationContextBuilder();
  }

  /**
   * Generate response cho conversation
   * WHY: Main entry point cho AI responses với full pipeline
   */
  async generateResponse(
    conversationId: string,
    userMessage: string,
    chatbotId: string
  ): Promise<string> {
    try {
      // 1. Pre-processing: Detect intent
      const intent = await intentDetector.detectIntent(
        userMessage,
        conversationId,
        chatbotId
      );
      logger.debug('Intent detected', { intent, conversationId });

      // 2. Save user message to database
      await this.saveMessage(conversationId, userMessage, 'incoming', chatbotId);

      // 3. Build context từ database (với intelligent summary)
      const context = await this.contextBuilder.buildContext(
        conversationId,
        chatbotId
      );

      // 4. Get chatbot config
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
        select: {
          aiModel: true,
          temperature: true,
          maxTokens: true,
          systemPrompt: true,
        },
      });

      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} not found`);
      }

      // 5. Get extracted entities từ conversation
      const summary = await conversationMemoryService.getConversationSummary(conversationId);
      const entities = summary?.keyEntities || {};

      // 6. Build prompt với Prompt Builder
      const messages = promptBuilder.buildPromptWithEntities(
        chatbot.systemPrompt || 'Bạn là một trợ lý AI hữu ích.',
        userMessage,
        entities,
        context
      );

      // 7. Get AI provider
      const providerType = AIProviderFactory.getProviderFromModel(chatbot.aiModel);
      const provider = AIProviderFactory.create(providerType);

      // 8. Generate response với fallback
      const response = await this.generateWithFallback(
        provider,
        messages,
        {
          model: chatbot.aiModel,
          temperature: chatbot.temperature,
          maxTokens: chatbot.maxTokens,
          systemPrompt: chatbot.systemPrompt,
        },
        chatbotId
      );

      // 9. Post-processing: Process response
      const processed = await responseProcessor.processResponse(response.content, {
        formatMarkdown: true,
        validateResponse: true,
        extractEntities: true,
        maxLength: chatbot.maxTokens * 4, // Approximate char limit
      });

      // 10. Save response to database với token tracking
      await this.saveMessage(
        conversationId,
        processed.content,
        'outgoing',
        chatbotId,
        {
          tokens: response.tokens,
          model: response.model,
          cost: response.tokens
            ? calculateCost(response.tokens.total, response.model)
            : undefined,
        }
      );

      // 11. Update entities nếu có
      if (processed.entities && Object.keys(processed.entities).length > 0) {
        const currentEntities = summary?.keyEntities || {};
        const updatedEntities = { ...currentEntities, ...processed.entities };
        await conversationMemoryService.saveConversationSummary(
          conversationId,
          summary?.summary || '',
          updatedEntities
        );
      }

      return processed.content;
    } catch (error) {
      logger.error('AI service error:', {
        conversationId,
        chatbotId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Generate với fallback strategy
   * WHY: Retry với cheaper model nếu primary fails
   */
  private async generateWithFallback(
    provider: IAIProvider,
    messages: any[],
    config: any,
    chatbotId: string
  ): Promise<any> {
    try {
      return await provider.generateResponse(messages, config);
    } catch (error) {
      logger.warn('Primary AI provider failed, trying fallback:', {
        error: error instanceof Error ? error.message : error,
        chatbotId,
      });

      // Fallback to GPT-3.5-turbo nếu không phải đã là GPT-3.5
      if (config.model !== 'gpt-3.5-turbo') {
        try {
          const fallbackProvider = AIProviderFactory.create('openai');
          return await fallbackProvider.generateResponse(messages, {
            ...config,
            model: 'gpt-3.5-turbo',
          });
        } catch (fallbackError) {
          logger.error('Fallback provider also failed:', fallbackError);
        }
      }

      // Last resort: return default message
      logger.error('All AI providers failed, returning default message');
      return {
        content:
          'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
        tokens: undefined,
        model: config.model,
      };
    }
  }

  /**
   * Save message to database
   * WHY: Persist conversation history
   */
  private async saveMessage(
    conversationId: string,
    content: string,
    direction: 'incoming' | 'outgoing',
    _chatbotId: string,
    metadata?: {
      tokens?: { prompt: number; completion: number; total: number };
      model?: string;
      cost?: number;
    }
  ): Promise<void> {
    try {
      // Get conversation để lấy platform
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { platform: true },
      });

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      await prisma.message.create({
        data: {
          conversationId,
          platform: conversation.platform,
          messageId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          direction,
          content,
          metadata: metadata ? (metadata as any) : undefined,
        },
      });
    } catch (error) {
      logger.error('Failed to save message:', error);
      // Don't throw - message saving failure shouldn't block response
    }
  }
}

// Export singleton instance
export const aiService = new AIService();

