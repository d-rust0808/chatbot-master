# Phase 02: Image Upload Support

## Context

- **Date**: 2026-01-09
- **Priority**: High
- **Status**: Pending
- **Dependencies**: Phase 01

## Overview

Thêm support upload image cho service packages sử dụng form-data (multipart/form-data).

## Key Insights

- Fastify có `@fastify/multipart` plugin
- Image lưu trong `public/uploads/service-packages/`
- Generate unique filename để tránh conflict
- Validate image type và size

## Requirements

1. **Upload Image**
   - POST `/api/v1/admin/service-packages/:id/upload-image`
   - Content-Type: `multipart/form-data`
   - Field: `image` (file)
   - Auth: Super Admin only
   - Response: `{ imageUrl: string }`

2. **Update Service Package with Image**
   - Include image upload trong create/update
   - Optional: có thể upload image riêng hoặc trong create/update

## Architecture

```
Admin Routes
├── POST /admin/service-packages/:id/upload-image  → uploadServicePackageImage
└── (Update create/update to support form-data)
```

## Related Code Files

- `src/routes/admin.routes.ts` - Admin routes
- `src/infrastructure/config.ts` - Config
- `public/uploads/` - Upload directory

## Implementation Steps

1. Install `@fastify/multipart` (if not installed)
2. Register multipart plugin
3. Create upload directory structure
4. Add image upload handler
5. Update create/update to support form-data
6. Add image validation (type, size)
7. Generate unique filenames
8. Test upload

## Todo List

- [ ] Install/check `@fastify/multipart`
- [ ] Register multipart plugin
- [ ] Create upload directory
- [ ] Add image upload handler
- [ ] Add image validation
- [ ] Update create/update endpoints
- [ ] Test image upload

## Success Criteria

- ✅ Admin can upload image via form-data
- ✅ Image saved to `public/uploads/service-packages/`
- ✅ Image URL returned in response
- ✅ Image validation (type, size)
- ✅ Unique filenames generated

## Risk Assessment

- **Medium Risk**: File upload security
- **Security**: Validate file type, size, sanitize filename

## Security Considerations

- Validate file type (jpg, png, webp)
- Limit file size (max 5MB)
- Sanitize filename
- Prevent path traversal
- Store outside web root (optional)

## Next Steps

After Phase 02:
- Phase 03: Active subscriptions API

