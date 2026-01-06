---
alwaysApply: true
---

# Advanced Intelligence & Superior Code Generation

## Meta-Cognitive Thinking (Thinking About Thinking)

### Pre-Code Analysis Phase
- **MUST**: Before writing ANY code, spend mental cycles analyzing
- **MUST**: Consider multiple approaches và evaluate trade-offs
- **MUST**: Think about future maintenance và extensibility
- **MUST**: Anticipate edge cases và failure modes

```typescript
// ❌ Naive: Just write code immediately
function sendMessage(chatId: string, message: string) {
  return adapter.sendMessage(chatId, message);
}

// ✅ Intelligent: Think first, then code
/**
 * INTELLIGENCE LAYERS:
 * 
 * Layer 1: What does user want?
 * - Send a message via platform adapter
 * 
 * Layer 2: What could go wrong?
 * - Rate limits, connection failures, invalid inputs
 * - Tenant isolation, authorization
 * - Cost implications, billing
 * 
 * Layer 3: What are the system implications?
 * - Message affects analytics
 * - Failure affects reliability metrics
 * - Success affects billing
 * 
 * Layer 4: What's the best design?
 * - Should be async (non-blocking)
 * - Should handle errors gracefully
 * - Should track metrics
 * - Should respect rate limits
 * - Should validate inputs
 * 
 * Layer 5: How to make it maintainable?
 * - Clear function signature
 * - Comprehensive error handling
 * - Structured logging
 * - Type safety
 */
async function sendMessage(
  tenantId: string,
  chatId: string,
  message: string,
  options?: SendMessageOptions
): Promise<MessageResult> {
  // Intelligence: Validate early (fail fast)
  this.validateInputs(tenantId, chatId, message);
  
  // Intelligence: Check authorization (security)
  await this.authorizeMessage(tenantId, chatId);
  
  // Intelligence: Check rate limits (prevent errors)
  const rateLimit = await this.checkRateLimit(tenantId);
  if (!rateLimit.allowed) {
    return this.handleRateLimit(chatId, message, rateLimit);
  }
  
  // Intelligence: Estimate cost (billing awareness)
  const costEstimate = await this.estimateCost(message);
  await this.verifyBilling(tenantId, costEstimate);
  
  // Intelligence: Send with retry (resilience)
  try {
    const result = await this.sendWithRetry(chatId, message, options);
    
    // Intelligence: Track success (analytics)
    await this.trackSuccess(tenantId, chatId, result, costEstimate);
    
    return result;
  } catch (error) {
    // Intelligence: Handle failure intelligently
    return this.handleFailure(tenantId, chatId, message, error);
  }
}
```

## Multi-Dimensional Problem Solving

### Consider All Dimensions
- **Functional**: Does it work?
- **Performance**: Is it fast enough?
- **Security**: Is it safe?
- **Maintainability**: Can others understand it?
- **Scalability**: Will it work at scale?
- **Cost**: Is it cost-effective?
- **User Experience**: Is it good for users?

```typescript
// ✅ Intelligent: Multi-dimensional solution
class IntelligentMessageProcessor {
  /**
   * INTELLIGENCE: Multi-dimensional optimization
   * 
   * Functional: Process messages correctly
   * Performance: Batch processing, caching
   * Security: Tenant isolation, input validation
   * Maintainability: Clear structure, good naming
   * Scalability: Queue system, horizontal scaling ready
   * Cost: Optimize AI calls, cache responses
   * UX: Fast responses, error recovery
   */
  async processMessage(
    tenantId: string,
    message: IncomingMessage
  ): Promise<ProcessedMessage> {
    // Performance: Check cache first
    const cacheKey = this.getCacheKey(message);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached; // Fast path
    }
    
    // Security: Validate và authorize
    await this.validateAndAuthorize(tenantId, message);
    
    // Cost: Check if we can afford AI call
    const canAfford = await this.checkBudget(tenantId);
    if (!canAfford) {
      return this.generateBudgetResponse(message);
    }
    
    // Performance: Batch similar requests
    const batched = await this.batchProcessor.add(message, {
      maxWait: 100, // Wait 100ms for batching
      maxSize: 10,
    });
    
    // Functional: Process intelligently
    const processed = await this.processBatch(batched);
    
    // Performance: Cache result
    await this.cache.set(cacheKey, processed, { ttl: 3600 });
    
    // Analytics: Track for insights
    await this.analytics.track('message_processed', {
      tenantId,
      processingTime: processed.duration,
      cost: processed.cost,
    });
    
    return processed;
  }
}
```

## Predictive Code Generation

### Anticipate Future Needs
- **MUST**: Generate code that's ready for future requirements
- **MUST**: Add hooks for extensibility
- **MUST**: Design for change
- **MUST**: Consider evolution path

```typescript
// ✅ Intelligent: Anticipate future needs
class ConversationManager {
  /**
   * INTELLIGENCE: Designed for evolution
   * 
   * Current: Simple conversation handling
   * Future: Multi-modal, voice, video, file sharing
   * 
   * Design: Plugin architecture for extensibility
   * Design: Event system for hooks
   * Design: Strategy pattern for different message types
   */
  private plugins: ConversationPlugin[] = [];
  private eventEmitter = new EventEmitter();
  
  async processMessage(
    conversationId: string,
    message: IncomingMessage
  ): Promise<OutgoingMessage> {
    // Intelligence: Allow plugins to intercept
    const intercepted = await this.runPlugins('before_process', message);
    if (intercepted) return intercepted;
    
    // Intelligence: Detect message type (anticipate future types)
    const messageType = this.detectMessageType(message);
    const processor = this.getProcessor(messageType);
    
    // Intelligence: Process with strategy pattern
    const response = await processor.process(message);
    
    // Intelligence: Allow plugins to modify
    const modified = await this.runPlugins('after_process', response);
    
    // Intelligence: Emit events for extensibility
    this.eventEmitter.emit('message_processed', {
      conversationId,
      message,
      response: modified,
    });
    
    return modified;
  }
  
  // Intelligence: Extensibility hook
  registerPlugin(plugin: ConversationPlugin): void {
    this.plugins.push(plugin);
  }
  
  // Intelligence: Future-proof message type detection
  private detectMessageType(message: IncomingMessage): MessageType {
    if (message.audio) return 'voice';
    if (message.video) return 'video';
    if (message.image) return 'image';
    if (message.file) return 'file';
    return 'text'; // Current default, but ready for expansion
  }
}
```

## Self-Optimizing Code Generation

### Automatic Optimization
- **MUST**: Generate optimized code by default
- **MUST**: Use appropriate data structures
- **MUST**: Minimize allocations
- **MUST**: Optimize hot paths

```typescript
// ✅ Intelligent: Self-optimizing code
class HighPerformanceMessageRouter {
  /**
   * INTELLIGENCE: Performance by design
   * 
   * - Use Map for O(1) lookups (not Array.find O(n))
   * - Pre-compile regex patterns
   * - Cache frequently accessed data
   * - Lazy load expensive operations
   * - Use object pooling for frequent allocations
   */
  private routeCache = new Map<string, Route>(); // O(1) lookup
  private compiledPatterns: CompiledPattern[] = []; // Pre-compiled
  private statsCache = new LRUCache<string, RouteStats>({ max: 1000 });
  
  findRoute(path: string): Route | null {
    // Intelligence: Fast path - exact match
    const exact = this.routeCache.get(path);
    if (exact) {
      this.updateStats(path, 'cache_hit');
      return exact;
    }
    
    // Intelligence: Optimized pattern matching
    for (const pattern of this.compiledPatterns) {
      if (pattern.test(path)) {
        // Intelligence: Cache successful matches
        this.routeCache.set(path, pattern.route);
        this.updateStats(path, 'pattern_match');
        return pattern.route;
      }
    }
    
    this.updateStats(path, 'not_found');
    return null;
  }
  
  // Intelligence: Lazy compilation
  private compilePattern(pattern: string): CompiledPattern {
    // Only compile when needed, then cache
    const cached = this.compiledCache.get(pattern);
    if (cached) return cached;
    
    const compiled = {
      regex: new RegExp(pattern),
      route: this.routes.find(r => r.pattern === pattern)!,
    };
    
    this.compiledCache.set(pattern, compiled);
    return compiled;
  }
}
```

## Intelligent Abstraction

### Create Smart Abstractions
- **MUST**: Abstract at the right level
- **MUST**: Hide complexity, expose simplicity
- **MUST**: Make common cases easy, complex cases possible
- **MUST**: Use composition over inheritance

```typescript
// ✅ Intelligent: Smart abstraction
/**
 * INTELLIGENCE: Perfect abstraction level
 * 
 * - Simple API for common use cases
 * - Powerful options for advanced use cases
 * - Type-safe with excellent IntelliSense
 * - Composable và extensible
 */
class IntelligentAIService {
  /**
   * Simple API for 90% of use cases
   */
  async chat(
    conversationId: string,
    message: string
  ): Promise<string> {
    return this.chatWithOptions(conversationId, message, {});
  }
  
  /**
   * Powerful API for advanced use cases
   * Intelligence: All options are optional với smart defaults
   */
  async chatWithOptions(
    conversationId: string,
    message: string,
    options: Partial<ChatOptions> = {}
  ): Promise<string> {
    // Intelligence: Merge với smart defaults
    const config = this.mergeWithDefaults(options);
    
    // Intelligence: Validate options
    this.validateOptions(config);
    
    // Intelligence: Build context intelligently
    const context = await this.buildContext(conversationId, config);
    
    // Intelligence: Select optimal provider
    const provider = this.selectProvider(config);
    
    // Intelligence: Generate with fallback
    return this.generateWithFallback(context, provider, config);
  }
  
  // Intelligence: Smart defaults based on context
  private mergeWithDefaults(options: Partial<ChatOptions>): ChatOptions {
    const defaults: ChatOptions = {
      model: 'gpt-3.5-turbo', // Cost-effective default
      temperature: 0.7, // Balanced creativity
      maxTokens: 1000, // Reasonable limit
      stream: false, // Simple by default
      retry: true, // Resilient by default
      fallback: true, // Reliable by default
    };
    
    // Intelligence: Adjust defaults based on tenant tier
    const tenant = await this.getTenant(options.tenantId);
    if (tenant.tier === 'premium') {
      defaults.model = 'gpt-4'; // Better quality for premium
      defaults.maxTokens = 2000; // More tokens
    }
    
    return { ...defaults, ...options };
  }
}
```

## Context-Aware Intelligence

### Understand Full Context
- **MUST**: Consider entire system context
- **MUST**: Understand business domain
- **MUST**: Know related code
- **MUST**: Generate code that fits naturally

```typescript
// ✅ Intelligent: Context-aware generation
/**
 * INTELLIGENCE: Generated with full context understanding
 * 
 * Context 1: This is a multi-tenant SaaS
 * - Must filter by tenantId everywhere
 * - Must check tenant access
 * 
 * Context 2: This is a chatbot system
 * - Messages are time-sensitive
 * - Need conversation context
 * - AI calls are expensive
 * 
 * Context 3: This uses PostgreSQL + Redis
 * - Use transactions for consistency
 * - Cache frequently accessed data
 * - Use connection pooling
 * 
 * Context 4: This integrates with multiple platforms
 * - Handle platform-specific errors
 * - Respect platform rate limits
 * - Support platform-specific features
 */
class ContextAwareMessageService {
  async handleIncomingMessage(
    tenantId: string,
    platform: PlatformType,
    message: PlatformMessage
  ): Promise<void> {
    // Intelligence: Context 1 - Multi-tenant
    await this.validateTenantAccess(tenantId);
    
    // Intelligence: Context 2 - Chatbot system
    const conversation = await this.getOrCreateConversation(
      tenantId,
      platform,
      message.chatId
    );
    
    // Intelligence: Context 3 - Database + Cache
    const chatbot = await this.getChatbotWithCache(
      tenantId,
      conversation.chatbotId
    );
    
    // Intelligence: Context 4 - Platform-specific
    const platformAdapter = this.platformManager.getAdapter(platform);
    if (!platformAdapter.isConnected()) {
      await this.handleDisconnectedPlatform(platform, tenantId);
      return;
    }
    
    // Intelligence: Save message in transaction
    await prisma.$transaction(async (tx) => {
      await tx.message.create({
        data: {
          conversationId: conversation.id,
          platform,
          messageId: message.id,
          direction: 'incoming',
          content: message.content,
        },
      });
      
      // Intelligence: Update conversation timestamp
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    });
    
    // Intelligence: Process with AI (expensive, so optimize)
    const response = await this.aiService.generateResponse(
      conversation.id,
      message.content,
      chatbot.id
    );
    
    // Intelligence: Send response via platform adapter
    await platformAdapter.sendMessage(message.chatId, response);
  }
}
```

## Learning from Patterns

### Pattern Recognition & Application
- **MUST**: Recognize patterns in codebase
- **MUST**: Apply patterns consistently
- **MUST**: Evolve patterns when needed
- **MUST**: Document pattern decisions

```typescript
// ✅ Intelligent: Learn và apply patterns
/**
 * INTELLIGENCE: Pattern recognition
 * 
 * Observed patterns in codebase:
 * 1. All services have tenantId as first parameter
 * 2. All database queries filter by tenantId
 * 3. All errors are logged with context
 * 4. All async functions have error handling
 * 5. All public methods have JSDoc
 * 
 * Applied patterns:
 * - Follow same structure
 * - Use same error handling
 * - Use same logging format
 * - Use same validation approach
 */
class PatternAwareService {
  /**
   * Pattern: TenantId first parameter
   * Pattern: JSDoc for public methods
   * Pattern: Error handling with context
   */
  async getResource(
    tenantId: string, // Pattern: First parameter
    resourceId: string
  ): Promise<Resource> {
    try {
      // Pattern: Validate tenant access
      await this.validateTenantAccess(tenantId);
      
      // Pattern: Filter by tenantId
      const resource = await prisma.resource.findFirst({
        where: {
          id: resourceId,
          tenantId, // Pattern: Always filter
        },
      });
      
      if (!resource) {
        throw new NotFoundError('Resource not found');
      }
      
      return resource;
    } catch (error) {
      // Pattern: Log with context
      logger.error('Failed to get resource', {
        tenantId,
        resourceId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}
```

## Intelligent Trade-offs

### Make Smart Decisions
- **MUST**: Understand trade-offs
- **MUST**: Choose based on context
- **MUST**: Document decisions
- **MUST**: Revisit when context changes

```typescript
// ✅ Intelligent: Smart trade-offs
/**
 * INTELLIGENCE: Trade-off analysis
 * 
 * Problem: How to handle conversation context?
 * 
 * Option 1: Load all messages every time
 *   Pros: Simple, always up-to-date
 *   Cons: Slow, expensive (database queries)
 *   Trade-off: Not scalable
 * 
 * Option 2: Cache in memory
 *   Pros: Fast, reduces database load
 *   Cons: Memory usage, cache invalidation complexity
 *   Trade-off: Good for high-traffic, but memory intensive
 * 
 * Option 3: Hybrid (chosen)
 *   Pros: Fast for recent, efficient for old
 *   Cons: More complex implementation
 *   Trade-off: Best balance of performance và memory
 * 
 * Decision: Option 3 - Hybrid approach
 * - Cache recent messages (last 50) in memory
 * - Load older messages from database when needed
 * - Use LRU cache with TTL
 */
class IntelligentConversationContext {
  private recentCache = new LRUCache<string, Message[]>({
    max: 1000, // 1000 conversations
    ttl: 3600000, // 1 hour
  });
  
  async getContext(
    conversationId: string,
    maxMessages: number = 50
  ): Promise<Message[]> {
    // Intelligence: Check cache first (fast path)
    const cached = this.recentCache.get(conversationId);
    if (cached && cached.length >= maxMessages) {
      return cached.slice(-maxMessages);
    }
    
    // Intelligence: Load from database (slower but accurate)
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: maxMessages,
    });
    
    // Intelligence: Update cache
    this.recentCache.set(conversationId, messages);
    
    return messages.reverse(); // Return chronological order
  }
}
```

## Self-Improving Suggestions

### Suggest Improvements
- **MUST**: Identify improvement opportunities
- **MUST**: Suggest with reasoning
- **MUST**: Consider impact
- **MUST**: Provide migration path

```typescript
// ✅ Intelligent: Self-improving suggestions
/**
 * INTELLIGENCE: Code review và improvement suggestions
 * 
 * When AI sees code, it should:
 * 1. Understand what it does
 * 2. Identify potential issues
 * 3. Suggest improvements with reasoning
 * 4. Consider impact và migration
 */

// Example: AI sees this code
async function getChatbots(tenantId: string) {
  return prisma.chatbot.findMany({ where: { tenantId } });
}

// AI should suggest:
/**
 * 💡 INTELLIGENCE SUGGESTION:
 * 
 * Current: Loads all chatbots for tenant
 * Issue: Could be slow for tenants with many chatbots
 * 
 * Suggestion: Add pagination
 * Reasoning:
 * - Better performance for large datasets
 * - Standard API practice
 * - Prevents memory issues
 * 
 * Impact: Low (backward compatible with default limit)
 * Migration: Easy (add optional pagination params)
 * 
 * Improved version:
 */
async function getChatbots(
  tenantId: string,
  options?: { page?: number; limit?: number }
): Promise<PaginatedResult<Chatbot>> {
  const page = options?.page || 1;
  const limit = Math.min(options?.limit || 50, 100); // Max 100
  const skip = (page - 1) * limit;
  
  const [chatbots, total] = await Promise.all([
    prisma.chatbot.findMany({
      where: { tenantId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.chatbot.count({ where: { tenantId } }),
  ]);
  
  return {
    data: chatbots,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

## Best Practices for Advanced Intelligence

### DO
- ✅ Think deeply before coding
- ✅ Consider multiple dimensions
- ✅ Anticipate future needs
- ✅ Optimize by default
- ✅ Create smart abstractions
- ✅ Understand full context
- ✅ Learn from patterns
- ✅ Make intelligent trade-offs
- ✅ Suggest improvements
- ✅ Document reasoning

### DON'T
- ❌ Don't code without thinking
- ❌ Don't ignore performance
- ❌ Don't ignore security
- ❌ Don't create over-complex abstractions
- ❌ Don't ignore context
- ❌ Don't ignore patterns
- ❌ Don't make decisions without reasoning
- ❌ Don't skip optimization opportunities

## Intelligence Manifestation Checklist

Before generating code, AI should:
1. ✅ Analyze the problem deeply
2. ✅ Consider multiple approaches
3. ✅ Evaluate trade-offs
4. ✅ Anticipate edge cases
5. ✅ Consider performance implications
6. ✅ Consider security implications
7. ✅ Consider maintainability
8. ✅ Consider scalability
9. ✅ Consider cost implications
10. ✅ Generate optimized code
11. ✅ Add proper error handling
12. ✅ Add comprehensive logging
13. ✅ Add type safety
14. ✅ Add documentation
15. ✅ Suggest improvements

**Goal**: Generate code that's not just working, but intelligent, optimized, maintainable, scalable, và production-ready from the first iteration.
