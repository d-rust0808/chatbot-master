/**
 * Conversation Memory Service
 * 
 * WHY: Advanced conversation memory management
 * - BufferMemory: Last N messages
 * - SummaryMemory: Summarize old conversations
 * - Entity extraction: Extract important info
 * - NO vector DB, chỉ dùng PostgreSQL
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { aiService } from './ai.service';
import { cacheService } from '../cache.service';
import type { ChatMessage } from '../../types/ai';

/**
 * Conversation summary
 */
interface ConversationSummary {
  summary: string;
  keyEntities: Record<string, string>; // e.g., { name: "John", phone: "123456" }
  lastUpdated: Date;
}

/**
 * Conversation Memory Service
 * WHY: Manage conversation memory intelligently
 */
export class ConversationMemoryService {
  /**
   * Summarize old conversation messages
   * WHY: Compress long conversations để fit trong token limit
   */
  async summarizeConversation(
    conversationId: string,
    chatbotId: string,
    messagesToSummarize: ChatMessage[]
  ): Promise<string> {
    try {
      if (messagesToSummarize.length === 0) {
        return '';
      }

      // Build summary prompt
      const summaryPrompt = `Tóm tắt cuộc hội thoại sau đây, giữ lại thông tin quan trọng như tên, số điện thoại, email, yêu cầu của khách hàng:

${messagesToSummarize.map((m) => `${m.role}: ${m.content}`).join('\n')}

Tóm tắt ngắn gọn (tối đa 200 từ):`;

      // Use AI to generate summary
      // WHY: AI có thể tóm tắt tốt hơn rule-based
      const summaryResponse = await aiService.generateResponse(
        conversationId,
        summaryPrompt,
        chatbotId
      );

      return summaryResponse;
    } catch (error) {
      logger.error('Failed to summarize conversation:', error);
      // Fallback: simple text summary
      return `Cuộc hội thoại có ${messagesToSummarize.length} tin nhắn.`;
    }
  }

  /**
   * Extract entities từ conversation
   * WHY: Lưu thông tin quan trọng (tên, SĐT, email) để reuse
   */
  async extractEntities(
    conversationId: string,
    chatbotId: string,
    messages: ChatMessage[]
  ): Promise<Record<string, string>> {
    try {
      const recentMessages = messages.slice(-10); // Last 10 messages

      const extractionPrompt = `Từ cuộc hội thoại sau, trích xuất thông tin quan trọng (tên, số điện thoại, email, địa chỉ). Trả về JSON format:
{
  "name": "tên nếu có",
  "phone": "số điện thoại nếu có",
  "email": "email nếu có",
  "address": "địa chỉ nếu có"
}

Cuộc hội thoại:
${recentMessages.map((m) => `${m.role}: ${m.content}`).join('\n')}

Chỉ trả về JSON, không có text khác:`;

      // Use AI to extract entities
      const extractionResponse = await aiService.generateResponse(
        conversationId,
        extractionPrompt,
        chatbotId
      );

      // Parse JSON response
      try {
        const entities = JSON.parse(extractionResponse);
        return entities as Record<string, string>;
      } catch {
        // If not valid JSON, return empty
        logger.warn('Failed to parse entity extraction response');
        return {};
      }
    } catch (error) {
      logger.error('Failed to extract entities:', error);
      return {};
    }
  }

  /**
   * Get conversation summary từ database (with cache)
   */
  async getConversationSummary(conversationId: string): Promise<ConversationSummary | null> {
    try {
      // Try cache first
      const cacheKey = cacheService.conversationSummaryKey(conversationId);
      const cached = await cacheService.get<ConversationSummary>(cacheKey);
      if (cached) {
        return cached;
      }

      const conversation = await prisma.$queryRaw<Array<{
        summary: string | null;
        metadata: any;
        updatedAt: Date;
      }>>`
        SELECT summary, metadata, "updatedAt"
        FROM conversations
        WHERE id = ${conversationId}
      `;

      if (!conversation || conversation.length === 0 || !conversation[0].summary) {
        return null;
      }

      const data = conversation[0];
      const summary: ConversationSummary = {
        summary: data.summary!,
        keyEntities: (data.metadata as any)?.entities || {},
        lastUpdated: data.updatedAt,
      };

      // Cache result
      await cacheService.set(cacheKey, summary, 3600); // 1 hour

      return summary;
    } catch (error) {
      logger.error('Failed to get conversation summary:', error);
      return null;
    }
  }

  /**
   * Save conversation summary
   */
  async saveConversationSummary(
    conversationId: string,
    summary: string,
    entities: Record<string, string>
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE conversations
        SET summary = ${summary},
            metadata = ${JSON.stringify({ entities })}::jsonb,
            "updatedAt" = NOW()
        WHERE id = ${conversationId}
      `;
    } catch (error) {
      logger.error('Failed to save conversation summary:', error);
    }
  }

  /**
   * Build intelligent context với summary
   * WHY: Combine summary + recent messages để optimize token usage
   */
  async buildIntelligentContext(
    conversationId: string,
    chatbotId: string,
    recentMessages: ChatMessage[],
    _maxTokens: number
  ): Promise<ChatMessage[]> {
    try {
      // Get existing summary
      const existingSummary = await this.getConversationSummary(conversationId);

      // Check if we need to summarize
      const messageCount = recentMessages.length;
      const shouldSummarize = messageCount > 20; // Summarize if > 20 messages

      let summaryText = existingSummary?.summary || '';

      // Create new summary nếu cần
      if (shouldSummarize && !existingSummary) {
        // Summarize old messages (first 30 messages)
        const oldMessages = recentMessages.slice(0, 30);
        summaryText = await this.summarizeConversation(conversationId, chatbotId, oldMessages);

        // Extract entities
        const entities = await this.extractEntities(conversationId, chatbotId, oldMessages);

        // Save summary
        await this.saveConversationSummary(conversationId, summaryText, entities);
      }

      // Build context: system prompt + summary + recent messages
      const context: ChatMessage[] = [];

      // Add summary nếu có
      if (summaryText) {
        context.push({
          role: 'system',
          content: `Tóm tắt cuộc hội thoại trước: ${summaryText}`,
        });
      }

      // Add recent messages (last 10-15 messages)
      const recentCount = shouldSummarize ? 10 : 20;
      const recent = recentMessages.slice(-recentCount);
      context.push(...recent);

      return context;
    } catch (error) {
      logger.error('Failed to build intelligent context:', error);
      // Fallback: return recent messages only
      return recentMessages.slice(-20);
    }
  }
}

// Export singleton instance
export const conversationMemoryService = new ConversationMemoryService();

