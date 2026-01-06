---
alwaysApply: true
---

# Error Handling & Resilience

## Error Classification

### Error Types
1. **Domain Errors**: Business logic violations
   - Example: Invalid chatbot configuration, unauthorized access
2. **Infrastructure Errors**: System failures
   - Example: Database connection lost, external API timeout
3. **Validation Errors**: Input validation failures
   - Example: Invalid email format, missing required fields
4. **Authentication Errors**: Auth failures
   - Example: Invalid token, expired session
5. **Platform Errors**: Platform-specific failures
   - Example: WhatsApp connection lost, rate limit exceeded

### Error Hierarchy
```typescript
// Base error class
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super('AUTH_ERROR', message, 401);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

class PlatformConnectionError extends AppError {
  constructor(
    public platform: string,
    reason: string,
    public originalError?: Error
  ) {
    super('PLATFORM_CONNECTION_ERROR', `Failed to connect to ${platform}: ${reason}`, 503);
  }
}
```

## Error Handling Patterns

### Try-Catch Best Practices
- **MUST**: Always catch và handle errors
- **MUST**: Log errors với context
- **MUST**: Provide meaningful error messages
- **MUST**: Never swallow errors silently

```typescript
// ✅ GOOD - Proper error handling
async function processMessage(message: Message): Promise<void> {
  try {
    const context = await buildContext(message);
    const response = await generateResponse(context);
    await sendResponse(message.chatId, response);
  } catch (error) {
    logger.error('Failed to process message', {
      messageId: message.id,
      error,
      stack: error.stack,
    });
    
    // Re-throw with context
    throw new MessageProcessingError(
      'Failed to process message',
      error
    );
  }
}

// ❌ BAD - Swallowing error
async function processMessage(message: Message): Promise<void> {
  try {
    await sendResponse(message.chatId, response);
  } catch (error) {
    // Silent failure - DANGEROUS!
  }
}
```

### Error Context
- **MUST**: Include relevant context in errors
- **MUST**: Include request ID, user ID, tenant ID
- **MUST**: Include operation details

```typescript
class ErrorContext {
  constructor(
    public requestId: string,
    public userId?: string,
    public tenantId?: string,
    public operation?: string
  ) {}
}

function createErrorWithContext(
  error: Error,
  context: ErrorContext
): AppError {
  return new AppError(
    'OPERATION_FAILED',
    error.message,
    500,
    {
      ...context,
      originalError: error.message,
    }
  );
}
```

## Retry Strategies

### Exponential Backoff
- **MUST**: Implement retry với exponential backoff
- **MUST**: Set max retry attempts
- **MUST**: Different strategies cho different error types

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
      
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
        error: error.message,
        delay,
      });
    }
  }
  
  throw lastError!;
}
```

### Retry Conditions
- **Retry**: Network errors, timeouts, rate limits (temporary)
- **Don't Retry**: Validation errors, authentication errors, not found errors

```typescript
function shouldRetry(error: Error): boolean {
  if (error instanceof ValidationError) return false;
  if (error instanceof AuthenticationError) return false;
  if (error instanceof NotFoundError) return false;
  
  // Retry network errors, timeouts
  if (error.message.includes('timeout')) return true;
  if (error.message.includes('ECONNREFUSED')) return true;
  
  return false;
}
```

## Circuit Breaker Pattern

### Implementation
- **Open**: Too many failures, stop trying
- **Half-Open**: Test connection periodically
- **Closed**: Normal operation

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextAttempt = Date.now();
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

## Graceful Degradation

### Fallback Strategies
- **Primary → Fallback**: Try primary, fallback to alternative
- **Cache Fallback**: Use cached data if available
- **Default Response**: Return safe default

```typescript
async function generateResponseWithFallback(
  conversationId: string,
  userMessage: string
): Promise<string> {
  try {
    // Try primary AI provider
    return await aiService.generateResponse(conversationId, userMessage);
  } catch (error) {
    logger.error('Primary AI failed', { error });
    
    // Fallback to cheaper model
    try {
      return await aiService.generateResponse(
        conversationId,
        userMessage,
        { model: 'gpt-3.5-turbo' } // Fallback model
      );
    } catch (fallbackError) {
      logger.error('Fallback AI failed', { error: fallbackError });
      
      // Last resort: default message
      return "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.";
    }
  }
}
```

## Error Logging

### Structured Logging
- **MUST**: Log errors với structured format
- **MUST**: Include error stack trace
- **MUST**: Include request context
- **MUST**: Include user/tenant context

```typescript
logger.error('Operation failed', {
  error: error.message,
  stack: error.stack,
  requestId: context.requestId,
  userId: context.userId,
  tenantId: context.tenantId,
  operation: 'processMessage',
  metadata: {
    messageId: message.id,
    platform: message.platform,
  },
});
```

### Error Levels
- **ERROR**: System errors, failures
- **WARN**: Recoverable errors, fallbacks
- **INFO**: Normal operations, important events
- **DEBUG**: Detailed debugging information

## Error Response Format

### API Error Response
```typescript
interface ErrorResponse {
  error: {
    code: string;        // Error code (e.g., "VALIDATION_ERROR")
    message: string;      // User-friendly message
    details?: any;        // Additional context
    requestId?: string;   // Request ID for tracking
  };
}

// Example
{
  "error": {
    "code": "PLATFORM_CONNECTION_ERROR",
    "message": "Failed to connect to WhatsApp: Network timeout",
    "details": {
      "platform": "whatsapp",
      "retryAfter": 60
    },
    "requestId": "req_123456"
  }
}
```

## Health Checks

### Health Check Endpoints
- **MUST**: Implement health check endpoints
- **MUST**: Check database, Redis, external services
- **MUST**: Return status of each component

```typescript
async function healthCheck(): Promise<HealthStatus> {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    aiProvider: await checkAIProvider(),
  };
  
  const isHealthy = Object.values(checks).every(c => c.status === 'healthy');
  
  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  };
}
```

## Best Practices

### DO
- ✅ Always catch và handle errors
- ✅ Log errors với context
- ✅ Use retry với exponential backoff
- ✅ Implement circuit breakers cho external services
- ✅ Provide fallback strategies
- ✅ Return user-friendly error messages
- ✅ Include request IDs for tracking

### DON'T
- ❌ Don't swallow errors silently
- ❌ Don't expose internal error details to users
- ❌ Don't retry on non-retryable errors
- ❌ Don't ignore error logs
- ❌ Don't use generic error messages
- ❌ Don't forget to clean up resources on errors
