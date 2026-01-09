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
import { calculateCost, countTokens } from '../../utils/ai/token-manager';
import type { IAIProvider } from '../../domain/ai-provider.interface';
import { promptBuilder } from './prompt-builder.service';
import { responseProcessor } from './response-processor.service';
import { intentDetector } from './intent-detector.service';
import { conversationMemoryService } from './conversation-memory.service';
import { creditService } from '../wallet/credit.service';
import {
  calculateCreditsFromTokenUsage,
  calculateCreditsFromTokens,
} from '../../utils/wallet/credit-pricing';
import { InsufficientCreditsError } from '../../errors/wallet/credit.errors';
import { aiRequestLogService } from './ai-request-log.service';
import { getProxyConfig } from '../system-config/proxy-config.service';
import { modelService } from './model.service';

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
    chatbotId: string,
    loggingContext?: {
      ipAddress?: string;
      userAgent?: string;
    }
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

      // 7. Estimate credits required and check balance
      const estimatedCredits = calculateCreditsFromTokens(
        countTokens(messages, chatbot.aiModel),
        chatbot.aiModel
      );
      
      const tenant = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { tenantId: true },
      });

      if (!tenant) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      const hasEnoughCredits = await creditService.canDeduct(
        tenant.tenantId,
        estimatedCredits
      );

      if (!hasEnoughCredits) {
        const balance = await creditService.getBalance(tenant.tenantId);
        throw new InsufficientCreditsError(
          tenant.tenantId,
          estimatedCredits,
          balance
        );
      }

      // 8. Get AI provider
      const providerType = AIProviderFactory.getProviderFromModel(chatbot.aiModel);
      const provider = AIProviderFactory.create(providerType);

      // 9. Generate response với fallback
      const startTime = Date.now();
      const response = await this.generateWithFallback(
        provider,
        messages,
        {
          model: chatbot.aiModel,
          temperature: chatbot.temperature,
          maxTokens: chatbot.maxTokens,
          systemPrompt: chatbot.systemPrompt,
        },
        chatbotId,
        {
          tenantId: tenant.tenantId,
          conversationId,
          chatbotId,
          ipAddress: loggingContext?.ipAddress,
          userAgent: loggingContext?.userAgent,
        }
      );
      const responseTime = Date.now() - startTime;

      // 9.1. Log AI request
      await this.logAIRequest(
        providerType,
        chatbot.aiModel,
        messages,
        response,
        responseTime,
        {
          tenantId: tenant.tenantId,
          conversationId,
          chatbotId,
          ipAddress: loggingContext?.ipAddress,
          userAgent: loggingContext?.userAgent,
        }
      );

      // 10. Post-processing: Process response
      const processed = await responseProcessor.processResponse(response.content, {
        formatMarkdown: true,
        validateResponse: true,
        extractEntities: true,
        maxLength: chatbot.maxTokens * 4, // Approximate char limit
      });

      // 11. Calculate actual credits used and deduct
      let creditsDeducted = 0;
      if (response.tokens) {
        creditsDeducted = calculateCreditsFromTokenUsage(
          response.tokens,
          response.model
        );

        // Deduct credits after successful response
        await creditService.deduct(
          tenant.tenantId,
          creditsDeducted,
          `AI Response - Chatbot: ${chatbotId}, Conversation: ${conversationId}`,
          conversationId,
          {
            chatbotId,
            model: response.model,
            tokens: response.tokens,
            conversationId,
          }
        );
      }

      // 12. Save response to database với token tracking
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
          creditsDeducted: creditsDeducted > 0 ? creditsDeducted : undefined,
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
    chatbotId: string,
    loggingContext?: {
      tenantId?: string;
      conversationId?: string;
      chatbotId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<any> {
    let lastError: Error | unknown;
    try {
      return await provider.generateResponse(messages, config);
    } catch (error) {
      lastError = error;
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
          lastError = fallbackError;
          logger.error('Fallback provider also failed:', fallbackError);
        }
      }

      // Last resort: return default message
      logger.error('All AI providers failed, returning default message');
      const errorResponse = {
        content:
          'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.',
        tokens: undefined,
        model: config.model,
      };

      // Log error
      if (loggingContext) {
        await this.logAIRequest(
          'openai', // Fallback provider
          config.model,
          messages,
          errorResponse,
          0,
          {
            ...loggingContext,
            error: lastError instanceof Error ? lastError.message : String(lastError),
          }
        ).catch((logError) => {
          logger.error('Failed to log AI request error', logError);
        });
      }

      return errorResponse;
    }
  }

  /**
   * Log AI request
   * WHY: Track mọi AI API call để monitor usage và costs
   */
  private async logAIRequest(
    provider: string,
    model: string,
    messages: any[],
    response: any,
    responseTime: number,
    context: {
      tenantId?: string;
      conversationId?: string;
      chatbotId?: string;
      ipAddress?: string;
      userAgent?: string;
      error?: string;
    }
  ): Promise<void> {
    try {
      // Get model config để tính cost
      const modelConfig = await modelService.getModelByName(model);

      // Build request URL
      const proxyConfig = await getProxyConfig();
      const baseURL = proxyConfig.apiBase || 'https://api.openai.com';
      const requestUrl = `${baseURL}/v1/chat/completions`;

      // Build request body (simplified)
      const requestBody = {
        model,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content?.substring(0, 1000), // Truncate for logging
        })),
      };

      // Log request
      await aiRequestLogService.logRequest({
        tenantId: context.tenantId,
        userId: undefined, // TODO: Get from context if available
        conversationId: context.conversationId,
        chatbotId: context.chatbotId,
        provider,
        model,
        requestUrl,
        requestMethod: 'POST',
        requestBody,
        statusCode: response.tokens ? 200 : 500,
        responseTime,
        tokens: response.tokens,
        cost: response.tokens
          ? calculateCost(response.tokens.total, model)
          : undefined,
        modelConfig: modelConfig || undefined,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        error: context.error,
      });
    } catch (error) {
      // Don't throw - logging failure shouldn't block response
      logger.error('Failed to log AI request', {
        error: error instanceof Error ? error.message : String(error),
        provider,
        model,
      });
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
      creditsDeducted?: number;
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

