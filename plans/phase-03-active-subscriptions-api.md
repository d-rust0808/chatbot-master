# Phase 03: Active Subscriptions API

## Context

- **Date**: 2026-01-09
- **Priority**: Medium
- **Status**: Pending
- **Dependencies**: Phase 01, Phase 02

## Overview

API để lấy active subscriptions cho sidebar - hiển thị dịch vụ đã đăng ký trong thời gian active.

## Key Insights

- Đã có `getTenantSubscriptions` nhưng cần optimize cho sidebar
- Cần filter: `status = 'active' AND endDate > now()`
- Cần format data phù hợp cho sidebar UI

## Requirements

1. **Get Active Subscriptions for Sidebar**
   - GET `/api/v1/service-packages/my-subscriptions`
   - Auth: Required
   - Response: List of active subscriptions với:
     - Service name
     - Platform (whatsapp, facebook, etc.)
     - Start date
     - End date
     - Days remaining
     - Status

2. **Check if Service is Active**
   - GET `/api/v1/service-packages/check/:service`
   - Auth: Required
   - Response: `{ isActive: boolean, subscription?: {...} }`

## Architecture

```
User Routes (authenticated)
├── GET /service-packages/my-subscriptions  → getMyActiveSubscriptions
└── GET /service-packages/check/:service    → checkServiceActive
```

## Related Code Files

- `src/services/service-package/service-package.service.ts` - Existing service
- `src/controllers/service-package/service-package.controller.ts` - Existing controller
- `src/routes/service-package/service-package.routes.ts` - Existing routes

## Implementation Steps

1. Enhance `getTenantSubscriptions` service method
2. Add `checkServiceActive` service method
3. Create controller handlers
4. Add routes
5. Test APIs

## Todo List

- [ ] Enhance getTenantSubscriptions for sidebar
- [ ] Add checkServiceActive method
- [ ] Create controller handlers
- [ ] Add routes
- [ ] Test APIs

## Success Criteria

- ✅ User can get active subscriptions for sidebar
- ✅ User can check if specific service is active
- ✅ Data formatted for sidebar UI
- ✅ Only active subscriptions returned

## Risk Assessment

- **Low Risk**: Read-only operations

## Security Considerations

- Tenant isolation (only own subscriptions)
- Auth required

## Next Steps

After Phase 03:
- Frontend integration
- Sidebar implementation

