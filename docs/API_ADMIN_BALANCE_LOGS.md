# Admin Balance Logs API Documentation

## Tổng quan

API để xem logs biến động số dư của admin. Có 2 endpoints:
1. **Xem logs của 1 admin cụ thể** - Chi tiết logs của một admin
2. **Xem logs của tất cả admins** - Tổng quan tất cả logs (sp-admin only)

## Base URL

Tất cả endpoints có base URL: `/api/v1`

## Authentication

Tất cả endpoints yêu cầu:
- **Authentication**: JWT token trong header `Authorization: Bearer <token>`
- **Role**: `sp-admin` (Super Admin)

---

## 1. Get Balance Logs for Specific Admin

### Endpoint

```
GET /sp-admin/users/:adminId/balance-logs
```

### Mô tả

Xem logs biến động số dư của một admin cụ thể. Bao gồm:
- Top-up actions mà admin thực hiện (nạp tiền cho user khác)
- Payments từ các tenants mà admin là owner (QR nạp tiền)

### Path Parameters

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `adminId` | string | ✅ Yes | ID của admin cần xem logs |

### Query Parameters

| Parameter | Type | Required | Default | Mô tả |
|-----------|------|----------|---------|-------|
| `page` | number | ❌ No | 1 | Số trang |
| `limit` | number | ❌ No | 50 | Số records mỗi trang (max: 100) |
| `startDate` | string (ISO date) | ❌ No | - | Filter từ ngày (format: `YYYY-MM-DD` hoặc ISO 8601) |
| `endDate` | string (ISO date) | ❌ No | - | Filter đến ngày (format: `YYYY-MM-DD` hoặc ISO 8601) |
| `type` | enum | ❌ No | `'all'` | Loại transaction: `'vnd'`, `'credit'`, hoặc `'all'` |

### Request Example

```bash
# Xem tất cả logs của admin
GET /api/v1/sp-admin/users/cmk2d852g00001138koog0ej6/balance-logs

# Xem logs VND trong tháng 1/2026
GET /api/v1/sp-admin/users/cmk2d852g00001138koog0ej6/balance-logs?type=vnd&startDate=2026-01-01&endDate=2026-01-31

# Xem logs với pagination
GET /api/v1/sp-admin/users/cmk2d852g00001138koog0ej6/balance-logs?page=2&limit=20
```

### Response Format

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "txn_123",
      "type": "vnd",
      "amount": 100000,
      "reason": "Manual top-up by admin",
      "tenant": {
        "id": "tenant_123",
        "name": "Shop A"
      },
      "createdAt": "2026-01-09T10:30:00.000Z"
    },
    {
      "id": "txn_456",
      "type": "vnd",
      "amount": 50000,
      "reason": "Nạp tiền qua Sepay - Mã GD: ABC12345",
      "tenant": {
        "id": "tenant_123",
        "name": "Shop A"
      },
      "createdAt": "2026-01-09T09:15:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1,
    "admin": {
      "id": "cmk2d852g00001138koog0ej6",
      "email": "admin@example.com",
      "name": "Admin User"
    }
  }
}
```

#### Error Responses

**404 Not Found** - Admin không tồn tại
```json
{
  "error": {
    "message": "Admin not found",
    "statusCode": 404
  }
}
```

**400 Bad Request** - Validation error
```json
{
  "error": {
    "message": "Validation error",
    "statusCode": 400,
    "details": [
      {
        "path": ["type"],
        "message": "Invalid enum value. Expected 'vnd' | 'credit' | 'all'"
      }
    ]
  }
}
```

**401 Unauthorized** - Missing hoặc invalid token
```json
{
  "error": {
    "message": "Unauthorized",
    "statusCode": 401
  }
}
```

**403 Forbidden** - Không có quyền sp-admin
```json
{
  "error": {
    "message": "Super admin access required",
    "statusCode": 403
  }
}
```

---

## 2. Get All Admin Balance Logs

### Endpoint

```
GET /sp-admin/balance-logs
```

### Mô tả

Xem logs biến động số dư của **TẤT CẢ** admins. Sp-admin có thể:
- Xem tất cả top-up actions của tất cả admins
- Xem tất cả payments từ tất cả tenants
- Filter theo adminId cụ thể (optional)

### Query Parameters

| Parameter | Type | Required | Default | Mô tả |
|-----------|------|----------|---------|-------|
| `page` | number | ❌ No | 1 | Số trang |
| `limit` | number | ❌ No | 50 | Số records mỗi trang (max: 100) |
| `startDate` | string (ISO date) | ❌ No | - | Filter từ ngày (format: `YYYY-MM-DD` hoặc ISO 8601) |
| `endDate` | string (ISO date) | ❌ No | - | Filter đến ngày (format: `YYYY-MM-DD` hoặc ISO 8601) |
| `type` | enum | ❌ No | `'all'` | Loại transaction: `'vnd'`, `'credit'`, hoặc `'all'` |
| `adminId` | string | ❌ No | - | Filter theo adminId cụ thể (optional) |

### Request Examples

```bash
# Xem tất cả logs của tất cả admins
GET /api/v1/sp-admin/balance-logs

# Filter theo adminId cụ thể
GET /api/v1/sp-admin/balance-logs?adminId=cmk2d852g00001138koog0ej6

# Xem logs VND trong tháng 1/2026 của một admin
GET /api/v1/sp-admin/balance-logs?type=vnd&adminId=cmk2d852g00001138koog0ej6&startDate=2026-01-01&endDate=2026-01-31

# Xem logs với pagination
GET /api/v1/sp-admin/balance-logs?page=2&limit=20
```

### Response Format

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "txn_123",
      "type": "vnd",
      "amount": 100000,
      "reason": "Manual top-up by admin",
      "tenant": {
        "id": "tenant_123",
        "name": "Shop A"
      },
      "admin": {
        "id": "admin_123",
        "email": "admin1@example.com",
        "name": "Admin 1"
      },
      "isPayment": false,
      "isTopUp": true,
      "paymentCode": null,
      "createdAt": "2026-01-09T10:30:00.000Z"
    },
    {
      "id": "txn_456",
      "type": "vnd",
      "amount": 50000,
      "reason": "Nạp tiền qua Sepay - Mã GD: ABC12345",
      "tenant": {
        "id": "tenant_456",
        "name": "Shop B"
      },
      "admin": null,
      "isPayment": true,
      "isTopUp": false,
      "paymentCode": "ABC12345",
      "createdAt": "2026-01-09T09:15:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "filter": {
      "adminId": null,
      "type": "all"
    }
  }
}
```

#### Response Fields

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | string | Transaction ID |
| `type` | `'vnd'` \| `'credit'` | Loại transaction |
| `amount` | number | Số tiền (positive = nạp, negative = trừ) |
| `reason` | string | Lý do transaction |
| `tenant` | object \| null | Thông tin tenant (id, name) |
| `admin` | object \| null | Thông tin admin (id, email, name) - chỉ có khi là top-up action |
| `isPayment` | boolean | `true` nếu là payment (QR nạp tiền) |
| `isTopUp` | boolean | `true` nếu là top-up action |
| `paymentCode` | string \| null | Mã giao dịch payment (nếu là payment) |
| `createdAt` | string (ISO date) | Thời gian tạo transaction |

#### Error Responses

Tương tự như endpoint 1 (404, 400, 401, 403)

---

## Use Cases

### Use Case 1: Xem logs của một admin cụ thể

**Scenario:** Sp-admin muốn xem tất cả hoạt động nạp tiền của admin A

```typescript
// Frontend code example
const getAdminLogs = async (adminId: string) => {
  const response = await fetch(
    `/api/v1/sp-admin/users/${adminId}/balance-logs?type=all`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const data = await response.json();
  return data;
};
```

### Use Case 2: Xem tổng quan tất cả logs

**Scenario:** Sp-admin muốn xem dashboard tổng quan tất cả hoạt động nạp tiền

```typescript
// Frontend code example
const getAllLogs = async (filters?: {
  page?: number;
  limit?: number;
  adminId?: string;
  startDate?: string;
  endDate?: string;
  type?: 'vnd' | 'credit' | 'all';
}) => {
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.adminId) params.append('adminId', filters.adminId);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.type) params.append('type', filters.type);
  
  const response = await fetch(
    `/api/v1/sp-admin/balance-logs?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const data = await response.json();
  return data;
};
```

### Use Case 3: Filter logs theo admin và thời gian

**Scenario:** Sp-admin muốn xem logs của admin A trong tháng 1/2026

```typescript
const getFilteredLogs = async () => {
  const response = await fetch(
    `/api/v1/sp-admin/balance-logs?adminId=admin_123&startDate=2026-01-01&endDate=2026-01-31&type=all`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const data = await response.json();
  return data;
};
```

---

## Data Flow

### Top-up Action Flow

1. Sp-admin thực hiện top-up cho user → Tạo VND/Credit transaction
2. Transaction metadata:
   ```json
   {
     "adminUserId": "admin_id_who_did_topup",
     "adminAction": true,
     "targetUserId": "user_id_received_topup"
   }
   ```
3. Transaction xuất hiện trong balance logs với `isTopUp: true`

### Payment Flow (QR nạp tiền)

1. Shop nạp tiền qua QR → Payment completed → Tạo VND transaction
2. Transaction metadata:
   ```json
   {
     "paymentCode": "ABC12345",
     "paymentAmount": 50000,
     "webhookData": {...}
   }
   ```
3. Transaction xuất hiện trong balance logs với `isPayment: true` (nếu admin là owner của tenant)

---

## Notes

### 1. Phân biệt Top-up vs Payment

- **Top-up**: Admin nạp tiền cho user → `isTopUp: true`, có `admin` object
- **Payment**: Shop nạp tiền qua QR → `isPayment: true`, có `paymentCode`

### 2. Filter Logic

- **Endpoint 1** (`/users/:adminId/balance-logs`): 
  - Chỉ hiển thị logs của admin đó
  - Bao gồm: top-up actions của admin + payments từ tenants mà admin là owner

- **Endpoint 2** (`/balance-logs`):
  - Hiển thị logs của tất cả admins
  - Nếu có `adminId` filter: chỉ hiển thị logs của admin đó (tương tự endpoint 1)

### 3. Pagination

- Default: `page=1`, `limit=50`
- Max limit: `100`
- Response bao gồm `meta.totalPages` để frontend có thể hiển thị pagination

### 4. Date Filter

- Format: ISO 8601 hoặc `YYYY-MM-DD`
- `startDate`: >= (inclusive)
- `endDate`: <= (inclusive)
- Nếu chỉ có `startDate`: từ ngày đó đến hiện tại
- Nếu chỉ có `endDate`: từ đầu đến ngày đó

### 5. Type Filter

- `'vnd'`: Chỉ VND transactions
- `'credit'`: Chỉ Credit transactions
- `'all'`: Cả VND và Credit (default)

---

## Frontend Implementation Guide

### 1. Setup API Client

```typescript
// api/admin.ts
const API_BASE = '/api/v1';

export const adminBalanceLogsApi = {
  // Get logs for specific admin
  getAdminLogs: async (
    adminId: string,
    params?: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      type?: 'vnd' | 'credit' | 'all';
    }
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.type) queryParams.append('type', params.type);
    
    const response = await fetch(
      `${API_BASE}/sp-admin/users/${adminId}/balance-logs?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  },
  
  // Get all admin logs
  getAllAdminLogs: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: 'vnd' | 'credit' | 'all';
    adminId?: string; // Optional filter
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.adminId) queryParams.append('adminId', params.adminId);
    
    const response = await fetch(
      `${API_BASE}/sp-admin/balance-logs?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  },
};
```

### 2. React Component Example

```typescript
// components/AdminBalanceLogs.tsx
import { useState, useEffect } from 'react';
import { adminBalanceLogsApi } from '@/api/admin';

interface BalanceLog {
  id: string;
  type: 'vnd' | 'credit';
  amount: number;
  reason: string;
  tenant: { id: string; name: string } | null;
  admin: { id: string; email: string; name: string } | null;
  isPayment: boolean;
  isTopUp: boolean;
  paymentCode: string | null;
  createdAt: string;
}

export function AdminBalanceLogs({ adminId }: { adminId?: string }) {
  const [logs, setLogs] = useState<BalanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: 'all' as 'vnd' | 'credit' | 'all',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = adminId
        ? await adminBalanceLogsApi.getAdminLogs(adminId, {
            page,
            limit: 50,
            ...filters,
          })
        : await adminBalanceLogsApi.getAllAdminLogs({
            page,
            limit: 50,
            adminId: filters.adminId,
            ...filters,
          });
      
      setLogs(data.data);
      setTotalPages(data.meta.totalPages);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters, adminId]);

  return (
    <div>
      {/* Filters */}
      <div className="filters">
        <select
          value={filters.type}
          onChange={(e) =>
            setFilters({ ...filters, type: e.target.value as any })
          }
        >
          <option value="all">Tất cả</option>
          <option value="vnd">VND</option>
          <option value="credit">Credit</option>
        </select>
        
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) =>
            setFilters({ ...filters, startDate: e.target.value })
          }
          placeholder="Từ ngày"
        />
        
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) =>
            setFilters({ ...filters, endDate: e.target.value })
          }
          placeholder="Đến ngày"
        />
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Loại</th>
            <th>Số tiền</th>
            <th>Lý do</th>
            <th>Tenant</th>
            <th>Admin</th>
            <th>Loại giao dịch</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
              <td>{log.type.toUpperCase()}</td>
              <td>
                {log.amount > 0 ? '+' : ''}
                {log.amount.toLocaleString('vi-VN')} VNĐ
              </td>
              <td>{log.reason}</td>
              <td>{log.tenant?.name || '-'}</td>
              <td>{log.admin?.name || '-'}</td>
              <td>
                {log.isTopUp && 'Top-up'}
                {log.isPayment && `Payment (${log.paymentCode})`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Trước
        </button>
        <span>
          Trang {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  );
}
```

---

## Testing

### Test với cURL

```bash
# Test endpoint 1: Get logs của admin cụ thể
curl -X GET \
  "https://api.example.com/api/v1/sp-admin/users/admin_123/balance-logs?type=all&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test endpoint 2: Get tất cả logs
curl -X GET \
  "https://api.example.com/api/v1/sp-admin/balance-logs?type=all&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test với filter adminId
curl -X GET \
  "https://api.example.com/api/v1/sp-admin/balance-logs?adminId=admin_123&type=vnd" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Changelog

- **2026-01-09**: 
  - ✅ Fix top-up handler: Lưu đúng adminId của người thực hiện top-up
  - ✅ Fix balance logs: Hiển thị cả payments (QR nạp tiền) từ tenants
  - ✅ Thêm endpoint mới: `GET /sp-admin/balance-logs` để xem tất cả logs

---

## Support

Nếu có vấn đề, vui lòng:
1. Check server logs để xem request có đến server không
2. Verify JWT token có đúng role `sp-admin` không
3. Check network tab trong browser để xem request/response

