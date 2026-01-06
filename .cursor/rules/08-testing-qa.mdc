---
alwaysApply: true
---

# Testing & Quality Assurance

## Testing Strategy

### Test Pyramid
- **Unit Tests**: 70% - Test individual functions, services
- **Integration Tests**: 20% - Test API endpoints, database operations
- **E2E Tests**: 10% - Test full workflows

### Test Types
1. **Unit Tests**: Fast, isolated, mock dependencies
2. **Integration Tests**: Test real database, external services (mocked)
3. **E2E Tests**: Test complete user flows
4. **Contract Tests**: Test API contracts

## Unit Testing

### Test Structure
- **Arrange**: Setup test data
- **Act**: Execute function
- **Assert**: Verify results

```typescript
describe('AIService', () => {
  describe('generateResponse', () => {
    it('should generate response with context', async () => {
      // Arrange
      const mockProvider = {
        generateResponse: jest.fn().mockResolvedValue({
          content: 'Test response',
          tokens: 100,
        }),
      };
      const service = new AIService(mockProvider);
      
      // Act
      const result = await service.generateResponse(
        'conv_123',
        'Hello',
        'chatbot_123'
      );
      
      // Assert
      expect(result).toBe('Test response');
      expect(mockProvider.generateResponse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Hello' }),
        ])
      );
    });
  });
});
```

### Mocking Best Practices
- **MUST**: Mock external dependencies (APIs, database)
- **MUST**: Use dependency injection for testability
- **MUST**: Mock at the boundary (external services, not internal)

```typescript
// ✅ GOOD - Mock external dependency
jest.mock('../infrastructure/database', () => ({
  prisma: {
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// ❌ BAD - Don't mock internal functions
jest.mock('./buildContext', () => ({
  buildContext: jest.fn(),
}));
```

### Test Coverage
- **MUST**: Aim for 80%+ coverage cho critical paths
- **MUST**: Test happy paths và error cases
- **MUST**: Test edge cases

```typescript
describe('validateTenantAccess', () => {
  it('should return true when user has access', async () => {
    // Happy path
  });
  
  it('should return false when user has no access', async () => {
    // Error case
  });
  
  it('should handle database errors', async () => {
    // Edge case
  });
});
```

## Integration Testing

### Database Tests
- **MUST**: Use test database (separate from dev/prod)
- **MUST**: Clean up after tests (truncate tables)
- **MUST**: Use transactions để rollback

```typescript
describe('ConversationRepository', () => {
  beforeEach(async () => {
    // Clean database
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
  });
  
  it('should create conversation with messages', async () => {
    const conversation = await createConversation({
      tenantId: 'tenant_123',
      chatbotId: 'chatbot_123',
    });
    
    expect(conversation).toBeDefined();
    expect(conversation.tenantId).toBe('tenant_123');
  });
});
```

### API Tests
- **MUST**: Test HTTP endpoints
- **MUST**: Test authentication/authorization
- **MUST**: Test request validation
- **MUST**: Test error responses

```typescript
describe('POST /api/conversations', () => {
  it('should create conversation', async () => {
    const response = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        chatbotId: 'chatbot_123',
        platform: 'whatsapp',
      })
      .expect(201);
    
    expect(response.body.id).toBeDefined();
  });
  
  it('should return 401 without token', async () => {
    await request(app)
      .post('/api/conversations')
      .send({})
      .expect(401);
  });
});
```

## E2E Testing

### Platform Integration Tests
- **MUST**: Test platform adapters (with mocked browser)
- **MUST**: Test message flow (receive → process → send)
- **MUST**: Test error recovery

```typescript
describe('WhatsApp Integration E2E', () => {
  it('should receive and respond to message', async () => {
    // Mock WhatsApp client
    const mockClient = createMockWhatsAppClient();
    
    // Simulate incoming message
    mockClient.emit('message', {
      from: '1234567890',
      body: 'Hello',
    });
    
    // Wait for response
    await waitFor(() => {
      expect(mockClient.send).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('response')
      );
    });
  });
});
```

## Test Utilities

### Test Helpers
- **MUST**: Create reusable test utilities
- **MUST**: Factory functions cho test data
- **MUST**: Mock builders

```typescript
// Test factories
export function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'user_123',
    email: 'test@example.com',
    password: 'hashed_password',
    ...overrides,
  };
}

export function createTestTenant(overrides?: Partial<Tenant>): Tenant {
  return {
    id: 'tenant_123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    ...overrides,
  };
}

// Mock builders
export function createMockAIProvider() {
  return {
    generateResponse: jest.fn(),
    streamResponse: jest.fn(),
  };
}
```

## Test Data Management

### Fixtures
- **MUST**: Use fixtures cho consistent test data
- **MUST**: Keep fixtures minimal và focused
- **MUST**: Clean up fixtures after tests

```typescript
// fixtures/conversations.ts
export const conversationFixtures = {
  active: {
    id: 'conv_active',
    tenantId: 'tenant_123',
    chatbotId: 'chatbot_123',
    status: 'active',
  },
  closed: {
    id: 'conv_closed',
    tenantId: 'tenant_123',
    chatbotId: 'chatbot_123',
    status: 'closed',
  },
};
```

## Performance Testing

### Load Testing
- **MUST**: Test API endpoints under load
- **MUST**: Test database queries performance
- **MUST**: Test concurrent requests

```typescript
describe('Performance Tests', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array.from({ length: 100 }, () =>
      request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
    );
    
    const start = Date.now();
    await Promise.all(requests);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // < 5 seconds
  });
});
```

## Test Organization

### File Structure
```
tests/
├── unit/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── integration/
│   ├── api/
│   └── database/
├── e2e/
│   └── workflows/
└── fixtures/
```

### Naming Conventions
- **Test files**: `*.test.ts` hoặc `*.spec.ts`
- **Test descriptions**: Clear, descriptive
- **Test groups**: Group related tests

```typescript
// ✅ GOOD - Clear naming
describe('AIService.generateResponse', () => {
  it('should return response when context is valid', () => {});
  it('should throw error when context is empty', () => {});
});

// ❌ BAD - Vague naming
describe('test', () => {
  it('works', () => {});
});
```

## Continuous Testing

### Pre-commit Hooks
- **MUST**: Run tests before commit
- **MUST**: Run linter before commit
- **MUST**: Run type check before commit

### CI/CD Integration
- **MUST**: Run tests on every PR
- **MUST**: Run tests on every push
- **MUST**: Fail build if tests fail

## Best Practices

### DO
- ✅ Write tests before fixing bugs (TDD when possible)
- ✅ Test both happy paths và error cases
- ✅ Use descriptive test names
- ✅ Keep tests isolated và independent
- ✅ Mock external dependencies
- ✅ Clean up test data
- ✅ Aim for high coverage on critical paths

### DON'T
- ❌ Don't test implementation details
- ❌ Don't write flaky tests
- ❌ Don't skip error case tests
- ❌ Don't use real external services in unit tests
- ❌ Don't ignore test failures
- ❌ Don't write tests that depend on each other
