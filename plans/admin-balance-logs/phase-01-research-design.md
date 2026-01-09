# Phase 1: Research & Design

**Status:** ✅ Completed  
**Date:** 2026-01-06

## Context

- Transactions được lưu trong `VNDTransaction` và `CreditTransaction` tables
- Metadata chứa `adminUserId` và `adminAction: true` khi admin thực hiện top-up
- Đã có services: `vndWalletService`, `creditService` với `getTransactionHistory` methods

## Key Insights

1. **Transaction Storage:**
   - VNDTransaction: `metadata.adminUserId`, `metadata.adminAction`
   - CreditTransaction: `metadata.adminUserId`, `metadata.adminAction`
   - Both have `tenantId`, `amount`, `reason`, `createdAt`

2. **Existing Services:**
   - `vndWalletService.getTransactionHistory()` - filter by tenantId
   - `creditService.getTransactionHistory()` - filter by tenantId
   - Need to extend to filter by adminUserId in metadata

3. **Query Strategy:**
   - Query VNDTransaction với `metadata->>'adminUserId' = adminId` và `metadata->>'adminAction' = 'true'`
   - Query CreditTransaction tương tự
   - Merge và sort by createdAt desc

## Architecture

### API Endpoint
```
GET /api/v1/admin/users/:adminId/balance-logs
```

### Query Parameters
- `page` (optional, default: 1)
- `limit` (optional, default: 50, max: 100)
- `startDate` (optional, ISO 8601)
- `endDate` (optional, ISO 8601)
- `type` (optional: 'vnd' | 'credit' | 'all', default: 'all')

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "txn_123",
      "type": "vnd" | "credit",
      "amount": 1000000,
      "reason": "Manual top-up by admin",
      "tenantId": "tenant_123",
      "tenantName": "Shop B",
      "targetUserId": "user_456",
      "targetUserName": "User Name",
      "createdAt": "2026-01-06T12:00:00Z",
      "metadata": { ... }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

## Related Code Files

- `src/controllers/admin/admin.controller.ts` - Add new handler
- `src/routes/admin.routes.ts` - Add route
- `src/services/wallet/vnd-wallet.service.ts` - May need to extend
- `src/services/wallet/credit.service.ts` - May need to extend
- `prisma/schema.prisma` - Transaction models

## Implementation Steps

1. Create handler `getAdminBalanceLogsHandler` in admin.controller.ts
2. Query VNDTransaction với filter metadata
3. Query CreditTransaction với filter metadata
4. Merge và enrich với tenant/user info
5. Add route in admin.routes.ts
6. Add validation schema
7. Add error handling

## Security Considerations

- Only sp-admin can access
- Validate adminId exists
- Sanitize query parameters
- Rate limiting

## Next Steps

→ [Phase 2: Implementation](phase-02-implementation.md)


