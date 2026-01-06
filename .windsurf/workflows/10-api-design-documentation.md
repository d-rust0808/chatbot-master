---
alwaysApply: true
---

# API Design & Documentation

## RESTful API Principles

### Endpoint Naming
- **MUST**: Use nouns, not verbs
- **MUST**: Use plural nouns for collections
- **MUST**: Use hierarchical structure
- **MUST**: Be consistent across all endpoints

```typescript
// ✅ GOOD
GET    /api/tenants/:tenantId/chatbots
POST   /api/tenants/:tenantId/chatbots
GET    /api/tenants/:tenantId/chatbots/:chatbotId
PUT    /api/tenants/:tenantId/chatbots/:chatbotId
DELETE /api/tenants/:tenantId/chatbots/:chatbotId

// ❌ BAD
GET    /api/getChatbots
POST   /api/createChatbot
GET    /api/chatbot/:id
```

### HTTP Methods
- **GET**: Retrieve resources (idempotent, safe)
- **POST**: Create resources
- **PUT**: Update entire resource (idempotent)
- **PATCH**: Partial update (idempotent)
- **DELETE**: Delete resources (idempotent)

### Status Codes
- **200 OK**: Successful GET, PUT, PATCH
- **201 Created**: Successful POST
- **204 No Content**: Successful DELETE
- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Missing/invalid auth
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict
- **500 Internal Server Error**: Server errors

## Request/Response Format

### Request Format
- **MUST**: Use JSON for request body
- **MUST**: Validate all inputs với Zod
- **MUST**: Include tenant context (from token or header)

```typescript
// Request example
POST /api/tenants/:tenantId/chatbots
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "name": "Customer Support Bot",
  "description": "Handles customer inquiries",
  "systemPrompt": "You are a helpful assistant",
  "aiModel": "gpt-3.5-turbo"
}
```

### Response Format
- **MUST**: Consistent response structure
- **MUST**: Include metadata (pagination, timestamps)
- **MUST**: Use error format consistently

```typescript
// Success response
{
  "data": {
    "id": "chatbot_123",
    "name": "Customer Support Bot",
    // ... other fields
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z"
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "field": "name",
      "reason": "Name is required"
    },
    "requestId": "req_123456"
  }
}

// List response with pagination
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

## API Versioning

### Version Strategy
- **MUST**: Include version in URL path
- **MUST**: Support multiple versions during transition
- **MUST**: Document breaking changes

```typescript
// Version in URL
/api/v1/chatbots
/api/v2/chatbots

// Or in header
Accept: application/vnd.api+json;version=1
```

## Authentication & Authorization

### Authentication
- **MUST**: Use JWT tokens
- **MUST**: Include in Authorization header
- **MUST**: Validate token on every request

```typescript
// Request with auth
GET /api/chatbots
Headers:
  Authorization: Bearer <jwt_token>
```

### Authorization
- **MUST**: Check tenant access
- **MUST**: Check user permissions
- **MUST**: Return 403 if unauthorized

## Input Validation

### Validation Rules
- **MUST**: Validate all inputs với Zod
- **MUST**: Return clear error messages
- **MUST**: Validate before processing

```typescript
import { z } from 'zod';

const createChatbotSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(2000).optional(),
  aiModel: z.enum(['gpt-3.5-turbo', 'gpt-4', 'gemini-pro', 'deepseek-chat']),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(1000),
});

// In controller
const validated = createChatbotSchema.parse(req.body);
```

## Pagination

### Pagination Format
- **MUST**: Support page-based pagination
- **MUST**: Include pagination metadata
- **MUST**: Set reasonable defaults

```typescript
// Query parameters
GET /api/chatbots?page=1&limit=50

// Response
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering & Sorting

### Filtering
- **MUST**: Support common filters
- **MUST**: Use query parameters
- **MUST**: Validate filter values

```typescript
// Filtering
GET /api/conversations?status=active&platform=whatsapp

// Sorting
GET /api/conversations?sort=createdAt&order=desc
```

## Error Handling

### Error Response Format
- **MUST**: Consistent error structure
- **MUST**: Include error code
- **MUST**: Include user-friendly message
- **MUST**: Include request ID for tracking

```typescript
{
  "error": {
    "code": "PLATFORM_CONNECTION_ERROR",
    "message": "Failed to connect to WhatsApp",
    "details": {
      "platform": "whatsapp",
      "reason": "Network timeout"
    },
    "requestId": "req_123456"
  }
}
```

## API Documentation

### Documentation Requirements
- **MUST**: Document all endpoints
- **MUST**: Include request/response examples
- **MUST**: Include error responses
- **MUST**: Document authentication

### OpenAPI/Swagger
- **MUST**: Generate OpenAPI spec
- **MUST**: Keep spec up-to-date
- **MUST**: Include examples

```typescript
/**
 * @swagger
 * /api/tenants/{tenantId}/chatbots:
 *   post:
 *     summary: Create a new chatbot
 *     tags: [Chatbots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChatbotRequest'
 *     responses:
 *       201:
 *         description: Chatbot created successfully
 */
```

## Rate Limiting

### Rate Limit Headers
- **MUST**: Include rate limit info in headers
- **MUST**: Return 429 when exceeded

```typescript
// Response headers
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200

// When exceeded
HTTP 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

## Best Practices

### DO
- ✅ Use RESTful conventions
- ✅ Validate all inputs
- ✅ Return consistent response format
- ✅ Include proper status codes
- ✅ Document all endpoints
- ✅ Handle errors gracefully
- ✅ Support pagination
- ✅ Include rate limit info

### DON'T
- ❌ Don't use verbs in URLs
- ❌ Don't skip validation
- ❌ Don't expose internal errors
- ❌ Don't ignore authentication
- ❌ Don't skip documentation
- ❌ Don't use inconsistent formats
