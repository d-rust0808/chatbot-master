---
alwaysApply: true
---

# Root Cause Analysis & Intelligent Debugging

## Core Principle: Fix Root Cause, Not Symptoms

### The Golden Rule
- **NEVER**: Fix errors by hiding symptoms
- **MUST**: Understand WHY the error occurred
- **MUST**: Fix the underlying cause
- **MUST**: Prevent similar errors in the future

```typescript
// ❌ BAD - Fixing symptom
try {
  await sendMessage(chatId, message);
} catch (error) {
  // Just catch and ignore - DANGEROUS!
  logger.error('Error', error);
  // Message not sent, but no one knows why
}

// ✅ GOOD - Understanding root cause
try {
  await sendMessage(chatId, message);
} catch (error) {
  // Analyze WHY it failed
  if (error.code === 'RATE_LIMIT') {
    // Root cause: Rate limit exceeded
    // Fix: Implement proper rate limiting, queue system
    await messageQueue.enqueue({ chatId, message });
    return { queued: true };
  }
  
  if (error.code === 'CONNECTION_LOST') {
    // Root cause: Connection unstable
    // Fix: Implement reconnection logic, health checks
    await adapter.reconnect();
    throw new RetryableError('Connection lost, please retry');
  }
  
  // Log with full context for investigation
  logger.error('Failed to send message', {
    chatId,
    messageLength: message.length,
    error: error.message,
    stack: error.stack,
    platform: adapter.platform,
    connectionStatus: await adapter.getStatus(),
  });
  
  throw error; // Re-throw after analysis
}
```

## Root Cause Analysis Process

### Step 1: Understand the Error
- **MUST**: Read error message completely
- **MUST**: Check error stack trace
- **MUST**: Identify error type và category
- **MUST**: Understand error context

```typescript
// When seeing error, ask:
// 1. What is the error? (Type, message, code)
// 2. Where did it occur? (File, line, function)
// 3. When does it happen? (Always? Sometimes? Specific conditions?)
// 4. What was the state? (Inputs, system state, dependencies)

// Example analysis
const error = {
  type: 'TypeError',
  message: "Cannot read property 'id' of undefined",
  stack: '...at ConversationService.getConversationById (line 45)',
  context: {
    conversationId: 'conv_123',
    tenantId: 'tenant_456',
  },
};

// Root cause analysis:
// 1. Error: Trying to access .id on undefined
// 2. Location: ConversationService.getConversationById
// 3. Likely cause: Conversation not found in database
// 4. Why not found? Missing tenant filter? Wrong ID? Deleted?
```

### Step 2: Trace the Data Flow
- **MUST**: Follow data from input to error point
- **MUST**: Check each transformation step
- **MUST**: Verify assumptions at each step
- **MUST**: Identify where data becomes invalid

```typescript
// ❌ BAD - Just fix the immediate error
async function getConversation(id: string) {
  const conv = await prisma.conversation.findUnique({ where: { id } });
  return conv.id; // Error if conv is null
}

// ✅ GOOD - Trace and understand
async function getConversation(
  tenantId: string,
  conversationId: string
): Promise<Conversation> {
  // Step 1: Validate input
  if (!conversationId) {
    throw new ValidationError('Conversation ID is required');
  }
  
  // Step 2: Check tenant access
  const hasAccess = await validateTenantAccess(tenantId, conversationId);
  if (!hasAccess) {
    throw new ForbiddenError('No access to this conversation');
  }
  
  // Step 3: Query with proper filters
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      tenantId, // Root cause: Missing this filter before!
    },
  });
  
  // Step 4: Handle not found properly
  if (!conversation) {
    // Root cause analysis: Why not found?
    // - Wrong ID? (user error)
    // - Deleted? (check deletedAt)
    // - Tenant mismatch? (already checked above)
    throw new NotFoundError('Conversation not found');
  }
  
  return conversation;
}
```

### Step 3: Identify Root Cause
- **MUST**: Ask "Why?" 5 times (5 Whys technique)
- **MUST**: Distinguish between symptom và cause
- **MUST**: Consider system-level issues
- **MUST**: Check for missing validations

```typescript
// Example: 5 Whys Analysis

// Error: "Cannot connect to WhatsApp"

// Why 1: Connection timeout
// Why 2: Network issue? No, other platforms work
// Why 3: WhatsApp-specific? Check WhatsApp adapter
// Why 4: Session expired? Check session data
// Why 5: Session not restored properly? Root cause found!

// ✅ Fix root cause
class WhatsAppAdapter {
  async connect() {
    // Root cause: Session not restored on startup
    const session = await this.restoreSession();
    if (!session) {
      // Need to re-authenticate
      await this.initializeWithQR();
      return;
    }
    
    // Use restored session
    this.client = new Client({ session });
    await this.client.initialize();
  }
  
  private async restoreSession(): Promise<SessionData | null> {
    // Root cause fix: Properly restore session from database
    const connection = await prisma.platformConnection.findUnique({
      where: { id: this.connectionId },
    });
    
    if (!connection?.sessionData) {
      return null;
    }
    
    return this.decryptSession(connection.sessionData);
  }
}
```

### Step 4: Design Proper Fix
- **MUST**: Fix the root cause, not the symptom
- **MUST**: Consider impact on other parts
- **MUST**: Add preventive measures
- **MUST**: Add proper error handling

```typescript
// ❌ BAD - Symptom fix
async function processMessage(message: Message) {
  try {
    await aiService.generate(message);
  } catch (error) {
    // Just return empty string - hides the problem!
    return '';
  }
}

// ✅ GOOD - Root cause fix
async function processMessage(message: Message): Promise<string> {
  // Root cause analysis:
  // Error: AI service fails
  // Why? Rate limit? Invalid input? Service down?
  
  // Fix 1: Validate input first (prevent invalid requests)
  if (!message.content || message.content.trim().length === 0) {
    throw new ValidationError('Message content is required');
  }
  
  // Fix 2: Check rate limits (prevent rate limit errors)
  const rateLimit = await rateLimitService.check(message.tenantId);
  if (!rateLimit.allowed) {
    throw new RateLimitError('Rate limit exceeded', {
      retryAfter: rateLimit.retryAfter,
    });
  }
  
  // Fix 3: Handle service failures properly
  try {
    return await aiService.generate(message);
  } catch (error) {
    // Root cause: AI service failed
    // Why? Network? API key? Model unavailable?
    
    if (error.code === 'API_KEY_INVALID') {
      // Root cause: Invalid API key
      // Fix: Update API key, notify admin
      await notifyAdmin('AI API key invalid', { tenantId: message.tenantId });
      throw new ConfigurationError('AI service not configured properly');
    }
    
    if (error.code === 'RATE_LIMIT') {
      // Root cause: Rate limit (should have been caught above, but double-check)
      await rateLimitService.recordFailure(message.tenantId);
      throw new RateLimitError('AI service rate limit exceeded');
    }
    
    // Unknown error - log with full context for investigation
    logger.error('AI service failed', {
      messageId: message.id,
      tenantId: message.tenantId,
      error: error.message,
      stack: error.stack,
      aiProvider: aiService.provider,
    });
    
    // Fallback: Return helpful message instead of empty string
    return "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.";
  }
}
```

## Common Root Cause Patterns

### Pattern 1: Missing Validation
```typescript
// Symptom: "Cannot read property X of undefined"
// Root cause: Missing input validation

// ❌ BAD
function processUser(user: User) {
  return user.profile.name; // Error if profile is undefined
}

// ✅ GOOD - Fix root cause
function processUser(user: User) {
  // Root cause fix: Validate input
  if (!user) {
    throw new ValidationError('User is required');
  }
  
  if (!user.profile) {
    // Why no profile? Missing data? Should create default?
    throw new ValidationError('User profile is required');
  }
  
  return user.profile.name;
}
```

### Pattern 2: Missing Tenant Isolation
```typescript
// Symptom: "User sees other tenant's data"
// Root cause: Missing tenant filter in query

// ❌ BAD
async function getChatbots() {
  return prisma.chatbot.findMany(); // Returns ALL chatbots!
}

// ✅ GOOD - Fix root cause
async function getChatbots(tenantId: string) {
  // Root cause fix: Always filter by tenant
  return prisma.chatbot.findMany({
    where: { tenantId }, // Security fix
  });
}
```

### Pattern 3: Race Conditions
```typescript
// Symptom: "Duplicate entries" or "Inconsistent state"
// Root cause: Race condition, missing locks

// ❌ BAD
async function createConversation(data: ConversationData) {
  // Race condition: Multiple requests can create duplicates
  const existing = await prisma.conversation.findUnique({
    where: { chatId: data.chatId },
  });
  
  if (existing) return existing;
  
  return prisma.conversation.create({ data });
}

// ✅ GOOD - Fix root cause
async function createConversation(data: ConversationData) {
  // Root cause fix: Use database constraint + transaction
  return prisma.$transaction(async (tx) => {
    // Use unique constraint to prevent duplicates
    const existing = await tx.conversation.findUnique({
      where: { 
        platform_chatId: {
          platform: data.platform,
          chatId: data.chatId,
        },
      },
    });
    
    if (existing) return existing;
    
    return tx.conversation.create({ data });
  });
}
```

### Pattern 4: Resource Leaks
```typescript
// Symptom: "Memory leak" or "Too many connections"
// Root cause: Not cleaning up resources

// ❌ BAD
async function processMessages(messages: Message[]) {
  for (const message of messages) {
    const browser = await puppeteer.launch(); // Never closed!
    await browser.newPage();
    // ... process
  }
}

// ✅ GOOD - Fix root cause
async function processMessages(messages: Message[]) {
  for (const message of messages) {
    const browser = await puppeteer.launch();
    try {
      const page = await browser.newPage();
      // ... process
    } finally {
      // Root cause fix: Always clean up
      await browser.close();
    }
  }
}
```

## Debugging Workflow

### When You See an Error

1. **STOP**: Don't immediately try to fix
2. **READ**: Understand the error message completely
3. **TRACE**: Follow the code path to error
4. **ANALYZE**: Ask "Why did this happen?"
5. **IDENTIFY**: Find the root cause
6. **DESIGN**: Plan the proper fix
7. **IMPLEMENT**: Fix root cause, not symptom
8. **VERIFY**: Test that fix works
9. **PREVENT**: Add safeguards to prevent recurrence

### Debugging Checklist

```typescript
// When debugging, check:
// ✅ What is the actual error? (not just "it doesn't work")
// ✅ Where does it occur? (exact file, line, function)
// ✅ When does it happen? (always? sometimes? specific conditions?)
// ✅ What are the inputs? (validate assumptions)
// ✅ What is the system state? (dependencies, connections, cache)
// ✅ Is this a symptom or root cause?
// ✅ What would prevent this error?
// ✅ Are there similar issues elsewhere?
```

## Error Prevention Strategies

### Proactive Validation
- **MUST**: Validate inputs at boundaries
- **MUST**: Validate assumptions
- **MUST**: Check preconditions
- **MUST**: Verify dependencies

```typescript
// ✅ GOOD - Prevent errors before they happen
class MessageProcessor {
  async process(message: IncomingMessage): Promise<void> {
    // Prevent errors by validating early
    this.validateMessage(message);
    this.validateTenantAccess(message.tenantId);
    this.validatePlatformConnection(message.platform);
    
    // Now safe to process
    await this.processValidatedMessage(message);
  }
  
  private validateMessage(message: IncomingMessage): void {
    if (!message.content) {
      throw new ValidationError('Message content is required');
    }
    
    if (message.content.length > 4096) {
      throw new ValidationError('Message too long');
    }
    
    if (!message.chatId) {
      throw new ValidationError('Chat ID is required');
    }
  }
}
```

### Defensive Programming
- **MUST**: Handle null/undefined cases
- **MUST**: Check for edge cases
- **MUST**: Use optional chaining when appropriate
- **MUST**: Provide fallbacks

```typescript
// ✅ GOOD - Defensive programming
function getChatbotName(chatbot: Chatbot | null): string {
  // Root cause thinking: Why might chatbot be null?
  // - Not found? (should throw NotFoundError)
  // - Deleted? (should check deletedAt)
  // - Permission issue? (should check access)
  
  if (!chatbot) {
    throw new NotFoundError('Chatbot not found');
  }
  
  return chatbot.name || 'Unnamed Chatbot'; // Fallback for missing name
}
```

## Logging for Root Cause Analysis

### Structured Logging
- **MUST**: Log with full context
- **MUST**: Include error stack traces
- **MUST**: Log state before error
- **MUST**: Log relevant variables

```typescript
// ✅ GOOD - Logging that helps find root cause
try {
  await processMessage(message);
} catch (error) {
  logger.error('Failed to process message', {
    // Context for root cause analysis
    messageId: message.id,
    tenantId: message.tenantId,
    platform: message.platform,
    contentLength: message.content?.length,
    
    // Error details
    error: error.message,
    errorCode: error.code,
    stack: error.stack,
    
    // System state
    timestamp: new Date().toISOString(),
    processId: process.pid,
    memoryUsage: process.memoryUsage(),
    
    // Dependencies state
    aiServiceStatus: await aiService.getStatus(),
    platformAdapterStatus: await adapter.getStatus(),
  });
  
  throw error;
}
```

## Best Practices

### DO
- ✅ Always understand WHY error occurred
- ✅ Fix root cause, not symptoms
- ✅ Add validation to prevent errors
- ✅ Log with full context
- ✅ Test fixes thoroughly
- ✅ Add safeguards to prevent recurrence
- ✅ Document root cause analysis
- ✅ Consider system-wide implications

### DON'T
- ❌ Don't just catch and ignore errors
- ❌ Don't fix symptoms without understanding cause
- ❌ Don't add workarounds without fixing root cause
- ❌ Don't skip error analysis
- ❌ Don't hide errors from logs
- ❌ Don't assume error is "just a bug"
- ❌ Don't fix without understanding impact

## Root Cause Analysis Template

```typescript
/**
 * ROOT CAUSE ANALYSIS TEMPLATE
 * 
 * Error: [Describe error]
 * Location: [File, function, line]
 * 
 * Symptom: [What we see]
 * Root Cause: [Why it happens]
 * 
 * Analysis:
 * 1. What is the error? [Type, message]
 * 2. Where does it occur? [Exact location]
 * 3. When does it happen? [Conditions]
 * 4. Why does it happen? [Root cause]
 * 5. How to prevent? [Prevention strategy]
 * 
 * Fix:
 * - [What needs to be fixed]
 * - [How to fix it]
 * - [Prevention measures]
 * 
 * Verification:
 * - [How to test the fix]
 * - [Edge cases to check]
 */
```

## Example: Complete Root Cause Analysis

```typescript
// Error: "TypeError: Cannot read property 'id' of undefined"
// Location: ConversationService.getConversationById, line 45

// ❌ BAD - Just fix the immediate error
async function getConversationById(id: string) {
  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv) {
    return null; // Just return null - doesn't fix root cause
  }
  return conv;
}

// ✅ GOOD - Root cause analysis and fix
/**
 * ROOT CAUSE ANALYSIS:
 * 
 * Error: Cannot read property 'id' of undefined
 * Symptom: Code tries to access .id on undefined conversation
 * 
 * Root Cause Analysis:
 * 1. Why is conversation undefined?
 *    - Not found in database? (Wrong ID? Deleted?)
 *    - Missing tenant filter? (Security issue!)
 *    - Database connection issue?
 * 
 * 2. Why was tenant filter missing?
 *    - Function doesn't accept tenantId parameter
 *    - Security vulnerability - can access other tenants' data
 * 
 * 3. Why was this not caught earlier?
 *    - Missing input validation
 *    - Missing error handling
 *    - Missing tests
 * 
 * Fix:
 * 1. Add tenantId parameter (security fix)
 * 2. Add tenant filter to query (security fix)
 * 3. Add proper error handling
 * 4. Add validation
 * 5. Add tests
 */
async function getConversationById(
  tenantId: string,
  conversationId: string
): Promise<Conversation> {
  // Fix 1: Validate inputs
  if (!conversationId) {
    throw new ValidationError('Conversation ID is required');
  }
  
  if (!tenantId) {
    throw new ValidationError('Tenant ID is required');
  }
  
  // Fix 2: Add tenant filter (root cause fix)
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      tenantId, // Security fix - was missing!
    },
  });
  
  // Fix 3: Proper error handling
  if (!conversation) {
    // Why not found? Log for investigation
    logger.warn('Conversation not found', {
      conversationId,
      tenantId,
      // Check if exists without tenant filter (for debugging)
      existsWithoutTenant: await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true },
      }),
    });
    
    throw new NotFoundError('Conversation not found');
  }
  
  return conversation;
}
```

**Remember**: A good fix prevents the error from happening again, not just makes it go away temporarily.
