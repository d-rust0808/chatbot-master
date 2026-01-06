/**
 * Intent Detector Service
 * 
 * WHY: Pre-process messages để detect intent
 * - Classify user intent
 * - Route to appropriate handlers
 * - Extract key information
 * - NO ML model, dùng rule-based + AI
 */

import { logger } from '../../infrastructure/logger';
import { aiService } from './ai.service';

/**
 * Detected intent
 */
export interface DetectedIntent {
  intent: string;
  confidence: number;
  entities?: Record<string, string>;
}

/**
 * Common intents
 */
export type IntentType =
  | 'greeting'
  | 'question'
  | 'complaint'
  | 'order_inquiry'
  | 'product_inquiry'
  | 'support_request'
  | 'goodbye'
  | 'unknown';

/**
 * Intent Detector Service
 * WHY: Pre-process messages để understand user intent
 */
export class IntentDetectorService {
  /**
   * Detect intent từ user message
   * WHY: Route messages appropriately
   */
  async detectIntent(
    message: string,
    conversationId?: string,
    chatbotId?: string
  ): Promise<DetectedIntent> {
    try {
      // Rule-based detection first (fast)
      const ruleBasedIntent = this.detectIntentRuleBased(message);
      if (ruleBasedIntent.confidence > 0.8) {
        return ruleBasedIntent;
      }

      // AI-based detection (more accurate but slower)
      if (conversationId && chatbotId) {
        return await this.detectIntentAI(message, conversationId, chatbotId);
      }

      return ruleBasedIntent;
    } catch (error) {
      logger.error('Failed to detect intent:', error);
      return {
        intent: 'unknown',
        confidence: 0,
      };
    }
  }

  /**
   * Rule-based intent detection
   * WHY: Fast, không cần AI call
   */
  private detectIntentRuleBased(message: string): DetectedIntent {
    const lowerMessage = message.toLowerCase().trim();

    // Greeting patterns
    if (
      /^(chào|hello|hi|xin chào|chào bạn)/i.test(lowerMessage) ||
      lowerMessage.includes('chào') ||
      lowerMessage.includes('hello')
    ) {
      return { intent: 'greeting', confidence: 0.9 };
    }

    // Goodbye patterns
    if (
      /^(tạm biệt|bye|goodbye|cảm ơn)/i.test(lowerMessage) ||
      lowerMessage.includes('tạm biệt') ||
      lowerMessage.includes('bye')
    ) {
      return { intent: 'goodbye', confidence: 0.9 };
    }

    // Question patterns
    if (
      lowerMessage.includes('?') ||
      lowerMessage.startsWith('tại sao') ||
      lowerMessage.startsWith('làm sao') ||
      lowerMessage.startsWith('như thế nào')
    ) {
      return { intent: 'question', confidence: 0.8 };
    }

    // Product inquiry
    if (
      lowerMessage.includes('sản phẩm') ||
      lowerMessage.includes('hàng') ||
      lowerMessage.includes('còn không') ||
      lowerMessage.includes('giá')
    ) {
      return { intent: 'product_inquiry', confidence: 0.7 };
    }

    // Order inquiry
    if (
      lowerMessage.includes('đơn hàng') ||
      lowerMessage.includes('order') ||
      lowerMessage.includes('mã đơn')
    ) {
      return { intent: 'order_inquiry', confidence: 0.8 };
    }

    // Complaint
    if (
      lowerMessage.includes('phàn nàn') ||
      lowerMessage.includes('khiếu nại') ||
      lowerMessage.includes('lỗi') ||
      lowerMessage.includes('sai')
    ) {
      return { intent: 'complaint', confidence: 0.8 };
    }

    // Support request
    if (
      lowerMessage.includes('hỗ trợ') ||
      lowerMessage.includes('giúp') ||
      lowerMessage.includes('support')
    ) {
      return { intent: 'support_request', confidence: 0.7 };
    }

    return { intent: 'unknown', confidence: 0.5 };
  }

  /**
   * AI-based intent detection
   * WHY: More accurate cho complex messages
   */
  private async detectIntentAI(
    message: string,
    conversationId: string,
    chatbotId: string
  ): Promise<DetectedIntent> {
    try {
      const prompt = `Phân loại ý định của người dùng từ tin nhắn sau. Trả về JSON format:
{
  "intent": "greeting|question|complaint|order_inquiry|product_inquiry|support_request|goodbye|unknown",
  "confidence": 0.0-1.0,
  "entities": {
    "key": "value" // Extract important info nếu có
  }
}

Tin nhắn: "${message}"

Chỉ trả về JSON, không có text khác:`;

      const response = await aiService.generateResponse(
        conversationId,
        prompt,
        chatbotId
      );

      try {
        const result = JSON.parse(response);
        return {
          intent: result.intent || 'unknown',
          confidence: result.confidence || 0.5,
          entities: result.entities,
        };
      } catch {
        // Fallback to rule-based
        return this.detectIntentRuleBased(message);
      }
    } catch (error) {
      logger.error('AI intent detection failed:', error);
      return this.detectIntentRuleBased(message);
    }
  }

  /**
   * Check if message needs immediate attention
   * WHY: Prioritize urgent messages
   */
  needsImmediateAttention(intent: DetectedIntent): boolean {
    return (
      intent.intent === 'complaint' ||
      intent.intent === 'support_request' ||
      (intent.confidence > 0.9 && intent.intent !== 'greeting' && intent.intent !== 'goodbye')
    );
  }
}

// Export singleton instance
export const intentDetector = new IntentDetectorService();

