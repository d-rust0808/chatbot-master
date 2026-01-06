---
alwaysApply: true
---

# AI Engine & Direct Model Integration

## Architecture Overview

### Core Principle
- **NO Vector Database**: Sử dụng PostgreSQL để lưu conversation history và context
- **Direct API Integration**: Kết nối trực tiếp với AI models (ChatGPT, Gemini, DeepSeek)
- **Context from Database**: Retrieve conversation history từ PostgreSQL để build context
- **Model Abstraction**: Unified interface cho multiple AI providers

## AI Provider Integration

### Supported Providers
1. **OpenAI (ChatGPT)**: GPT-3.5-turbo, GPT-4
2. **Google Gemini**: Gemini Pro, Gemini Ultra
3. **DeepSeek**: DeepSeek Chat

### Provider Interface
```typescript
interface AIProvider {
  generateResponse(
    messages: ChatMessage[],
    config: AIConfig
  ): Promise<AIResponse>;
  
  streamResponse?(
    messages: ChatMessage[],
    config: AIConfig,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}

interface AIConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
```

### Provider Factory Pattern
```typescript
class AIProviderFactory {
  static create(provider: 'openai' | 'gemini' | 'deepseek'): AIProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider();
      case 'gemini':
        return new GeminiProvider();
      case 'deepseek':
        return new DeepSeekProvider();
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
```

## Conversation Context Management

### Context Building Strategy
- **From Database**: Load conversation history từ PostgreSQL
- **Token Limit**: Respect model token limits (truncate old messages nếu cần)
- **System Prompt**: Include system prompt từ chatbot config
- **Message Format**: Format messages theo provider requirements

```typescript
class ConversationContextBuilder {
  async buildContext(
    conversationId: string,
    chatbotId: string
  ): Promise<ChatMessage[]> {
    // 1. Load chatbot config (system prompt, model settings)
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });
    
    // 2. Load recent messages (last N messages)
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 50, // Last 50 messages
    });
    
    // 3. Build message array
    const chatMessages: ChatMessage[] = [];
    
    // Add system prompt if exists
    if (chatbot?.systemPrompt) {
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
    
    // 4. Truncate if exceeds token limit
    return this.truncateToTokenLimit(chatMessages, chatbot?.maxTokens || 2000);
  }
}
```

### Token Management
- **MUST**: Count tokens trước khi send request
- **MUST**: Truncate old messages nếu vượt limit
- **MUST**: Keep system prompt và recent messages
- **MUST**: Log token usage cho cost tracking

```typescript
import { encoding_for_model } from 'tiktoken';

function countTokens(messages: ChatMessage[], model: string): number {
  const enc = encoding_for_model(model as any);
  let total = 0;
  for (const msg of messages) {
    total += enc.encode(msg.content).length;
  }
  return total;
}

function truncateMessages(
  messages: ChatMessage[],
  maxTokens: number,
  model: string
): ChatMessage[] {
  // Keep system prompt
  const systemMsg = messages.find(m => m.role === 'system');
  const conversationMsgs = messages.filter(m => m.role !== 'system');
  
  // Truncate from oldest messages
  let truncated = [...conversationMsgs];
  while (countTokens([systemMsg, ...truncated].filter(Boolean), model) > maxTokens) {
    truncated.shift(); // Remove oldest
  }
  
  return systemMsg ? [systemMsg, ...truncated] : truncated;
}
```

## AI Service Implementation

### Service Structure
```typescript
class AIService {
  constructor(
    private providerFactory: AIProviderFactory,
    private contextBuilder: ConversationContextBuilder
  ) {}
  
  async generateResponse(
    conversationId: string,
    userMessage: string,
    chatbotId: string
  ): Promise<string> {
    // 1. Save user message to database
    await this.saveMessage(conversationId, userMessage, 'incoming');
    
    // 2. Build context from database
    const context = await this.contextBuilder.buildContext(
      conversationId,
      chatbotId
    );
    
    // 3. Get chatbot config
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });
    
    // 4. Get AI provider
    const provider = this.providerFactory.create(
      this.getProviderFromModel(chatbot.aiModel)
    );
    
    // 5. Generate response
    const response = await provider.generateResponse(context, {
      model: chatbot.aiModel,
      temperature: chatbot.temperature,
      maxTokens: chatbot.maxTokens,
      systemPrompt: chatbot.systemPrompt,
    });
    
    // 6. Save response to database
    await this.saveMessage(conversationId, response.content, 'outgoing');
    
    return response.content;
  }
  
  private getProviderFromModel(model: string): 'openai' | 'gemini' | 'deepseek' {
    if (model.startsWith('gpt')) return 'openai';
    if (model.startsWith('gemini')) return 'gemini';
    if (model.startsWith('deepseek')) return 'deepseek';
    return 'openai'; // default
  }
}
```

## Provider-Specific Implementations

### OpenAI Provider
```typescript
import OpenAI from 'openai';

class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  async generateResponse(
    messages: ChatMessage[],
    config: AIConfig
  ): Promise<AIResponse> {
    const response = await this.client.chat.completions.create({
      model: config.model,
      messages: messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });
    
    return {
      content: response.choices[0].message.content || '',
      tokens: response.usage?.total_tokens || 0,
      model: response.model,
    };
  }
}
```

### Gemini Provider
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  
  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  
  async generateResponse(
    messages: ChatMessage[],
    config: AIConfig
  ): Promise<AIResponse> {
    const model = this.client.getGenerativeModel({ model: config.model });
    
    // Convert messages format for Gemini
    const prompt = this.formatMessagesForGemini(messages, config.systemPrompt);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return {
      content: response.text(),
      tokens: 0, // Gemini doesn't provide token count in response
      model: config.model,
    };
  }
}
```

### DeepSeek Provider
```typescript
import OpenAI from 'openai';

class DeepSeekProvider implements AIProvider {
  private client: OpenAI;
  
  constructor() {
    // DeepSeek uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });
  }
  
  async generateResponse(
    messages: ChatMessage[],
    config: AIConfig
  ): Promise<AIResponse> {
    const response = await this.client.chat.completions.create({
      model: config.model,
      messages: messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });
    
    return {
      content: response.choices[0].message.content || '',
      tokens: response.usage?.total_tokens || 0,
      model: response.model,
    };
  }
}
```

## Error Handling & Fallback

### Error Strategy
1. **Retry Logic**: Retry transient errors (network, rate limits)
2. **Fallback Model**: Fallback to cheaper/faster model nếu primary fails
3. **Graceful Degradation**: Return default message nếu all fails
4. **Logging**: Log all errors với context

```typescript
async function generateWithFallback(
  conversationId: string,
  userMessage: string,
  chatbotId: string
): Promise<string> {
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
  });
  
  const primaryProvider = AIProviderFactory.create(
    getProviderFromModel(chatbot.aiModel)
  );
  
  try {
    return await this.generateResponse(conversationId, userMessage, chatbotId);
  } catch (error) {
    logger.error('Primary AI provider failed', { error, chatbotId });
    
    // Fallback to GPT-3.5-turbo
    if (chatbot.aiModel !== 'gpt-3.5-turbo') {
      logger.info('Falling back to GPT-3.5-turbo');
      const fallbackProvider = AIProviderFactory.create('openai');
      // ... retry with fallback
    }
    
    // Last resort: return default message
    return "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.";
  }
}
```

## Cost Tracking & Optimization

### Token Usage Tracking
- **MUST**: Track tokens used per request
- **MUST**: Store in database cho analytics
- **MUST**: Calculate costs per tenant
- **MUST**: Set limits per tenant/chatbot

```typescript
// Store token usage
await prisma.message.create({
  data: {
    conversationId,
    content: response.content,
    direction: 'outgoing',
    metadata: {
      tokens: response.tokens,
      model: response.model,
      cost: calculateCost(response.tokens, response.model),
    },
  },
});
```

### Rate Limiting
- **Per Tenant**: Limit requests per tenant
- **Per Chatbot**: Limit requests per chatbot
- **Per User**: Limit requests per user (if applicable)
- **Queue System**: Queue requests nếu limit reached

## Best Practices

### DO
- ✅ Always validate model name trước khi call API
- ✅ Always handle rate limits gracefully
- ✅ Always log token usage và costs
- ✅ Always truncate context nếu vượt token limit
- ✅ Always save conversation history to database
- ✅ Use connection pooling cho database

### DON'T
- ❌ Don't hardcode API keys
- ❌ Don't ignore token limits
- ❌ Don't skip error handling
- ❌ Don't store full conversation in memory (use database)
- ❌ Don't make synchronous API calls (always async)
