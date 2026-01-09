# Plan: Admin Balance Logs API

## Overview

Tạo API để hiển thị logs biến động số dư của từng admin (sp-admin). API sẽ query các transactions mà admin thực hiện (top-up actions) từ cả VND và Credit transactions.

**Status:** In Progress  
**Priority:** High  
**Created:** 2026-01-06

## Phases

- [Phase 1: Research & Design](phase-01-research-design.md) - ✅ Completed
- [Phase 2: Implementation](phase-02-implementation.md) - 🔄 In Progress
- [Phase 3: Testing](phase-03-testing.md) - ⏳ Pending
- [Phase 4: Documentation](phase-04-documentation.md) - ⏳ Pending

## Key Requirements

1. API endpoint: `GET /api/v1/admin/users/:adminId/balance-logs`
2. Query transactions với `metadata.adminUserId = adminId` và `metadata.adminAction = true`
3. Merge cả VND và Credit transactions
4. Support pagination, date range filter
5. Chỉ sp-admin có quyền truy cập

## Success Criteria

- ✅ API trả về logs transactions của admin
- ✅ Support pagination và date range
- ✅ Merge VND và Credit transactions
- ✅ Proper error handling
- ✅ Tests pass
- ✅ Documentation complete

