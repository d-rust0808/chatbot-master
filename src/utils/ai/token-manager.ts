/**
 * Token Management Utilities
 * 
 * WHY: Token counting và truncation
 * - Count tokens trước khi send request
 * - Truncate old messages nếu vượt limit
 * - Keep system prompt và recent messages
 * - Cost tracking
 */

import { encoding_for_model } from 'tiktoken';
import type { ChatMessage } from '../../types/ai';

/**
 * Count tokens trong messages
 * WHY: Tính cost và check limits
 */
export function countTokens(messages: ChatMessage[], model: string): number {
  try {
    // Get encoding cho model
    const enc = encoding_for_model(model as any);
    let total = 0;

    for (const msg of messages) {
      // Count tokens cho content
      const tokens = enc.encode(msg.content);
      total += tokens.length;

      // Add overhead cho role (approximate)
      total += 4; // ~4 tokens per message for role formatting
    }

    return total;
  } catch (error) {
    // Fallback: approximate 1 token = 4 characters
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
}

/**
 * Truncate messages nếu vượt token limit
 * WHY: Keep system prompt và recent messages
 */
export function truncateMessages(
  messages: ChatMessage[],
  maxTokens: number,
  model: string
): ChatMessage[] {
  // Separate system prompt và conversation messages
  const systemMsg = messages.find((m) => m.role === 'system');
  const conversationMsgs = messages.filter((m) => m.role !== 'system');

  // If already under limit, return as is
  const currentTokens = countTokens(messages, model);
  if (currentTokens <= maxTokens) {
    return messages;
  }

  // Truncate từ oldest messages
  let truncated = [...conversationMsgs];
  while (truncated.length > 0) {
    const testMessages = systemMsg
      ? [systemMsg, ...truncated]
      : truncated;
    const tokens = countTokens(testMessages, model);

    if (tokens <= maxTokens) {
      break;
    }

    // Remove oldest message (keep pairs if possible)
    // WHY: Keep conversation pairs (user + assistant)
    const firstMsg = truncated[0];
    if (truncated.length >= 2 && firstMsg && firstMsg.role === 'user') {
      truncated.shift(); // Remove user
      const secondMsg = truncated[0];
      if (secondMsg && secondMsg.role === 'assistant') {
        truncated.shift(); // Remove assistant
      }
    } else {
      truncated.shift(); // Remove single message
    }
  }

  // Reconstruct messages
  return systemMsg ? [systemMsg, ...truncated] : truncated;
}

/**
 * Calculate cost từ tokens và model
 * WHY: Cost tracking cho analytics
 */
export function calculateCost(
  tokens: number,
  model: string
): number {
  // Pricing per 1K tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  };

  // Default to GPT-3.5 pricing
  const price = pricing[model] || pricing['gpt-3.5-turbo'];
  
  // Approximate: 70% input, 30% output
  const inputTokens = Math.floor(tokens * 0.7);
  const outputTokens = Math.floor(tokens * 0.3);

  return (inputTokens / 1000) * price.input + (outputTokens / 1000) * price.output;
}

