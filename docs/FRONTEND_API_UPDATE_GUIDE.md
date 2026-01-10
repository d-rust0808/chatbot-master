# 📋 Hướng Dẫn Cập Nhật Frontend - API Response Format

## 🎯 Mục Đích

Document này mô tả các thay đổi về **API Response Format** mà frontend cần cập nhật để tương thích với backend mới.

---

## 🚨 THÔNG BÁO QUAN TRỌNG - CẬP NHẬT MỚI (2024)

### ⚠️ THAY ĐỔI THỨ TỰ RESPONSE FORMAT

**Backend đã cập nhật thứ tự các field trong response:**

**TRƯỚC (cũ):**
```json
{
  "data": {...},
  "status": 200,
  "message": "..."
}
```

**SAU (mới - hiện tại):**
```json
{
  "status": 200,
  "message": "...",
  "data": {...}
}
```

**⚠️ Frontend cần cập nhật:**
- Thứ tự field không ảnh hưởng đến logic (vì dùng object key access)
- Nhưng cần đảm bảo code đọc đúng field: `response.status`, `response.message`, `response.data`
- TypeScript types đã được cập nhật trong `frontend-types.ts`

---

## 📌 Tổng Quan Thay Đổi

### ⚠️ BREAKING CHANGES

Backend đã chuẩn hóa response format cho **TẤT CẢ** API endpoints. Frontend cần cập nhật cách xử lý response.

---

## 🔄 Response Format Mới

### ✅ Success Response Format

**⚠️ UPDATE (2024): Response format đã được cập nhật - status và message đứng TRƯỚC data**

**Cấu trúc mới:**
```typescript
interface SuccessResponse<T> {
  status: number;             // HTTP status code (200, 201, etc.) - ĐỨNG ĐẦU
  message: string;             // Thông báo thành công - THỨ HAI
  data: T;                    // Dữ liệu chính - THỨ BA
  api_version: string;        // "v1"
  provider: string;            // "cdudu"
  meta?: Record<string, any>; // Metadata (pagination, filters, etc.) - Optional
}
```

**Ví dụ:**
```json
{
  "status": 201,
  "message": "Admin user created successfully",
  "data": {
    "id": "user_123",
    "email": "admin@example.com",
    "name": "Admin User"
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Ví dụ với pagination:**
```json
{
  "status": 200,
  "message": "Success",
  "data": [
    { "id": "user_1", "email": "user1@example.com" },
    { "id": "user_2", "email": "user2@example.com" }
  ],
  "api_version": "v1",
  "provider": "cdudu",
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### ❌ Error Response Format

**Cấu trúc mới:**
```typescript
interface ErrorResponse {
  status: number;             // HTTP status code (400, 401, 404, 500, etc.)
  message: string;            // Thông báo lỗi user-friendly
  error: {
    code: string;             // Error code (VALIDATION_ERROR, NOT_FOUND, etc.)
    details?: any;            // Chi tiết lỗi (validation errors, etc.) - Optional
    requestId?: string;       // Request ID để tracking - Optional
  };
  api_version: string;        // "v1"
  provider: string;           // "cdudu"
}
```

**Ví dụ:**
```json
{
  "status": 400,
  "message": "Validation error",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "path": ["email"],
        "message": "Invalid email format"
      }
    ]
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Ví dụ không có details:**
```json
{
  "status": 404,
  "message": "User not found",
  "error": {
    "code": "NOT_FOUND"
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

---

## 🔧 Cách Cập Nhật Frontend

### 1. Cập Nhật API Client/Service

**Trước (có thể đang dùng):**
```typescript
// ❌ OLD - Không tương thích
async function getUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return data; // Trả về trực tiếp
}
```

**Sau (cần cập nhật):**
```typescript
// ✅ NEW - Tương thích với format mới
async function getUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  const result = await response.json();
  
  // Kiểm tra status code
  if (result.status >= 200 && result.status < 300) {
    // Success - trả về data
    return result.data;
  } else {
    // Error - throw error với thông tin chi tiết
    throw new ApiError(
      result.error.code,
      result.message,
      result.error.details,
      result.status
    );
  }
}
```

### 2. Tạo Error Handler

```typescript
// ✅ Tạo custom error class
class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ✅ Error handler utility
function handleApiError(error: ApiError) {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      // Hiển thị validation errors
      if (error.details && Array.isArray(error.details)) {
        error.details.forEach((err: any) => {
          console.error(`Field ${err.path}: ${err.message}`);
        });
      }
      break;
    
    case 'NOT_FOUND':
      // Hiển thị "Không tìm thấy"
      console.error('Resource not found');
      break;
    
    case 'UNAUTHORIZED':
      // Redirect to login
      window.location.href = '/login';
      break;
    
    default:
      console.error('Unknown error:', error.message);
  }
}
```

### 3. Cập Nhật Response Interceptor (nếu dùng Axios)

```typescript
import axios from 'axios';

// ✅ Response interceptor
axios.interceptors.response.use(
  (response) => {
    // Backend trả về format mới: { status, message, data, ... }
    const { status, message, data, api_version, provider, meta } = response.data;
    
    // Kiểm tra status trong response body
    if (status >= 200 && status < 300) {
      // Trả về data cho component
      return {
        ...response,
        data: data, // Chỉ trả về data field
        meta: meta, // Giữ lại meta nếu có
      };
    } else {
      // Nếu status không thành công, throw error
      return Promise.reject(
        new ApiError(
          response.data.error?.code || 'UNKNOWN_ERROR',
          message || 'An error occurred',
          response.data.error?.details,
          status
        )
      );
    }
  },
  (error) => {
    // Handle network errors, etc.
    if (error.response) {
      const { status, message, error: errorInfo } = error.response.data;
      return Promise.reject(
        new ApiError(
          errorInfo?.code || 'UNKNOWN_ERROR',
          message || error.message,
          errorInfo?.details,
          status
        )
      );
    }
    return Promise.reject(error);
  }
);
```

### 4. Cập Nhật Component Code

**Trước:**
```typescript
// ❌ OLD
const [users, setUsers] = useState([]);

useEffect(() => {
  fetch('/api/users')
    .then(res => res.json())
    .then(data => setUsers(data)); // Giả định data là array
}, []);
```

**Sau:**
```typescript
// ✅ NEW
const [users, setUsers] = useState([]);
const [pagination, setPagination] = useState({ page: 1, total: 0 });

useEffect(() => {
  fetch('/api/users')
    .then(res => res.json())
    .then(result => {
      if (result.status === 200) {
        setUsers(result.data); // Lấy data từ result.data
        if (result.meta) {
          setPagination({
            page: result.meta.page,
            total: result.meta.total,
          });
        }
      }
    })
    .catch(error => {
      handleApiError(error);
    });
}, []);
```

---

## 📋 Danh Sách Endpoints Cần Cập Nhật

### Admin Endpoints

#### 1. **GET /api/admin/stats** - System Statistics
```typescript
// Response format:
{
  "data": {
    "totalUsers": 100,
    "totalTenants": 50,
    "totalChatbots": 200,
    // ... other stats
  },
  "status": 200,
  "message": "Success",
  "api_version": "v1",
  "provider": "cdudu"
}
```

#### 2. **GET /api/admin/users** - List Users
```typescript
// Response format:
{
  "data": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "name": "User Name",
      "balance": 1000000,
      "credit": 5000
    }
  ],
  "status": 200,
  "message": "Success",
  "api_version": "v1",
  "provider": "cdudu",
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### 3. **GET /api/admin/tenants** - List Tenants
```typescript
// Response format tương tự như users, có meta pagination
```

#### 4. **POST /api/admin/customers** - Create Customer
```typescript
// Request:
{
  "tenant": {
    "name": "Tenant Name",
    "slug": "tenant-slug"
  },
  "adminUser": {
    "email": "admin@tenant.com",
    "password": "password123",
    "name": "Admin Name"
  }
}

// Response:
{
  "data": {
    "tenant": {
      "id": "tenant_123",
      "name": "Tenant Name",
      "slug": "tenant-slug"
    },
    "user": {
      "id": "user_123",
      "email": "admin@tenant.com",
      "name": "Admin Name"
    }
  },
  "status": 201,
  "message": "Customer created successfully",
  "api_version": "v1",
  "provider": "cdudu"
}
```

#### 5. **POST /api/admin/admins** - Create Admin (First-time setup)
```typescript
// Request:
{
  "email": "admin@example.com",
  "password": "password123",
  "name": "Admin Name",
  "tenantName": "My Tenant" // Optional
}

// Response:
{
  "data": {
    "user": {
      "id": "user_123",
      "email": "admin@example.com",
      "name": "Admin Name"
    },
    "tenant": {
      "id": "tenant_123",
      "name": "My Tenant",
      "slug": "my-tenant"
    } // hoặc null nếu không có tenantName
  },
  "status": 201,
  "message": "Admin user created successfully",
  "api_version": "v1",
  "provider": "cdudu"
}
```

#### 6. **GET /api/admin/tenants/:tenantId/admins** - List Tenant Admins
```typescript
// Response có format tương tự, có meta pagination
```

#### 7. **POST /api/admin/tenants/:tenantId/admins** - Create Tenant Admin
```typescript
// Request:
{
  "email": "admin@tenant.com",
  "password": "password123",
  "name": "Admin Name",
  "role": "admin" // hoặc "owner"
}

// Response:
{
  "data": {
    "id": "user_123",
    "email": "admin@tenant.com",
    "name": "Admin Name",
    "role": "admin"
  },
  "status": 201,
  "message": "Tenant admin created successfully",
  "api_version": "v1",
  "provider": "cdudu"
}
```

#### 8. **PATCH /api/admin/tenants/:tenantId/admins/:adminId** - Update Tenant Admin
```typescript
// Request:
{
  "name": "Updated Name",
  "role": "owner",
  "isActive": true
}

// Response tương tự create
```

#### 9. **DELETE /api/admin/tenants/:tenantId/admins/:adminId** - Delete Tenant Admin
```typescript
// Response:
{
  "data": {
    "id": "user_123",
    "deleted": true
  },
  "status": 200,
  "message": "Tenant admin deleted successfully",
  "api_version": "v1",
  "provider": "cdudu"
}
```

#### 10. **POST /api/admin/users/:userId/top-up** - Top Up User Balance
```typescript
// Request:
{
  "vndAmount": 1000000, // Optional
  "creditAmount": 1000, // Optional
  "reason": "Manual top-up by admin" // Optional
}

// Response:
{
  "data": {
    "userId": "user_123",
    "vndBalance": 1000000,
    "creditBalance": 1000,
    "transaction": {
      "id": "txn_123",
      "type": "top_up",
      "amount": 1000000
    }
  },
  "status": 200,
  "message": "Balance topped up successfully",
  "api_version": "v1",
  "provider": "cdudu"
}
```

#### 11. **GET /api/admin/users/:userId/balance-logs** - Get Admin Balance Logs
```typescript
// Query params: ?page=1&limit=50&startDate=2024-01-01&endDate=2024-12-31&type=all

// Response:
{
  "data": [
    {
      "id": "log_123",
      "type": "vnd",
      "amount": 1000000,
      "balanceAfter": 2000000,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "status": 200,
  "message": "Success",
  "api_version": "v1",
  "provider": "cdudu",
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2,
    "filter": {
      "type": "all"
    }
  }
}
```

#### 12. **GET /api/admin/balance-logs** - Get All Admin Balance Logs
```typescript
// Query params: ?page=1&limit=50&adminId=user_123&type=all

// Response format tương tự như trên
```

---

## 🛠️ Utility Functions Đề Xuất

### 1. API Client Wrapper

```typescript
// utils/api-client.ts
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<{ data: T; meta?: any }> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const result = await response.json();

    if (result.status >= 200 && result.status < 300) {
      return {
        data: result.data,
        meta: result.meta,
      };
    } else {
      throw new ApiError(
        result.error?.code || 'UNKNOWN_ERROR',
        result.message || 'An error occurred',
        result.error?.details,
        result.status
      );
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<{ data: T; meta?: any }> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>(endpoint + queryString, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<{ data: T; meta?: any }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<{ data: T; meta?: any }> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<{ data: T; meta?: any }> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(process.env.REACT_APP_API_URL || '/api');
```

### 2. Sử Dụng API Client

```typescript
// services/admin.service.ts
import { apiClient } from '../utils/api-client';

export const adminService = {
  async getSystemStats() {
    const { data } = await apiClient.get('/admin/stats');
    return data;
  },

  async listUsers(params?: { page?: number; limit?: number; search?: string }) {
    const { data, meta } = await apiClient.get('/admin/users', params);
    return { users: data, pagination: meta };
  },

  async createAdmin(payload: {
    email: string;
    password: string;
    name?: string;
    tenantName?: string;
  }) {
    const { data } = await apiClient.post('/admin/admins', payload);
    return data;
  },

  async topUpUserBalance(
    userId: string,
    payload: { vndAmount?: number; creditAmount?: number; reason?: string }
  ) {
    const { data } = await apiClient.post(`/admin/users/${userId}/top-up`, payload);
    return data;
  },
};
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. **Luôn Kiểm Tra `result.status`**
- Không chỉ dựa vào HTTP status code
- Kiểm tra `result.status` trong response body
- Status code HTTP có thể là 200 nhưng `result.status` có thể là 400, 500, etc.

### 2. **Xử Lý Error Code**
- Sử dụng `error.code` để phân biệt loại lỗi
- Hiển thị message phù hợp cho từng error code
- Log `requestId` nếu có để tracking

### 3. **Pagination Meta**
- Luôn kiểm tra `result.meta` cho pagination
- Sử dụng `meta.page`, `meta.limit`, `meta.total`, `meta.totalPages`
- Một số endpoints có `meta.filter` để biết filters đang áp dụng

### 4. **Backward Compatibility**
- Nếu có code cũ đang dùng format cũ, cần migrate dần
- Có thể tạo adapter để convert format cũ sang mới (temporary)

---

## 🧪 Testing Checklist

Sau khi cập nhật, test các trường hợp:

- [ ] ✅ Success response - lấy được `data` đúng
- [ ] ✅ Error response - xử lý error đúng với `error.code`
- [ ] ✅ Pagination - hiển thị đúng `meta.page`, `meta.total`
- [ ] ✅ Validation errors - hiển thị `error.details` đúng
- [ ] ✅ Network errors - xử lý khi không có response
- [ ] ✅ Loading states - hiển thị loading khi đang fetch
- [ ] ✅ Empty states - xử lý khi `data` là array rỗng

---

## 📞 Hỗ Trợ

Nếu có thắc mắc hoặc vấn đề khi cập nhật, vui lòng liên hệ backend team.

---

**Version:** 1.0  
**Last Updated:** 2024-01-XX  
**Author:** Backend Team

