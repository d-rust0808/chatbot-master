# AI Proxy Config Migration Plan

## Overview
Migrate AI proxy configuration từ hardcoded environment variables và hardcoded models sang System Config, cho phép SP-Admin quản lý qua API.

## Status
- Phase 1: System Config Setup - In Progress
- Phase 2: Model Management API - Pending
- Phase 3: Service Migration - Pending
- Phase 4: Logging System - Pending
- Phase 5: Testing & Verification - Pending

## Phases

### [Phase 1: System Config Setup](./phase-01-system-config-setup.md)
Thêm config keys cho PROXY_API_KEY, PROXY_API_BASE và AI models.

### [Phase 2: Model Management API](./phase-02-model-management-api.md)
Tạo API để CRUD models (thêm/sửa/xóa).

### [Phase 3: Service Migration](./phase-03-service-migration.md)
Sửa services để đọc từ System Config thay vì hardcode.

### [Phase 4: Logging System](./phase-04-logging-system.md)
Tạo logging system để track API calls.

### [Phase 5: Testing & Verification](./phase-05-testing-verification.md)
Test toàn bộ flow và verify.

