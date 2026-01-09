# API Documentation: Admin Balance Logs

## Tổng quan

API để hiển thị logs biến động số dư của từng admin (sp-admin). API trả về danh sách các transactions mà admin đã thực hiện (top-up actions) cho các users khác.

**Version:** v1  
**Provider:** cdudu  
**Quyền truy cập:** Chỉ `sp-admin` (Super Admin)

---

## GET /api/v1/admin/users/:adminId/balance-logs

### Mô tả
API lấy danh sách logs biến động số dư của một admin cụ thể. Bao gồm cả VND và Credit transactions mà admin đã thực hiện (top-up actions).

### Endpoint
```
GET /api/v1/admin/users/:adminId/balance-logs
```

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| adminId | string | Yes | ID của admin cần xem logs |

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | string | No | "1" | Số trang |
| limit | string | No | "50" | Số lượng items mỗi trang (max: 100) |
| startDate | string | No | - | Ngày bắt đầu (ISO 8601) |
| endDate | string | No | - | Ngày kết thúc (ISO 8601) |
| type | string | No | "all" | Loại transaction: "vnd", "credit", hoặc "all" |

### Response

#### Success (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "txn_vnd_123",
      "type": "vnd",
      "amount": 1000000,
      "reason": "Manual top-up by admin",
      "tenantId": "tenant_456",
      "tenantName": "Shop B",
      "createdAt": "2026-01-06T12:00:00.000Z",
      "referenceId": null,
      "metadata": {
        "adminUserId": "admin_123",
        "adminAction": true
      }
    },
    {
      "id": "txn_credit_456",
      "type": "credit",
      "amount": 5000,
      "reason": "Manual top-up by admin",
      "tenantId": "tenant_456",
      "tenantName": "Shop B",
      "createdAt": "2026-01-06T11:00:00.000Z",
      "referenceId": null,
      "metadata": {
        "adminUserId": "admin_123",
        "adminAction": true
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1,
    "admin": {
      "id": "admin_123",
      "email": "admin@example.com",
      "name": "Admin Name"
    }
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data[].id` | string | Transaction ID |
| `data[].type` | string | Loại transaction: "vnd" hoặc "credit" |
| `data[].amount` | number | Số tiền (VND hoặc Credit) |
| `data[].reason` | string | Lý do transaction |
| `data[].tenantId` | string | ID của tenant được nạp tiền |
| `data[].tenantName` | string | Tên tenant |
| `data[].createdAt` | string (ISO 8601) | Thời gian tạo transaction |
| `data[].referenceId` | string \| null | Reference ID (nếu có) |
| `data[].metadata` | object | Metadata của transaction (chứa adminUserId, adminAction) |
| `meta.page` | number | Trang hiện tại |
| `meta.limit` | number | Số items mỗi trang |
| `meta.total` | number | Tổng số transactions |
| `meta.totalPages` | number | Tổng số trang |
| `meta.admin` | object | Thông tin admin |

#### Error Responses

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
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**404 Not Found** - Admin không tồn tại
```json
{
  "error": {
    "message": "Admin not found",
    "statusCode": 404
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**403 Forbidden** - Không phải sp-admin
```json
{
  "error": {
    "message": "Forbidden - Super admin access required",
    "statusCode": 403
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**500 Internal Server Error**
```json
{
  "error": {
    "message": "Internal server error",
    "statusCode": 500
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

### Lưu ý

1. **Filter Logic:**
   - Chỉ trả về transactions có `metadata.adminUserId = adminId` và `metadata.adminAction = true`
   - Đây là các transactions mà admin thực hiện (top-up actions)

2. **Pagination:**
   - Transactions được merge từ cả VND và Credit
   - Sort theo `createdAt` desc
   - Pagination được áp dụng sau khi merge

3. **Date Range:**
   - `startDate` và `endDate` phải là ISO 8601 format
   - Nếu chỉ có `startDate`, lấy từ ngày đó đến hiện tại
   - Nếu chỉ có `endDate`, lấy từ đầu đến ngày đó

4. **Type Filter:**
   - `type=all`: Trả về cả VND và Credit transactions
   - `type=vnd`: Chỉ trả về VND transactions
   - `type=credit`: Chỉ trả về Credit transactions

### Example Usage

#### JavaScript/TypeScript
```typescript
interface BalanceLogsParams {
  page?: number;
  limit?: number;
  startDate?: string; // ISO 8601
  endDate?: string;   // ISO 8601
  type?: 'vnd' | 'credit' | 'all';
}

async function getAdminBalanceLogs(
  adminId: string,
  params?: BalanceLogsParams
) {
  const queryParams = new URLSearchParams();
  
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.type) queryParams.append('type', params.type);
  
  const response = await fetch(
    `/api/v1/admin/users/${adminId}/balance-logs?${queryParams}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

// Usage: Lấy tất cả logs
const allLogs = await getAdminBalanceLogs('admin_123');

// Usage: Lọc theo date range
const logs = await getAdminBalanceLogs('admin_123', {
  startDate: '2026-01-01T00:00:00Z',
  endDate: '2026-01-31T23:59:59Z',
  type: 'all',
});

// Usage: Chỉ lấy VND transactions
const vndLogs = await getAdminBalanceLogs('admin_123', {
  type: 'vnd',
  page: 1,
  limit: 20,
});
```

#### React Component Example
```tsx
import React, { useState, useEffect } from 'react';

interface BalanceLog {
  id: string;
  type: 'vnd' | 'credit';
  amount: number;
  reason: string;
  tenantId: string;
  tenantName: string;
  createdAt: string;
  metadata: any;
}

interface AdminBalanceLogsProps {
  adminId: string;
}

const AdminBalanceLogs: React.FC<AdminBalanceLogsProps> = ({ adminId }) => {
  const [logs, setLogs] = useState<BalanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [type, setType] = useState<'vnd' | 'credit' | 'all'>('all');

  useEffect(() => {
    loadLogs();
  }, [adminId, page, type]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/admin/users/${adminId}/balance-logs?page=${page}&limit=20&type=${type}`,
        {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to load logs');
      
      const data = await response.json();
      setLogs(data.data);
      setTotalPages(data.meta.totalPages);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, type: string) => {
    if (type === 'vnd') {
      return `${amount.toLocaleString()} VND`;
    }
    return `${amount.toLocaleString()} Credits`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <div>
      <h2>Balance Logs</h2>
      
      <div>
        <label>
          Type:
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="all">All</option>
            <option value="vnd">VND</option>
            <option value="credit">Credit</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Tenant</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>{log.type.toUpperCase()}</td>
                  <td>{formatAmount(log.amount, log.type)}</td>
                  <td>{log.tenantName}</td>
                  <td>{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminBalanceLogs;
```

#### cURL
```bash
# Lấy tất cả logs
curl -X GET "https://cchatbot.pro/api/v1/admin/users/admin_123/balance-logs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Lọc theo date range và type
curl -X GET "https://cchatbot.pro/api/v1/admin/users/admin_123/balance-logs?startDate=2026-01-01T00:00:00Z&endDate=2026-01-31T23:59:59Z&type=all&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Chỉ lấy VND transactions
curl -X GET "https://cchatbot.pro/api/v1/admin/users/admin_123/balance-logs?type=vnd" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## UI/UX Recommendations

### Danh sách Logs

1. **Hiển thị:**
   - Table với columns: Date, Type, Amount, Tenant, Reason
   - Sort theo Date (mặc định: newest first)
   - Color coding:
     - VND: Màu xanh lá
     - Credit: Màu xanh dương

2. **Filtering:**
   - Dropdown để chọn type (All/VND/Credit)
   - Date range picker
   - Search by tenant name

3. **Pagination:**
   - Hiển thị page numbers
   - Previous/Next buttons
   - Show total count

4. **Export:**
   - Button để export logs ra CSV/Excel
   - Include all filters applied

---

## Testing Checklist

- [ ] Lấy logs thành công
- [ ] Pagination hoạt động đúng
- [ ] Date range filter hoạt động
- [ ] Type filter hoạt động (vnd/credit/all)
- [ ] Admin không tồn tại → error 404
- [ ] Không phải sp-admin → error 403
- [ ] Validation errors (invalid type, invalid date format)
- [ ] Empty result khi không có transactions
- [ ] Merge VND và Credit transactions đúng
- [ ] Sort theo createdAt desc đúng

---

## Changelog

### Version 1.0.0 (2026-01-06)

**Added:**
- API mới: GET /api/v1/admin/users/:adminId/balance-logs
- Support pagination, date range filter, type filter
- Merge VND và Credit transactions

