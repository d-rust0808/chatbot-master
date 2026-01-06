/**
 * AI types và interfaces
 * 
 * WHY: Type-safe AI integration
 * - Unified interface cho multiple AI providers
 * - Message format standardization
 * - Configuration types
 */

// AI Provider types
export type AIProvider = 'openai' | 'gemini' | 'deepseek';

// Chat message role
export type MessageRole = 'system' | 'user' | 'assistant';

// Chat message structure
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

// AI Configuration
export interface AIConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// AI Response
export interface AIResponse {
  content: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  finishReason?: string;
}

// Embedding response
export interface EmbeddingResponse {
  embedding: number[];
  tokenCount?: number;
}

// RAG Context
export interface RAGContext {
  chunks: Array<{
    content: string;
    metadata?: Record<string, unknown>;
    score?: number;
  }>;
  totalChunks: number;
}

