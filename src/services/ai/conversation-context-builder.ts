/**
 * Conversation Context Builder
 * 
 * WHY: Build context từ PostgreSQL conversation history
 * - Load messages từ database
 * - Include system prompt
 * - Token management và truncation
 * - NO vector DB, chỉ dùng conversation history
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import type { ChatMessage } from '../../types/ai';
import { truncateMessages } from '../../utils/ai/token-manager';
import { conversationMemoryService } from './conversation-memory.service';

/**
 * Conversation Context Builder
 * WHY: Centralized context building từ database
 */
export class ConversationContextBuilder {
  /**
   * Build context từ conversation history
   */
  async buildContext(
    conversationId: string,
    chatbotId: string
  ): Promise<ChatMessage[]> {
    try {
      // 1. Load chatbot config (system prompt, model settings)
      const chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
        select: {
          systemPrompt: true,
          aiModel: true,
          maxTokens: true,
        },
      });

      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} not found`);
      }

      // 2. Load recent messages từ database
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 50, // Last 50 messages
        select: {
          direction: true,
          content: true,
        },
      });

      // 3. Build message array
      const chatMessages: ChatMessage[] = [];

      // Add system prompt nếu có
      if (chatbot.systemPrompt) {
        chatMessages.push({
          role: 'system',
          content: chatbot.systemPrompt,
        });
      }

      // Add conversation history
      for (const msg of messages) {
        chatMessages.push({
          role: msg.direction === 'incoming' ? 'user' : 'assistant',
          content: msg.content,
        });
      }

      // 4. Use intelligent context building với summary
      const maxTokens = chatbot.maxTokens || 2000;
      
      // Build intelligent context (with summary if needed)
      const intelligentContext = await conversationMemoryService.buildIntelligentContext(
        conversationId,
        chatbotId,
        chatMessages,
        maxTokens
      );

      // 5. Truncate nếu vẫn vượt limit
      const truncated = truncateMessages(intelligentContext, maxTokens, chatbot.aiModel);

      logger.debug('Context built', {
        conversationId,
        chatbotId,
        messageCount: truncated.length,
        hasSystemPrompt: !!chatbot.systemPrompt,
      });

      return truncated;
    } catch (error) {
      logger.error('Failed to build context:', error);
      throw error;
    }
  }

  /**
   * Add new message to context (for current request)
   */
  addMessageToContext(
    context: ChatMessage[],
    userMessage: string
  ): ChatMessage[] {
    return [
      ...context,
      {
        role: 'user',
        content: userMessage,
      },
    ];
  }
}

