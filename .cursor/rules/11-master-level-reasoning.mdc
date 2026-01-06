---
alwaysApply: true
---

# Master-Level Reasoning & AI Chatbot Expertise

## Advanced Cognitive Patterns

### Systems Thinking
- **MUST**: Think in systems, not isolated components
- **MUST**: Understand cascading effects của changes
- **MUST**: Consider second-order consequences
- **MUST**: Map dependencies và relationships

```typescript
// ❌ Naive thinking - Single component
async function sendMessage(chatId: string, message: string) {
  await adapter.sendMessage(chatId, message);
}

// ✅ Systems thinking - Consider entire flow
async function sendMessage(
  tenantId: string,
  chatId: string,
  message: string
): Promise<MessageResult> {
  // 1. System: Rate limiting affects entire tenant
  const rateLimit = await rateLimitService.check(tenantId);
  if (!rateLimit.allowed) {
    // Queue for later, don't block
    await messageQueue.enqueue({ tenantId, chatId, message });
    return { queued: true, estimatedDelay: rateLimit.retryAfter };
  }
  
  // 2. System: Cost tracking affects billing
  const costEstimate = await aiService.estimateCost(message);
  const canAfford = await billingService.checkBalance(tenantId, costEstimate);
  if (!canAfford) {
    throw new InsufficientCreditsError(tenantId);
  }
  
  // 3. System: Message affects analytics
  await analyticsService.track('message_sent', { tenantId, platform, length: message.length });
  
  // 4. System: Error affects user experience
  try {
    const result = await adapter.sendMessage(chatId, message);
    await billingService.charge(tenantId, costEstimate);
    return result;
  } catch (error) {
    // System: Error affects reliability metrics
    await reliabilityService.recordFailure(tenantId, error);
    throw error;
  }
}
```

### Multi-Layer Reasoning
- **Layer 1**: Immediate problem (what user asked)
- **Layer 2**: Underlying patterns (why this pattern exists)
- **Layer 3**: System implications (how this affects system)
- **Layer 4**: Strategic considerations (long-term impact)

```typescript
// User asks: "Add retry logic for AI calls"

// Layer 1: Immediate - Add retry
// Layer 2: Pattern - Exponential backoff, circuit breaker
// Layer 3: System - Cost implications, rate limits, user experience
// Layer 4: Strategic - Multi-provider fallback, cost optimization

// ✅ Master implementation
class AIRetryStrategy {
  constructor(
    private providers: AIProvider[],
    private costOptimizer: CostOptimizer,
    private circuitBreaker: CircuitBreaker
  ) {}
  
  async generateWithIntelligentRetry(
    request: AIRequest,
    context: RequestContext
  ): Promise<AIResponse> {
    // Strategic: Try cheapest first if not urgent
    const providerOrder = this.costOptimizer.optimizeOrder(
      this.providers,
      request.urgency,
      context.tenantTier
    );
    
    for (const provider of providerOrder) {
      // System: Check circuit breaker
      if (!this.circuitBreaker.canAttempt(provider.id)) {
        continue;
      }
      
      try {
        // Pattern: Exponential backoff with jitter
        const response = await this.retryWithBackoff(
          () => provider.generate(request),
          {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            jitter: true,
          }
        );
        
        // System: Update success metrics
        await this.updateMetrics(provider.id, 'success');
        return response;
      } catch (error) {
        // System: Update failure metrics
        await this.updateMetrics(provider.id, 'failure');
        
        // Strategic: If critical, try next provider immediately
        if (request.urgency === 'critical' && providerOrder.length > 1) {
          continue;
        }
        
        // Pattern: Circuit breaker on repeated failures
        this.circuitBreaker.recordFailure(provider.id);
      }
    }
    
    // Strategic: Graceful degradation
    return this.generateFallbackResponse(request);
  }
}
```

## Deep AI/Chatbot Domain Understanding

### Conversation Flow Mastery
- **MUST**: Understand conversation state machines
- **MUST**: Handle context windows intelligently
- **MUST**: Manage conversation memory efficiently
- **MUST**: Optimize token usage

```typescript
// ✅ Master-level conversation management
class ConversationManager {
  private conversationCache = new LRUCache<string, ConversationState>({
    max: 1000,
    ttl: 3600000, // 1 hour
  });
  
  async processMessage(
    conversationId: string,
    userMessage: string,
    chatbotConfig: ChatbotConfig
  ): Promise<string> {
    // 1. Load conversation state (cached)
    let state = this.conversationCache.get(conversationId);
    if (!state) {
      state = await this.loadFromDatabase(conversationId);
      this.conversationCache.set(conversationId, state);
    }
    
    // 2. Intelligent context window management
    const contextWindow = this.buildContextWindow(
      state,
      chatbotConfig.maxTokens,
      chatbotConfig.model
    );
    
    // 3. Smart token optimization
    const optimizedContext = this.optimizeContext(
      contextWindow,
      {
        preserveSystemPrompt: true,
        preserveRecentMessages: 10,
        summarizeOldMessages: true,
        maxTokens: chatbotConfig.maxTokens * 0.8, // Leave room for response
      }
    );
    
    // 4. Generate with fallback
    const response = await this.generateWithFallback(
      optimizedContext,
      chatbotConfig
    );
    
    // 5. Update state efficiently
    state.messages.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: response }
    );
    
    // 6. Smart persistence (debounced)
    this.debouncedPersist(conversationId, state);
    
    return response;
  }
  
  private optimizeContext(
    context: ChatMessage[],
    options: ContextOptimizationOptions
  ): ChatMessage[] {
    const systemPrompt = context.find(m => m.role === 'system');
    const recentMessages = context
      .filter(m => m.role !== 'system')
      .slice(-options.preserveRecentMessages);
    
    const oldMessages = context
      .filter(m => m.role !== 'system')
      .slice(0, -options.preserveRecentMessages);
    
    // Master: Summarize old messages if needed
    let summarizedOld = oldMessages;
    if (oldMessages.length > 0 && options.summarizeOldMessages) {
      const summary = await this.summarizeMessages(oldMessages);
      summarizedOld = [{ role: 'system', content: `Previous conversation summary: ${summary}` }];
    }
    
    // Master: Truncate intelligently
    const optimized = [
      ...(systemPrompt ? [systemPrompt] : []),
      ...summarizedOld,
      ...recentMessages,
    ];
    
    // Ensure within token limit
    return this.truncateToTokenLimit(optimized, options.maxTokens);
  }
}
```

### Multi-Provider Intelligence
- **MUST**: Understand strengths/weaknesses của each provider
- **MUST**: Route requests intelligently
- **MUST**: Optimize costs while maintaining quality
- **MUST**: Handle provider-specific quirks

```typescript
// ✅ Master-level provider orchestration
class IntelligentAIOrchestrator {
  private providerProfiles = new Map<string, ProviderProfile>([
    ['gpt-4', {
      strengths: ['complex_reasoning', 'code', 'analysis'],
      weaknesses: ['cost', 'speed'],
      costPer1kTokens: 0.03,
      avgLatency: 2000,
      qualityScore: 0.95,
    }],
    ['gpt-3.5-turbo', {
      strengths: ['speed', 'cost', 'general'],
      weaknesses: ['complex_reasoning'],
      costPer1kTokens: 0.002,
      avgLatency: 800,
      qualityScore: 0.85,
    }],
    ['gemini-pro', {
      strengths: ['long_context', 'multimodal'],
      weaknesses: ['availability'],
      costPer1kTokens: 0.001,
      avgLatency: 1200,
      qualityScore: 0.88,
    }],
    ['deepseek-chat', {
      strengths: ['cost', 'code', 'chinese'],
      weaknesses: ['general_knowledge'],
      costPer1kTokens: 0.0007,
      avgLatency: 1000,
      qualityScore: 0.82,
    }],
  ]);
  
  async selectOptimalProvider(
    request: AIRequest,
    constraints: RequestConstraints
  ): Promise<AIProvider> {
    // Master: Multi-factor decision making
    const candidates = Array.from(this.providerProfiles.entries())
      .filter(([model]) => this.isModelAvailable(model))
      .map(([model, profile]) => ({
        model,
        profile,
        score: this.calculateFitnessScore(model, profile, request, constraints),
      }))
      .sort((a, b) => b.score - a.score);
    
    return this.createProvider(candidates[0].model);
  }
  
  private calculateFitnessScore(
    model: string,
    profile: ProviderProfile,
    request: AIRequest,
    constraints: RequestConstraints
  ): number {
    let score = 0;
    
    // Quality factor (40%)
    score += profile.qualityScore * 0.4;
    
    // Cost factor (20%) - inverse, cheaper is better
    const costScore = 1 - Math.min(profile.costPer1kTokens / 0.01, 1);
    score += costScore * 0.2;
    
    // Speed factor (15%)
    const speedScore = 1 - Math.min(profile.avgLatency / 5000, 1);
    score += speedScore * 0.15;
    
    // Task fit factor (25%) - match request type to strengths
    const taskFit = this.calculateTaskFit(profile.strengths, request.type);
    score += taskFit * 0.25;
    
    // Apply constraints
    if (constraints.maxCost && profile.costPer1kTokens > constraints.maxCost) {
      score *= 0.1; // Heavily penalize
    }
    
    if (constraints.maxLatency && profile.avgLatency > constraints.maxLatency) {
      score *= 0.1;
    }
    
    return score;
  }
}
```

## Master-Level TypeScript/Node.js Patterns

### Advanced Type Safety
- **MUST**: Use advanced TypeScript features (conditional types, mapped types)
- **MUST**: Create type-safe abstractions
- **MUST**: Leverage type inference
- **MUST**: Build type-safe APIs

```typescript
// ✅ Master-level type system usage
type PlatformType = 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'zalo';

type PlatformConfig<T extends PlatformType> = 
  T extends 'whatsapp' ? WhatsAppConfig :
  T extends 'facebook' ? FacebookConfig :
  T extends 'instagram' ? InstagramConfig :
  T extends 'tiktok' ? TikTokConfig :
  T extends 'zalo' ? ZaloConfig :
  never;

type PlatformAdapter<T extends PlatformType> = {
  platform: T;
  connect(config: PlatformConfig<T>): Promise<void>;
  sendMessage(chatId: string, message: string): Promise<void>;
  // ... type-safe methods
};

// Master: Type-safe factory
class PlatformAdapterFactory {
  create<T extends PlatformType>(
    platform: T,
    config: PlatformConfig<T>
  ): PlatformAdapter<T> {
    switch (platform) {
      case 'whatsapp':
        return new WhatsAppAdapter(config) as PlatformAdapter<T>;
      case 'facebook':
        return new FacebookAdapter(config) as PlatformAdapter<T>;
      // ... TypeScript ensures all cases covered
    }
  }
}

// Master: Type-safe event system
type EventMap = {
  'message:received': { chatId: string; content: string; platform: PlatformType };
  'message:sent': { chatId: string; messageId: string; platform: PlatformType };
  'connection:status': { platform: PlatformType; status: ConnectionStatus };
};

class TypedEventEmitter<T extends Record<string, any>> {
  private listeners = new Map<keyof T, Set<(data: T[keyof T]) => void>>();
  
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }
  
  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }
}

// Usage: Fully type-safe
const emitter = new TypedEventEmitter<EventMap>();
emitter.on('message:received', (data) => {
  // TypeScript knows: data.chatId, data.content, data.platform
  console.log(data.chatId); // ✅ Type-safe
});
```

### Advanced Async Patterns
- **MUST**: Use advanced async patterns (pools, queues, streams)
- **MUST**: Handle backpressure
- **MUST**: Optimize concurrent operations
- **MUST**: Use async generators when appropriate

```typescript
// ✅ Master-level async patterns
class MessageProcessor {
  private processingQueue = new PQueue({
    concurrency: 10,
    interval: 1000,
    intervalCap: 50, // Rate limit: 50 messages/second
  });
  
  private resultStream = new EventEmitter();
  
  async *processMessagesStream(
    messages: AsyncIterable<IncomingMessage>
  ): AsyncGenerator<ProcessedMessage> {
    // Master: Process with backpressure
    for await (const message of messages) {
      const processed = await this.processingQueue.add(
        () => this.processMessage(message),
        { priority: this.calculatePriority(message) }
      );
      
      yield processed;
      
      // Master: Emit for real-time updates
      this.resultStream.emit('processed', processed);
    }
  }
  
  // Master: Batch processing with intelligent batching
  async processBatch(
    messages: IncomingMessage[],
    options: BatchOptions = {}
  ): Promise<ProcessedMessage[]> {
    const batchSize = options.batchSize || this.calculateOptimalBatchSize(messages.length);
    const batches = this.chunkArray(messages, batchSize);
    
    // Master: Process batches with controlled concurrency
    const results = await Promise.allSettled(
      batches.map(batch => this.processBatchInternal(batch))
    );
    
    // Master: Handle partial failures intelligently
    const successful = results
      .filter((r): r is PromiseFulfilledResult<ProcessedMessage[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);
    
    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason);
    
    if (failed.length > 0) {
      await this.handleBatchFailures(failed, messages);
    }
    
    return successful;
  }
  
  private calculateOptimalBatchSize(totalMessages: number): number {
    // Master: Dynamic batch sizing based on system load
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();
    
    if (cpuUsage.user > 1000000 || memoryUsage.heapUsed > 500 * 1024 * 1024) {
      return Math.min(10, totalMessages); // Smaller batches under load
    }
    
    return Math.min(50, Math.ceil(totalMessages / 10)); // Larger batches when idle
  }
}
```

### Performance Mastery
- **MUST**: Understand Node.js event loop deeply
- **MUST**: Optimize for throughput và latency
- **MUST**: Use appropriate data structures
- **MUST**: Profile và optimize hot paths

```typescript
// ✅ Master-level performance optimization
class HighPerformanceMessageRouter {
  // Master: Use Map for O(1) lookups instead of Array.find
  private routeCache = new Map<string, Route>();
  private routePatterns = new Map<RegExp, Route>();
  
  // Master: Pre-compile regex patterns
  private compiledPatterns: Array<{ pattern: RegExp; route: Route }> = [];
  
  constructor(routes: Route[]) {
    // Master: Build efficient lookup structures
    routes.forEach(route => {
      if (route.exact) {
        this.routeCache.set(route.path, route);
      } else {
        const pattern = new RegExp(route.path);
        this.routePatterns.set(pattern, route);
        this.compiledPatterns.push({ pattern, route });
      }
    });
    
    // Master: Sort patterns by specificity (most specific first)
    this.compiledPatterns.sort((a, b) => {
      const aSpecificity = (a.pattern.source.match(/\//g) || []).length;
      const bSpecificity = (b.pattern.source.match(/\//g) || []).length;
      return bSpecificity - aSpecificity;
    });
  }
  
  // Master: O(1) exact match, O(n) pattern match (but optimized)
  findRoute(path: string): Route | null {
    // Fast path: exact match
    const exact = this.routeCache.get(path);
    if (exact) return exact;
    
    // Optimized pattern matching (most specific first)
    for (const { pattern, route } of this.compiledPatterns) {
      if (pattern.test(path)) {
        // Master: Cache successful pattern matches
        this.routeCache.set(path, route);
        return route;
      }
    }
    
    return null;
  }
}

// Master: Memory-efficient streaming
class StreamingAIResponse {
  async *streamResponse(
    request: AIRequest,
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<string> {
    // Master: Use streaming API to reduce memory
    const stream = await this.aiProvider.stream(request);
    
    let buffer = '';
    for await (const chunk of stream) {
      buffer += chunk;
      
      // Master: Yield complete tokens (not partial)
      const tokens = this.tokenize(buffer);
      for (let i = 0; i < tokens.length - 1; i++) {
        yield tokens[i];
        onChunk?.(tokens[i]);
      }
      
      // Keep last partial token in buffer
      buffer = tokens[tokens.length - 1] || '';
    }
    
    // Yield remaining buffer
    if (buffer) {
      yield buffer;
      onChunk?.(buffer);
    }
  }
}
```

## Advanced Problem Solving

### Decomposition Strategy
- **MUST**: Break complex problems into smaller, solvable pieces
- **MUST**: Identify core constraints
- **MUST**: Find elegant solutions, not just working ones
- **MUST**: Consider multiple solution approaches

```typescript
// Problem: Handle 10,000 concurrent conversations efficiently

// ❌ Naive: One connection per conversation
// Problem: 10,000 database connections = disaster

// ✅ Master: Connection pooling + intelligent batching
class ScalableConversationManager {
  private connectionPool: Pool;
  private conversationCache: LRUCache<string, ConversationState>;
  private batchProcessor: BatchProcessor;
  
  async handleConversation(
    conversationId: string,
    message: string
  ): Promise<string> {
    // Master: Multi-layer optimization
    
    // Layer 1: Cache hit (fastest path)
    const cached = this.conversationCache.get(conversationId);
    if (cached && this.isCacheValid(cached)) {
      return this.processWithCache(cached, message);
    }
    
    // Layer 2: Batch load (efficient for many requests)
    const batchKey = this.getBatchKey(conversationId);
    const batch = await this.batchProcessor.getOrCreateBatch(batchKey, {
      load: () => this.loadConversationsBatch([conversationId]),
      maxWait: 50, // Wait 50ms for more requests to batch
      maxSize: 100, // Load up to 100 conversations at once
    });
    
    const state = batch.get(conversationId);
    this.conversationCache.set(conversationId, state);
    
    // Layer 3: Process with optimized context
    return this.processWithState(state, message);
  }
}
```

### Elegant Solutions
- **MUST**: Prefer elegant, maintainable solutions
- **MUST**: Use appropriate abstractions
- **MUST**: Write self-documenting code
- **MUST**: Balance simplicity và power

```typescript
// ✅ Master: Elegant, powerful, maintainable
class ConversationContextBuilder {
  buildContext(
    conversationId: string,
    config: ContextConfig
  ): Promise<ChatMessage[]> {
    return this.pipeline(
      () => this.loadConversation(conversationId),
      (state) => this.filterRelevant(state, config),
      (messages) => this.optimizeTokens(messages, config.maxTokens),
      (messages) => this.addSystemPrompt(messages, config.systemPrompt)
    );
  }
  
  // Master: Functional pipeline pattern
  private async pipeline<T, R>(
    ...steps: Array<(input: any) => Promise<any> | any>
  ): Promise<R> {
    let result: any = undefined;
    for (const step of steps) {
      result = await step(result);
    }
    return result;
  }
}
```

## Master-Level Code Generation Rules

### When Generating Code
1. **Think First**: Understand the problem deeply
2. **Design**: Consider architecture và patterns
3. **Implement**: Write complete, production-ready code
4. **Optimize**: Consider performance implications
5. **Document**: Explain WHY, not just WHAT

### Code Quality Checklist
- ✅ Type-safe (no `any`, proper generics)
- ✅ Error handling (all error cases covered)
- ✅ Logging (structured, contextual)
- ✅ Performance (optimized hot paths)
- ✅ Security (tenant isolation, input validation)
- ✅ Testable (dependency injection, pure functions)
- ✅ Maintainable (clear, self-documenting)
- ✅ Scalable (handles growth)

## Master Reasoning Examples

### Example 1: Complex Feature Request
**User**: "Add support for voice messages"

**Master Reasoning Process**:
1. **Understand**: Voice messages need transcription, then normal flow
2. **Design**: 
   - Transcription service (async, can fail)
   - Fallback to text if transcription fails
   - Store audio file for later
   - Cost implications (transcription API)
3. **Implement**: Complete solution with all edge cases
4. **Optimize**: Batch transcription, cache results
5. **Consider**: Rate limits, storage costs, user experience

### Example 2: Performance Issue
**User**: "Messages are slow"

**Master Reasoning Process**:
1. **Diagnose**: Profile to find bottleneck
2. **Analyze**: 
   - Database queries (N+1? Missing indexes?)
   - AI API calls (sequential? Can parallelize?)
   - Network latency (can batch?)
3. **Optimize**: 
   - Add database indexes
   - Parallelize AI calls where possible
   - Implement caching
   - Use connection pooling
4. **Measure**: Verify improvements
5. **Document**: Explain optimizations

## Best Practices for Master-Level Code

### DO
- ✅ Think in systems, not components
- ✅ Consider multiple solution approaches
- ✅ Optimize for maintainability AND performance
- ✅ Write self-documenting code
- ✅ Handle all edge cases proactively
- ✅ Use advanced TypeScript features appropriately
- ✅ Profile before optimizing
- ✅ Document reasoning, not just implementation

### DON'T
- ❌ Don't optimize prematurely
- ❌ Don't over-engineer simple problems
- ❌ Don't ignore system implications
- ❌ Don't write code without understanding context
- ❌ Don't skip error handling
- ❌ Don't ignore performance implications
- ❌ Don't write code that only you understand

## Master-Level Intelligence Manifestation

When working on this codebase, AI should:
1. **Understand deeply** before coding
2. **Think systematically** about implications
3. **Design elegantly** with proper abstractions
4. **Implement completely** with all edge cases
5. **Optimize intelligently** based on actual needs
6. **Document clearly** explaining reasoning
7. **Suggest improvements** when appropriate
8. **Learn from codebase** and apply patterns consistently

**Goal**: Write code that a senior engineer with 10+ years experience would write, with deep understanding of AI/chatbot systems, Node.js/TypeScript mastery, and systems thinking.
