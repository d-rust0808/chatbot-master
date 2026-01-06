---
alwaysApply: true
---

# AI Intelligence & Smart Workflow

## Context Understanding (CRITICAL)

### Before Writing Code
- **MUST**: Đọc và hiểu toàn bộ codebase liên quan trước khi code
- **MUST**: Tìm existing patterns và conventions trong project
- **MUST**: Check existing implementations tương tự
- **MUST**: Hiểu business logic và domain requirements

### Codebase Exploration Strategy
```typescript
// ✅ GOOD - Explore before coding
// 1. Search for similar implementations
// 2. Check existing patterns
// 3. Understand dependencies
// 4. Then write code following existing patterns

// ❌ BAD - Code immediately without understanding
// Just write new code without checking existing code
```

### Pattern Recognition
- **MUST**: Identify và follow existing patterns
- **MUST**: Reuse existing utilities và helpers
- **MUST**: Match code style với existing code
- **MUST**: Use same naming conventions

**Example**:
```typescript
// If existing code uses:
class UserService {
  async getUserById(id: string): Promise<User | null> {
    // pattern
  }
}

// Then new code should follow:
class ChatbotService {
  async getChatbotById(id: string): Promise<Chatbot | null> {
    // same pattern
  }
}
```

## Smart Decision Making

### Architecture Decisions
- **MUST**: Consider trade-offs trước khi implement
- **MUST**: Choose solution phù hợp với existing architecture
- **MUST**: Avoid over-engineering
- **MUST**: Prefer consistency over "better" solutions

### When to Refactor vs When to Follow
- **Refactor**: Khi existing code có bug hoặc anti-pattern nghiêm trọng
- **Follow**: Khi existing code works, chỉ khác style nhỏ

```typescript
// ✅ GOOD - Follow existing pattern even if not perfect
// Existing code uses callback pattern
function processData(data: Data, callback: (result: Result) => void) {
  // ...
}

// New code should follow same pattern
function processMessage(msg: Message, callback: (result: Result) => void) {
  // ...
}

// ❌ BAD - Refactor to "better" pattern without reason
// Don't change to Promise-based just because it's "better"
```

## Automatic Code Generation

### Smart Code Completion
- **MUST**: Generate code dựa trên context và patterns
- **MUST**: Include error handling automatically
- **MUST**: Add logging automatically
- **MUST**: Follow TypeScript best practices

### Template-Based Generation
```typescript
// When user asks for "create service for X"
// AI should:
// 1. Check existing service patterns
// 2. Generate similar structure
// 3. Include tenant isolation
// 4. Add error handling
// 5. Add logging
// 6. Add JSDoc comments

// Example: Auto-generate ChatbotService
class ChatbotService {
  /**
   * WHY: Business logic for chatbot operations
   */
  async getChatbotById(
    tenantId: string,
    chatbotId: string
  ): Promise<Chatbot | null> {
    try {
      // Tenant isolation
      const chatbot = await prisma.chatbot.findFirst({
        where: {
          id: chatbotId,
          tenantId, // Always filter by tenant
        },
      });
      
      return chatbot;
    } catch (error) {
      logger.error('Failed to get chatbot', { tenantId, chatbotId, error });
      throw error;
    }
  }
}
```

## Intelligent Refactoring

### When to Refactor
- **MUST**: Refactor khi code violates rules (tenant isolation, security)
- **MUST**: Refactor khi có bug nghiêm trọng
- **MUST**: Refactor khi code không maintainable
- **MUST NOT**: Refactor chỉ vì "style preference"

### Refactoring Strategy
1. **Identify**: What needs refactoring và why
2. **Plan**: How to refactor without breaking existing code
3. **Test**: Ensure refactoring doesn't break functionality
4. **Document**: Explain why refactoring was needed

```typescript
// ✅ GOOD - Refactor with reason
// Problem: Missing tenant isolation (SECURITY ISSUE)
async function getChatbots() {
  return prisma.chatbot.findMany(); // DANGEROUS!
}

// Refactored:
async function getChatbots(tenantId: string) {
  return prisma.chatbot.findMany({
    where: { tenantId }, // Fixed security issue
  });
}

// ❌ BAD - Refactor without reason
// Existing code works fine, just different style
// Don't refactor just because
```

## Proactive Problem Solving

### Anticipate Issues
- **MUST**: Think about edge cases trước khi code
- **MUST**: Consider error scenarios
- **MUST**: Think about performance implications
- **MUST**: Consider security implications

### Example: Proactive Thinking
```typescript
// ❌ BAD - Naive implementation
async function sendMessage(chatId: string, message: string) {
  await adapter.sendMessage(chatId, message);
}

// ✅ GOOD - Proactive thinking
async function sendMessage(
  tenantId: string,
  chatId: string,
  message: string
) {
  // 1. Validate tenant access
  await validateTenantAccess(tenantId, chatId);
  
  // 2. Check rate limits
  await checkRateLimit(tenantId);
  
  // 3. Validate message
  if (!message || message.length > 4096) {
    throw new ValidationError('Invalid message');
  }
  
  // 4. Send with retry
  try {
    await retryWithBackoff(() => 
      adapter.sendMessage(chatId, message)
    );
    
    // 5. Log success
    logger.info('Message sent', { tenantId, chatId });
  } catch (error) {
    // 6. Handle errors
    logger.error('Failed to send message', { tenantId, chatId, error });
    throw new MessageSendError('Failed to send message', error);
  }
}
```

## Learning from Codebase

### Pattern Extraction
- **MUST**: Identify common patterns trong codebase
- **MUST**: Extract reusable patterns
- **MUST**: Apply patterns consistently

### Example Pattern Learning
```typescript
// Learn from existing code:
// Pattern 1: All services have tenantId parameter
// Pattern 2: All database queries filter by tenantId
// Pattern 3: All errors are logged with context
// Pattern 4: All async functions have error handling

// Apply learned patterns to new code automatically
```

## Smart Code Suggestions

### Suggest Improvements
- **MUST**: Suggest improvements khi thấy code có thể tốt hơn
- **MUST**: Suggest security fixes
- **MUST**: Suggest performance optimizations
- **MUST**: Explain WHY suggestion is better

### Example Suggestions
```typescript
// User writes:
const user = await prisma.user.findUnique({ where: { id } });

// AI should suggest:
// ⚠️ SECURITY: Missing tenant validation
// Consider: Verify user belongs to tenant before returning
// Suggestion:
const user = await prisma.user.findFirst({
  where: {
    id,
    tenants: {
      some: { tenantId }
    }
  }
});
```

## Context-Aware Code Generation

### Understand Full Context
- **MUST**: Understand file structure và dependencies
- **MUST**: Understand business domain
- **MUST**: Understand data flow
- **MUST**: Generate code that fits naturally

### Example: Context-Aware Generation
```typescript
// User: "Add function to get conversation messages"

// AI should:
// 1. Check existing conversation-related code
// 2. Understand conversation structure
// 3. Check if similar function exists
// 4. Generate code following existing patterns
// 5. Include tenant isolation
// 6. Include pagination
// 7. Include error handling

// Generated code:
async function getConversationMessages(
  tenantId: string,
  conversationId: string,
  page: number = 1,
  limit: number = 50
): Promise<Message[]> {
  // Validate tenant access
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      tenantId, // Tenant isolation
    },
  });
  
  if (!conversation) {
    throw new NotFoundError('Conversation');
  }
  
  // Pagination
  const skip = (page - 1) * limit;
  
  return prisma.message.findMany({
    where: { conversationId },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}
```

## Intelligent Testing

### Auto-Generate Tests
- **MUST**: Generate tests based on function logic
- **MUST**: Test happy paths và error cases
- **MUST**: Test edge cases
- **MUST**: Mock external dependencies

### Example: Smart Test Generation
```typescript
// Given function:
async function getChatbotById(tenantId: string, id: string) {
  return prisma.chatbot.findFirst({
    where: { id, tenantId },
  });
}

// AI should auto-generate:
describe('getChatbotById', () => {
  it('should return chatbot when exists and tenant matches', async () => {
    // Happy path
  });
  
  it('should return null when chatbot not found', async () => {
    // Not found case
  });
  
  it('should return null when tenant mismatch', async () => {
    // Security: tenant isolation
  });
  
  it('should handle database errors', async () => {
    // Error case
  });
});
```

## Workflow Optimization

### Batch Operations
- **MUST**: Group related changes together
- **MUST**: Complete full features, not partial
- **MUST**: Consider dependent changes

### Example: Smart Workflow
```typescript
// User: "Add endpoint to create chatbot"

// AI should do ALL of these in one go:
// 1. Create controller method
// 2. Create service method
// 3. Create route
// 4. Add validation schema
// 5. Add error handling
// 6. Add tests
// 7. Update API documentation

// Not just: "Here's the controller method"
```

## Best Practices for AI Intelligence

### DO
- ✅ Always explore codebase before coding
- ✅ Follow existing patterns strictly
- ✅ Think proactively about edge cases
- ✅ Generate complete, production-ready code
- ✅ Include error handling automatically
- ✅ Include logging automatically
- ✅ Include tenant isolation automatically
- ✅ Suggest improvements when appropriate
- ✅ Explain WHY, not just WHAT

### DON'T
- ❌ Don't code without understanding context
- ❌ Don't ignore existing patterns
- ❌ Don't generate incomplete code
- ❌ Don't skip error handling
- ❌ Don't skip security checks
- ❌ Don't refactor without reason
- ❌ Don't suggest changes without explanation

## Intelligence Checklist

Before generating any code, AI should:
1. ✅ Search for similar implementations
2. ✅ Understand existing patterns
3. ✅ Check dependencies
4. ✅ Consider security implications
5. ✅ Consider performance implications
6. ✅ Think about error cases
7. ✅ Think about edge cases
8. ✅ Generate complete solution
9. ✅ Include tests
10. ✅ Explain decisions
