# Phase 2: Implementation

**Status:** 🔄 In Progress  
**Date:** 2026-01-06

## Overview

Implement API endpoint để query và trả về balance logs của admin.

## Implementation Steps

### Step 1: Add Handler in admin.controller.ts

- [x] Create validation schema
- [ ] Create handler function
- [ ] Query VNDTransaction với metadata filter
- [ ] Query CreditTransaction với metadata filter
- [ ] Merge transactions
- [ ] Enrich với tenant/user info
- [ ] Return paginated response

### Step 2: Add Route

- [ ] Add route in admin.routes.ts
- [ ] Ensure sp-admin middleware

### Step 3: Error Handling

- [ ] Validate adminId exists
- [ ] Handle no transactions found
- [ ] Handle database errors

## Todo List

- [ ] Create `getAdminBalanceLogsSchema` validation
- [ ] Create `getAdminBalanceLogsHandler` function
- [ ] Implement VNDTransaction query with metadata filter
- [ ] Implement CreditTransaction query with metadata filter
- [ ] Merge and sort transactions
- [ ] Enrich with tenant/user information
- [ ] Add pagination support
- [ ] Add date range filter
- [ ] Add type filter (vnd/credit/all)
- [ ] Add route
- [ ] Test handler

## Success Criteria

- Handler returns correct data structure
- Pagination works
- Date range filter works
- Type filter works
- Error handling works
- Only sp-admin can access

