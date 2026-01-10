# Phase 03: Admin APIs & Integration

**Status**: ⏳ Pending  
**Priority**: High  
**Date**: 2024-01-09

## Context

Tạo APIs cho SP-Admin để:
- Xem access logs
- Xem suspicious IPs với recommendations
- Ban IP từ suspicious list
- Xem IP details

## Overview

- Access logs endpoints với filters
- Suspicious IPs endpoints
- Integration với IP management
- IP details endpoint

## Key Insights

- Reuse existing IP management APIs
- Add filters cho access logs
- Support pagination
- Real-time updates (optional)

## Requirements

1. **Access Logs API**:
   - GET `/sp-admin/access-logs` - List logs với filters
   - Filters: IP, date range, status code, method, path
   - Pagination support

2. **Suspicious IPs API**:
   - GET `/sp-admin/access-logs/suspicious` - Get suspicious IPs
   - GET `/sp-admin/access-logs/ip/:ipAddress` - Get IP details
   - POST `/sp-admin/access-logs/ip/:ipAddress/ban` - Ban from suspicious list

3. **Integration**:
   - Link suspicious IPs với IP management
   - One-click ban từ suspicious list

## Architecture

```
Admin UI → API Endpoints → Access Log Service → Database
                ↓
         IP Management Service
```

## Related Code Files

- `src/controllers/admin/access-log.controller.ts` - New
- `src/routes/admin.routes.ts` - Add routes
- `src/services/access-log/access-log.service.ts` - Update

## Implementation Steps

1. ⏳ Create access log controller
2. ⏳ Add routes
3. ⏳ Implement filters
4. ⏳ Add ban integration
5. ⏳ Test endpoints

## Todo List

- [ ] Create access log controller
- [ ] Add access logs routes
- [ ] Add suspicious IPs routes
- [ ] Add IP details route
- [ ] Add ban integration
- [ ] Test all endpoints

## Success Criteria

✅ All endpoints working  
✅ Filters working correctly  
✅ Pagination working  
✅ Ban integration working

## Risk Assessment

- **Performance**: Large datasets → Pagination, indexes
- **Security**: Admin-only access → Middleware checks

## Security Considerations

- Admin authentication required
- Rate limit endpoints
- Don't expose sensitive data

## Next Steps

→ Phase 04: Documentation

