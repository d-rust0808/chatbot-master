---
alwaysApply: true
---

# Architecture & Design Patterns

## Core Principles

### 1. Layered Architecture
- **Domain Layer**: Business logic, entities, domain services
- **Application Layer**: Use cases, orchestration, DTOs
- **Infrastructure Layer**: Database, external APIs, file system
- **Presentation Layer**: API routes, middleware, validation

**Structure**:
```
src/
├── domain/          # Business logic, entities
├── application/     # Use cases, services
├── infrastructure/  # Database, external services
└── api/            # Routes, controllers, middleware
```

### 2. Adapter Pattern (Platform Integration)
- Mỗi platform (WhatsApp, Facebook, etc.) phải implement `PlatformAdapter` interface
- Unified interface cho tất cả platforms
- Factory pattern để tạo adapters

**Example**:
```typescript
interface PlatformAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(chatId: string, message: string): Promise<void>;
  onMessage(callback: (message: Message) => void): void;
  getStatus(): Promise<ConnectionStatus>;
}
```

### 3. Dependency Injection
- Sử dụng constructor injection
- Không hardcode dependencies
- Dễ test và mock

### 4. Repository Pattern (Database)
- Abstract database access
- Prisma client được wrap trong repositories
- Mỗi domain entity có repository riêng

### 5. Service Layer Pattern
- Business logic trong services, không trong controllers
- Services orchestrate repositories và external services
- Controllers chỉ handle HTTP concerns

## Multi-Tenant Architecture

### Tenant Isolation
- **MUST**: Mọi database query phải filter theo `tenantId`
- **MUST**: Middleware validate tenant access trước khi vào route
- **MUST**: Không bao giờ expose data giữa tenants

### Implementation
- Tenant context từ JWT token hoặc header
- Middleware inject tenant vào request context
- Repositories tự động filter theo tenant

## Error Handling Strategy

### Error Types
1. **Domain Errors**: Business logic violations
2. **Infrastructure Errors**: Database, network failures
3. **Validation Errors**: Input validation failures
4. **Authentication Errors**: Auth failures

### Error Response Format
```typescript
{
  error: {
    code: string;      // Error code (e.g., "INVALID_INPUT")
    message: string;   // User-friendly message
    details?: any;     // Additional context
  }
}
```

## Code Organization Rules

1. **One file = One responsibility**
2. **File naming**: `kebab-case.ts` cho files, `PascalCase` cho classes
3. **Folder structure**: Group by feature/domain, not by type
4. **Barrel exports**: Use `index.ts` for clean imports
