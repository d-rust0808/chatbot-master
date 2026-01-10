# Phase 01: Database Schema & Access Logging

**Status**: 🚧 In Progress  
**Priority**: High  
**Date**: 2024-01-09

## Context

Hiện tại hệ thống chỉ log vào Winston files, không có database table để query access logs. Cần tạo AccessLog model và middleware để log tất cả HTTP requests.

## Overview

- Tạo `AccessLog` model trong Prisma schema
- Tạo middleware để log requests vào database (async, non-blocking)
- Optimize với indexes cho performance

## Key Insights

- Logging phải async để không block requests
- Cần indexes cho IP, timestamp, statusCode để query nhanh
- Chỉ log essential data để tránh database bloat
- Support pagination cho large datasets

## Requirements

1. **AccessLog Model**:
   - IP address
   - Method, URL, path
   - Status code
   - Response time
   - User agent
   - Tenant ID (nếu có)
   - User ID (nếu authenticated)
   - Timestamp

2. **Logging Middleware**:
   - Async logging (không block request)
   - Extract IP từ headers (X-Forwarded-For, X-Real-IP)
   - Log sau khi response sent
   - Error handling (không break request nếu log fail)

3. **Performance**:
   - Indexes cho IP, timestamp, statusCode
   - Batch inserts nếu cần
   - Optional: Cleanup old logs (retention policy)

## Architecture

```
Request → Middleware → Process Request → Send Response → Log to DB (async)
```

## Related Code Files

- `prisma/schema.prisma` - Add AccessLog model
- `src/index.ts` - Add logging middleware
- `src/middleware/access-log.ts` - New middleware
- `src/services/access-log/access-log.service.ts` - New service

## Implementation Steps

1. ✅ Add AccessLog model to Prisma schema
2. ⏳ Create access log service
3. ⏳ Create logging middleware
4. ⏳ Integrate middleware into main app
5. ⏳ Run migration

## Todo List

- [ ] Add AccessLog model to schema
- [ ] Create access log service
- [ ] Create logging middleware
- [ ] Integrate middleware
- [ ] Run migration
- [ ] Test logging

## Success Criteria

✅ AccessLog model created  
✅ All HTTP requests logged to database  
✅ Logging doesn't block requests  
✅ Indexes created for performance

## Risk Assessment

- **Database size**: Access logs có thể lớn → Cần retention policy
- **Performance**: Logging phải async → Use queue hoặc fire-and-forget
- **Privacy**: Log user data → Follow GDPR, only log necessary data

## Security Considerations

- Không log sensitive data (passwords, tokens)
- Log IP addresses để track abuse
- Support data retention/deletion policies

## Next Steps

→ Phase 02: Suspicious IP Detection

