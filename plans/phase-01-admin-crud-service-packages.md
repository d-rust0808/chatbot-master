# Phase 01: Admin CRUD Service Packages

## Context

- **Date**: 2026-01-09
- **Priority**: High
- **Status**: In Progress
- **Dependencies**: None

## Overview

Tạo API cho admin (sp-admin) để quản lý service packages: Create, Read, Update, Delete.

## Key Insights

- Đã có model `ServicePackage` trong schema
- Đã có purchase/subscription logic
- Cần CRUD APIs cho admin
- Cần role check: `requireSuperAdmin` hoặc `requireAdmin`

## Requirements

1. **Create Service Package**
   - POST `/api/v1/admin/service-packages`
   - Body: `{ name, description, service, pricePerMonth, minDuration, features?, isActive? }`
   - Auth: Super Admin only

2. **Get All Service Packages** (Admin)
   - GET `/api/v1/admin/service-packages`
   - Query: `?service=whatsapp&isActive=true`
   - Auth: Admin

3. **Get Service Package by ID**
   - GET `/api/v1/admin/service-packages/:id`
   - Auth: Admin

4. **Update Service Package**
   - PUT `/api/v1/admin/service-packages/:id`
   - Body: Same as create (all fields optional)
   - Auth: Super Admin only

5. **Delete Service Package**
   - DELETE `/api/v1/admin/service-packages/:id`
   - Soft delete: Set `isActive = false` (không hard delete)
   - Auth: Super Admin only

## Architecture

```
Admin Routes (requireSuperAdmin)
├── POST   /admin/service-packages        → createServicePackage
├── GET    /admin/service-packages        → getAllServicePackages (admin)
├── GET    /admin/service-packages/:id    → getServicePackageById
├── PUT    /admin/service-packages/:id    → updateServicePackage
└── DELETE /admin/service-packages/:id    → deleteServicePackage (soft)
```

## Related Code Files

- `prisma/schema.prisma` - ServicePackage model
- `src/services/service-package/service-package.service.ts` - Existing service
- `src/controllers/service-package/service-package.controller.ts` - Existing controller
- `src/routes/service-package/service-package.routes.ts` - Existing routes
- `src/middleware/role-check.ts` - requireSuperAdmin, requireAdmin

## Implementation Steps

1. ✅ Create admin service methods in `service-package.service.ts`
2. ✅ Create admin controller handlers in `service-package.controller.ts`
3. ✅ Create admin routes in new file `admin-service-package.routes.ts`
4. ✅ Register routes in `routes/index.ts`
5. ✅ Add validation schemas
6. ✅ Test APIs

## Todo List

- [ ] Add `createServicePackage` service method
- [ ] Add `getAllServicePackages` service method (admin view)
- [ ] Add `getServicePackageById` service method
- [ ] Add `updateServicePackage` service method
- [ ] Add `deleteServicePackage` service method (soft delete)
- [ ] Create admin controller handlers
- [ ] Create admin routes file
- [ ] Register admin routes
- [ ] Add validation schemas
- [ ] Test all endpoints

## Success Criteria

- ✅ Admin can create service packages
- ✅ Admin can view all service packages
- ✅ Admin can update service packages
- ✅ Admin can soft delete service packages
- ✅ Only super admin can create/update/delete
- ✅ Regular admin can view
- ✅ All APIs return proper error messages

## Risk Assessment

- **Low Risk**: Standard CRUD operations
- **Security**: Role-based access control required

## Security Considerations

- Super Admin only for create/update/delete
- Admin can view
- Validate all inputs
- Soft delete (không hard delete)

## Next Steps

After Phase 01:
- Phase 02: Image upload support
- Phase 03: Active subscriptions API for sidebar

