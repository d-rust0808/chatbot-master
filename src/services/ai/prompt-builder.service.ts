/**
 * Prompt Builder Service
 * 
 * WHY: Build intelligent prompts cho AI
 * - System prompts
 * - Few-shot examples
 * - Context injection
 * - Prompt templates
 */

import type { ChatMessage } from '../../types/ai';

export interface PromptOptions {
  systemPrompt?: string;
  fewShotExamples?: Array<{ user: string; assistant: string }>;
  context?: string; // Additional context (e.g., from knowledge base)
  conversationHistory?: ChatMessage[];
  userMessage: string;
}

/**
 * Prompt Builder Service
 * WHY: Centralized prompt building logic
 */
export class PromptBuilderService {
  /**
   * Build complete prompt từ options
   * WHY: Consistent prompt structure
   */
  buildPrompt(options: PromptOptions): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // 1. System prompt
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.buildSystemPrompt(options.systemPrompt, options.context),
      });
    }

    // 2. Few-shot examples (nếu có)
    if (options.fewShotExamples && options.fewShotExamples.length > 0) {
      const examplesText = this.buildFewShotExamples(options.fewShotExamples);
      // Add examples vào system prompt hoặc separate message
      if (messages.length > 0 && messages[0].role === 'system') {
        messages[0].content += `\n\nVí dụ cách trả lời:\n${examplesText}`;
      } else {
        messages.push({
          role: 'system',
          content: `Ví dụ cách trả lời:\n${examplesText}`,
        });
      }
    }

    // 3. Conversation history (nếu có)
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      // Filter out system messages (already added)
      const historyMessages = options.conversationHistory.filter(
        (m) => m.role !== 'system'
      );
      messages.push(...historyMessages);
    }

    // 4. Current user message
    messages.push({
      role: 'user',
      content: options.userMessage,
    });

    return messages;
  }

  /**
   * Build system prompt với context
   */
  private buildSystemPrompt(basePrompt: string, context?: string): string {
    if (!context) {
      return basePrompt;
    }

    return `${basePrompt}\n\nThông tin bổ sung:\n${context}`;
  }

  /**
   * Build few-shot examples
   */
  private buildFewShotExamples(
    examples: Array<{ user: string; assistant: string }>
  ): string {
    return examples
      .map((ex, index) => {
        return `Ví dụ ${index + 1}:
Người dùng: ${ex.user}
Trợ lý: ${ex.assistant}`;
      })
      .join('\n\n');
  }

  /**
   * Build prompt template cho specific use cases
   */
  buildCustomerServicePrompt(
    systemPrompt: string,
    userMessage: string,
    conversationHistory?: ChatMessage[]
  ): ChatMessage[] {
    return this.buildPrompt({
      systemPrompt: `${systemPrompt}\n\nBạn là một nhân viên chăm sóc khách hàng chuyên nghiệp. Luôn lịch sự, nhiệt tình và giải quyết vấn đề của khách hàng.`,
      userMessage,
      conversationHistory,
      fewShotExamples: [
        {
          user: 'Sản phẩm này có còn hàng không?',
          assistant: 'Chào bạn! Sản phẩm hiện đang còn hàng. Bạn có muốn đặt hàng ngay không?',
        },
        {
          user: 'Tôi muốn đổi hàng',
          assistant: 'Chào bạn! Tôi có thể hỗ trợ bạn đổi hàng. Bạn vui lòng cho tôi biết lý do đổi hàng và mã đơn hàng được không?',
        },
      ],
    });
  }

  /**
   * Build prompt với entity context
   * WHY: Inject extracted entities vào prompt
   */
  buildPromptWithEntities(
    basePrompt: string,
    userMessage: string,
    entities: Record<string, string>,
    conversationHistory?: ChatMessage[]
  ): ChatMessage[] {
    // Build entity context
    const entityContext = Object.entries(entities)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const enhancedSystemPrompt = entityContext
      ? `${basePrompt}\n\nThông tin khách hàng:\n${entityContext}`
      : basePrompt;

    return this.buildPrompt({
      systemPrompt: enhancedSystemPrompt,
      userMessage,
      conversationHistory,
    });
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilderService();

