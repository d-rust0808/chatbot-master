---
alwaysApply: true
---

# Code Quality & Best Practices

## TypeScript Standards

### Type Safety
- **MUST**: Strict TypeScript mode enabled
- **MUST**: No `any` types (use `unknown` if needed)
- **MUST**: Explicit return types cho public functions
- **MUST**: Use Prisma generated types

### Example:
```typescript
// ✅ GOOD
async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

// ❌ BAD
async function getUserById(id: any): Promise<any> {
  return prisma.user.findUnique({ where: { id } });
}
```

## Code Style

### Naming Conventions
- **Variables/Functions**: `camelCase`
- **Classes/Interfaces**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `kebab-case.ts`
- **Private members**: Prefix với `_` (optional, consistent)

### Comments
- **WHY comments**: Explain business logic, not obvious code
- **JSDoc**: Required cho public APIs, complex functions
- **TODO comments**: Include issue/ticket reference

```typescript
/**
 * WHY: Calculate tenant usage để enforce rate limits
 * 
 * @param tenantId - Tenant identifier
 * @param period - Time period (day/week/month)
 * @returns Usage statistics
 */
async function calculateTenantUsage(
  tenantId: string,
  period: 'day' | 'week' | 'month'
): Promise<UsageStats> {
  // Implementation
}
```

## Code Organization

### Function Rules
1. **Single Responsibility**: Mỗi function làm 1 việc
2. **Max 50 lines**: Nếu dài hơn, split thành smaller functions
3. **Max 5 parameters**: Nếu nhiều hơn, dùng object parameter
4. **Early returns**: Prefer early returns over nested ifs

### Example:
```typescript
// ✅ GOOD
async function processMessage(message: Message): Promise<void> {
  if (!message.content) {
    logger.warn('Empty message received');
    return;
  }
  
  const context = await retrieveContext(message);
  const response = await generateResponse(message, context);
  await sendResponse(message.chatId, response);
}

// ❌ BAD
async function processMessage(message: Message): Promise<void> {
  if (message.content) {
    const context = await retrieveContext(message);
    if (context) {
      const response = await generateResponse(message, context);
      if (response) {
        await sendResponse(message.chatId, response);
      }
    }
  }
}
```

## Error Handling

### Rules
1. **Never swallow errors**: Always log or handle
2. **Specific error types**: Use custom error classes
3. **Error context**: Include relevant context in error messages
4. **Graceful degradation**: Fallback khi có thể

### Example:
```typescript
class PlatformConnectionError extends Error {
  constructor(
    public platform: string,
    public reason: string,
    public originalError?: Error
  ) {
    super(`Failed to connect to ${platform}: ${reason}`);
    this.name = 'PlatformConnectionError';
  }
}

// Usage
try {
  await adapter.connect();
} catch (error) {
  logger.error('Connection failed', { platform, error });
  throw new PlatformConnectionError(platform, 'Network timeout', error);
}
```

## Performance Guidelines

### Database
- **Indexes**: Add indexes cho foreign keys và frequently queried fields
- **N+1 Queries**: Use `include` hoặc `select` để eager load
- **Pagination**: Always paginate large result sets

### Async/Await
- **Parallel operations**: Use `Promise.all()` khi có thể
- **Sequential operations**: Use `await` trong loop chỉ khi cần

```typescript
// ✅ GOOD - Parallel
const [user, tenant] = await Promise.all([
  getUserById(userId),
  getTenantById(tenantId)
]);

// ✅ GOOD - Sequential (when order matters)
for (const message of messages) {
  await processMessage(message);
}
```

## Security

### Input Validation
- **MUST**: Validate all inputs với Zod hoặc Joi
- **MUST**: Sanitize user inputs
- **MUST**: Use parameterized queries (Prisma handles this)

### Secrets
- **NEVER**: Commit secrets to git
- **MUST**: Use environment variables
- **MUST**: Encrypt sensitive data in database

## Testing Requirements

### Unit Tests
- Test business logic, services
- Mock external dependencies
- Target: 80%+ coverage cho critical paths

### Integration Tests
- Test API endpoints
- Test database operations
- Test platform adapters (mocked)

### Test Structure
```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when exists', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```
