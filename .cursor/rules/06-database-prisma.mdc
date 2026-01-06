---
alwaysApply: true
---

# Database & Prisma Best Practices

## Prisma Client Usage

### Singleton Pattern
- **MUST**: Use single Prisma client instance (singleton)
- **MUST**: Import from `src/infrastructure/database.ts`
- **NEVER**: Create multiple PrismaClient instances

```typescript
// ✅ GOOD - Import singleton
import { prisma } from '../infrastructure/database';

// ❌ BAD - Don't create new instances
const prisma = new PrismaClient();
```

### Connection Management
- **MUST**: Handle graceful shutdown
- **MUST**: Disconnect on application exit
- **MUST**: Use connection pooling (Prisma handles this)

## Query Patterns

### Tenant Isolation (CRITICAL)
- **MUST**: ALWAYS include `tenantId` in WHERE clause
- **MUST**: Never query across tenants
- **MUST**: Validate tenant access before queries

```typescript
// ✅ GOOD - Always filter by tenantId
async function getConversations(tenantId: string) {
  return prisma.conversation.findMany({
    where: { tenantId },
  });
}

// ❌ BAD - Missing tenant filter
async function getConversations() {
  return prisma.conversation.findMany(); // DANGEROUS!
}
```

### Eager Loading
- **MUST**: Use `include` hoặc `select` để avoid N+1 queries
- **MUST**: Only select fields cần thiết

```typescript
// ✅ GOOD - Eager load relations
const conversation = await prisma.conversation.findUnique({
  where: { id },
  include: {
    messages: {
      take: 50,
      orderBy: { createdAt: 'desc' },
    },
    chatbot: true,
  },
});

// ❌ BAD - N+1 query problem
const conversation = await prisma.conversation.findUnique({ where: { id } });
const messages = await prisma.message.findMany({ where: { conversationId: id } });
```

### Pagination
- **MUST**: Always paginate large result sets
- **MUST**: Use cursor-based pagination cho large datasets
- **MUST**: Set reasonable limits (default: 50, max: 100)

```typescript
// ✅ GOOD - Pagination
async function getMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 50
) {
  const skip = (page - 1) * limit;
  
  return prisma.message.findMany({
    where: { conversationId },
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}
```

### Transactions
- **MUST**: Use transactions cho multi-step operations
- **MUST**: Keep transactions short
- **MUST**: Handle rollback on errors

```typescript
// ✅ GOOD - Transaction
await prisma.$transaction(async (tx) => {
  const conversation = await tx.conversation.create({ data: conversationData });
  await tx.message.create({ data: { ...messageData, conversationId: conversation.id } });
  return conversation;
});
```

## Database Schema Rules

### Naming Conventions
- **Tables**: `snake_case` (Prisma maps to `PascalCase` models)
- **Fields**: `camelCase` in Prisma, `snake_case` in database
- **Relations**: Clear, descriptive names

### Indexes
- **MUST**: Add indexes cho foreign keys
- **MUST**: Add indexes cho frequently queried fields
- **MUST**: Add composite indexes cho multi-field queries

```prisma
model Message {
  id             String   @id @default(cuid())
  conversationId String
  createdAt      DateTime @default(now())
  
  conversation Conversation @relation(fields: [conversationId], references: [id])
  
  @@index([conversationId, createdAt]) // Composite index
  @@map("messages")
}
```

### Relations
- **MUST**: Define relations explicitly
- **MUST**: Use `onDelete: Cascade` cho dependent records
- **MUST**: Use `onDelete: Restrict` cho critical relations

```prisma
model Conversation {
  messages Message[]
  
  // Cascade delete messages when conversation deleted
}

model Tenant {
  chatbots Chatbot[]
  
  // Restrict delete if chatbots exist
}
```

## Data Validation

### Prisma Schema Validation
- **MUST**: Use appropriate types (String, Int, DateTime, Json)
- **MUST**: Add constraints (unique, required, default)
- **MUST**: Validate at schema level

```prisma
model User {
  email    String  @unique  // Unique constraint
  password String            // Required (no ?)
  name     String?           // Optional
  role     String  @default("user") // Default value
}
```

### Application-Level Validation
- **MUST**: Validate inputs với Zod trước khi save
- **MUST**: Sanitize data before storing
- **MUST**: Handle validation errors gracefully

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

// Validate before Prisma
const validated = createUserSchema.parse(input);
await prisma.user.create({ data: validated });
```

## Migration Best Practices

### Migration Strategy
- **MUST**: Review migrations trước khi apply
- **MUST**: Test migrations on staging first
- **MUST**: Backup database trước khi migrate
- **MUST**: Use descriptive migration names

```bash
# ✅ GOOD - Descriptive name
npx prisma migrate dev --name add_tenant_isolation_index

# ❌ BAD - Vague name
npx prisma migrate dev --name update
```

### Migration Rules
- **NEVER**: Delete migrations (create new ones to fix)
- **NEVER**: Modify existing migrations in production
- **MUST**: Keep migrations small và focused
- **MUST**: Test rollback scenarios

## Performance Optimization

### Query Optimization
- **MUST**: Use `select` để limit fields returned
- **MUST**: Avoid `select *` (use explicit fields)
- **MUST**: Use indexes effectively
- **MUST**: Monitor slow queries

```typescript
// ✅ GOOD - Select only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    // Don't select password
  },
});

// ❌ BAD - Select all fields
const users = await prisma.user.findMany();
```

### Connection Pooling
- **MUST**: Configure connection pool size
- **MUST**: Monitor connection usage
- **MUST**: Handle connection errors gracefully

```typescript
// In DATABASE_URL or Prisma config
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

### Caching Strategy
- **MUST**: Cache frequently accessed data (Redis)
- **MUST**: Invalidate cache on updates
- **MUST**: Use cache for read-heavy operations

```typescript
// Cache example
async function getChatbot(id: string) {
  const cacheKey = `chatbot:${id}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const chatbot = await prisma.chatbot.findUnique({ where: { id } });
  await redis.setex(cacheKey, 3600, JSON.stringify(chatbot));
  return chatbot;
}
```

## Error Handling

### Database Errors
- **MUST**: Handle Prisma errors specifically
- **MUST**: Provide user-friendly error messages
- **MUST**: Log errors với context

```typescript
try {
  await prisma.user.create({ data });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new Error('Email already exists');
    }
  }
  throw error;
}
```

## Best Practices Summary

### DO
- ✅ Always filter by tenantId
- ✅ Use transactions for multi-step operations
- ✅ Paginate large result sets
- ✅ Use indexes effectively
- ✅ Validate data before saving
- ✅ Handle errors gracefully
- ✅ Monitor query performance

### DON'T
- ❌ Don't query without tenant filter
- ❌ Don't create multiple PrismaClient instances
- ❌ Don't use `select *`
- ❌ Don't skip pagination
- ❌ Don't ignore N+1 query problems
- ❌ Don't modify production migrations
