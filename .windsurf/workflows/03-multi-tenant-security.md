---
alwaysApply: true
---

# Multi-Tenant & Security

## Multi-Tenant Isolation (CRITICAL)

### Tenant Context
- **MUST**: Mọi request phải có tenant context
- **MUST**: Tenant được extract từ JWT token hoặc `X-Tenant-Id` header
- **MUST**: Middleware validate tenant access trước khi process request

### Database Queries
- **NEVER**: Query data mà không filter theo `tenantId`
- **MUST**: Mọi Prisma query phải include `where: { tenantId }`
- **MUST**: Repositories tự động inject tenant filter

**Example**:
```typescript
// ✅ GOOD - Repository tự động filter
class ConversationRepository {
  async findByTenant(tenantId: string, filters: FilterOptions) {
    return prisma.conversation.findMany({
      where: {
        tenantId, // ALWAYS include tenantId
        ...filters,
      },
    });
  }
}

// ❌ BAD - Missing tenant filter
async function getConversations() {
  return prisma.conversation.findMany(); // DANGEROUS!
}
```

### Tenant Validation
- **MUST**: Verify user has access to tenant before operations
- **MUST**: Check `TenantUser` relationship
- **MUST**: Reject requests nếu user không có quyền

```typescript
async function validateTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const tenantUser = await prisma.tenantUser.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });
  return !!tenantUser;
}
```

## Security Best Practices

### Authentication & Authorization
- **JWT Tokens**: 
  - Access token: Short-lived (15-30 min)
  - Refresh token: Long-lived (7-30 days), stored in httpOnly cookie
  - **MUST**: Validate token signature và expiration
- **Password Security**:
  - **MUST**: Hash với bcrypt (min 10 rounds)
  - **MUST**: Never log passwords
  - **MUST**: Enforce strong password policy

### Input Validation
- **MUST**: Validate ALL inputs với Zod schema
- **MUST**: Sanitize user inputs (prevent XSS)
- **MUST**: Validate file uploads (type, size, content)

```typescript
import { z } from 'zod';

const createChatbotSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(2000).optional(),
});

// Usage
const validated = createChatbotSchema.parse(req.body);
```

### SQL Injection Prevention
- **Prisma**: Automatically prevents SQL injection
- **NEVER**: Use raw SQL với user input
- **MUST**: Use Prisma query builder

### XSS Prevention
- **MUST**: Sanitize user-generated content
- **MUST**: Use template engines với auto-escaping
- **MUST**: Validate và sanitize HTML nếu cho phép

### Rate Limiting
- **MUST**: Implement rate limiting cho tất cả public endpoints
- **MUST**: Different limits cho different user roles
- **MUST**: Track rate limits per tenant

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});
```

### Secrets Management
- **NEVER**: Commit secrets to git
- **MUST**: Use environment variables
- **MUST**: Encrypt sensitive data in database (credentials, session data)
- **MUST**: Use `.env.example` để document required env vars

### CORS Configuration
- **MUST**: Configure CORS properly
- **MUST**: Whitelist specific origins (không dùng `*` trong production)
- **MUST**: Include credentials nếu cần

```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  optionsSuccessStatus: 200,
};
```

## Data Privacy

### GDPR Compliance
- **MUST**: Encrypt PII (Personally Identifiable Information)
- **MUST**: Implement data deletion requests
- **MUST**: Log data access (audit trail)
- **MUST**: Get consent before storing user data

### Data Encryption
- **At Rest**: Encrypt sensitive fields (credentials, session data)
- **In Transit**: Always use HTTPS/TLS
- **Database**: Consider encrypting entire database hoặc sensitive columns

## Security Headers

### HTTP Security Headers
- **MUST**: Set security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000`

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

## Platform Credentials Security

### Storage
- **MUST**: Encrypt credentials trước khi lưu vào database
- **MUST**: Use encryption key từ environment variable
- **MUST**: Never log credentials

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

function encryptCredentials(data: object): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  // ... encryption logic
}

function decryptCredentials(encrypted: string): object {
  // ... decryption logic
}
```

### Session Data
- **MUST**: Encrypt browser session data (cookies, localStorage)
- **MUST**: Store securely, không expose trong logs
- **MUST**: Implement session expiration
