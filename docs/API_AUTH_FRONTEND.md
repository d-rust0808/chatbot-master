# Authentication API Documentation - Frontend Integration Guide

## 📋 Tổng quan

Tài liệu này mô tả bộ API Authentication dành cho **Frontend** để xử lý đăng nhập, đăng xuất và quản lý tokens.

**Base URL**: `/api/v1/auth`

**Prefix**: Tất cả endpoints đều có prefix `/auth`

---

## 🔐 Authentication Flow

### 1. Login → Nhận Access Token & Refresh Token
### 2. Sử dụng Access Token cho các API calls
### 3. Khi Access Token hết hạn → Dùng Refresh Token để lấy Access Token mới
### 4. Logout → Invalidate Refresh Token

---

## 📦 Response Format

Tất cả API responses đều tuân theo format chuẩn:

### Success Response

```typescript
{
  success: boolean;           // true
  status: number;            // HTTP status code (200, 201, etc.)
  message: string;           // Success message
  data: T;                   // Response data (generic type)
}
```

### Error Response

```typescript
{
  success: boolean;          // false
  status: number;            // HTTP status code (400, 401, 500, etc.)
  message: string;           // Error message
  error: {
    code: string;            // Error code (e.g., "VALIDATION_ERROR", "AUTH_ERROR")
    message: string;          // Error message
    details?: any;            // Additional error details
  }
}
```

---

## 🔑 Endpoints

### 1. Login

**Endpoint**: `POST /auth/login`

**Description**: Đăng nhập và nhận access token, refresh token, user info, tenants, wallet balance và **service subscriptions**.

**Authentication**: Không cần (public endpoint)

**Request Body**:

```typescript
{
  email: string;      // Email của user
  password: string;   // Password
}
```

**Example Request**:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Success Response (200)**:

```typescript
{
  success: true,
  status: 200,
  message: "Đăng nhập thành công",
  data: {
    accessToken: string;        // JWT access token (short-lived, ~15 phút)
    refreshToken: string;       // JWT refresh token (long-lived, ~7 ngày)
    user: {
      id: string;               // User ID
      email: string;            // User email
      name: string | null;      // User name
      role: string;             // User role (e.g., "admin", "super_admin")
    },
    tenants: Array<{            // Danh sách tenants mà user thuộc về
      id: string;               // Tenant ID
      name: string;            // Tenant name
      slug: string;            // Tenant slug
      role: string;            // User role trong tenant (e.g., "owner", "admin", "member")
    }>,
    wallet: {
      vndBalance: number;      // Số dư VNĐ wallet
      creditBalance: number;    // Số dư credit wallet
    },
    subscriptions: Array<{      // ⭐ MỚI: Danh sách service packages đã đăng ký
      id: string;               // Subscription ID
      service: string;          // Service name (e.g., "whatsapp", "facebook", "instagram")
      serviceName: string;      // Service display name (e.g., "WhatsApp Business")
      imageUrl: string | null;  // Service icon/logo URL
      startDate: string;        // ISO 8601 date string - Ngày bắt đầu subscription
      endDate: string;          // ISO 8601 date string - Ngày kết thúc subscription
      daysRemaining: number;    // Số ngày còn lại của subscription
      isActive: boolean;        // Luôn là true (chỉ trả về active subscriptions)
    }>
  }
}
```

**Example Response**:

```json
{
  "success": true,
  "status": 200,
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "admin"
    },
    "tenants": [
      {
        "id": "tenant_456",
        "name": "My Company",
        "slug": "my-company",
        "role": "owner"
      }
    ],
    "wallet": {
      "vndBalance": 1000000,
      "creditBalance": 5000
    },
    "subscriptions": [
      {
        "id": "sub_789",
        "service": "whatsapp",
        "serviceName": "WhatsApp Business",
        "imageUrl": "https://cdn.example.com/whatsapp-icon.png",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-02-01T00:00:00.000Z",
        "daysRemaining": 15,
        "isActive": true
      },
      {
        "id": "sub_790",
        "service": "facebook",
        "serviceName": "Facebook Messenger",
        "imageUrl": "https://cdn.example.com/facebook-icon.png",
        "startDate": "2024-01-15T00:00:00.000Z",
        "endDate": "2024-02-15T00:00:00.000Z",
        "daysRemaining": 30,
        "isActive": true
      }
    ]
  }
}
```

**Error Responses**:

**400 - Validation Error**:

```json
{
  "success": false,
  "status": 400,
  "message": "Validation error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation error",
    "details": [
      {
        "path": ["email"],
        "message": "Invalid email"
      }
    ]
  }
}
```

**401 - Invalid Credentials**:

```json
{
  "success": false,
  "status": 401,
  "message": "Thông tin tài khoản mật khẩu không đúng",
  "error": {
    "code": "AUTH_ERROR",
    "message": "Thông tin tài khoản mật khẩu không đúng"
  }
}
```

**500 - Internal Server Error**:

```json
{
  "success": false,
  "status": 500,
  "message": "Internal server error",
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```

---

### 2. Refresh Access Token

**Endpoint**: `POST /auth/refresh`

**Description**: Lấy access token mới khi access token cũ hết hạn.

**Authentication**: Không cần (public endpoint)

**Request Body**:

```typescript
{
  refreshToken: string;  // Refresh token từ login response
}
```

**Example Request**:

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200)**:

```typescript
{
  success: true,
  status: 200,
  message: "Access token refreshed successfully",
  data: {
    accessToken: string;  // New access token
  }
}
```

**Error Response (401)**:

```json
{
  "success": false,
  "status": 401,
  "message": "Invalid refresh token",
  "error": {
    "code": "AUTH_ERROR",
    "message": "Invalid refresh token"
  }
}
```

---

### 3. Logout

**Endpoint**: `POST /auth/logout`

**Description**: Đăng xuất và invalidate refresh token.

**Authentication**: **BẮT BUỘC** - Cần access token

**Headers**:

```http
Authorization: Bearer <access_token>
```

**Request Body**: Không cần

**Success Response (200)**:

```typescript
{
  success: true,
  status: 200,
  message: "Logged out successfully",
  data: null
}
```

**Error Response (401)**:

```json
{
  "success": false,
  "status": 401,
  "message": "Unauthorized",
  "error": {
    "code": "AUTH_ERROR",
    "message": "Invalid or expired token"
  }
}
```

---

## 📱 Frontend Integration Guide

### 1. Login Flow

```typescript
// Example: React/TypeScript
interface LoginResponse {
  success: boolean;
  status: number;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
    };
    tenants: Array<{
      id: string;
      name: string;
      slug: string;
      role: string;
    }>;
    wallet: {
      vndBalance: number;
      creditBalance: number;
    };
    subscriptions: Array<{
      id: string;
      service: string;
      serviceName: string;
      imageUrl: string | null;
      startDate: string;
      endDate: string;
      daysRemaining: number;
      isActive: boolean;
    }>;
  };
}

async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  if (data.success) {
    // Lưu tokens vào localStorage hoặc secure storage
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    
    // Lưu user info
    localStorage.setItem('user', JSON.stringify(data.data.user));
    
    // Lưu tenants
    localStorage.setItem('tenants', JSON.stringify(data.data.tenants));
    
    // Lưu wallet info
    localStorage.setItem('wallet', JSON.stringify(data.data.wallet));
    
    // ⭐ Lưu subscriptions để hiển thị trong sidebar
    localStorage.setItem('subscriptions', JSON.stringify(data.data.subscriptions));
  }
  
  return data;
}
```

### 2. Sử dụng Subscriptions trong Sidebar

```typescript
// Example: React Component - Sidebar với Service Subscriptions
import React, { useEffect, useState } from 'react';

interface Subscription {
  id: string;
  service: string;
  serviceName: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  isActive: boolean;
}

function Sidebar() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    // Lấy subscriptions từ localStorage (đã lưu khi login)
    const storedSubscriptions = localStorage.getItem('subscriptions');
    if (storedSubscriptions) {
      setSubscriptions(JSON.parse(storedSubscriptions));
    }
  }, []);

  const getServiceConfigUrl = (service: string) => {
    // Map service name to config route
    const serviceRoutes: Record<string, string> = {
      whatsapp: '/admin/platforms/whatsapp',
      facebook: '/admin/platforms/facebook',
      messenger: '/admin/platforms/messenger',
      instagram: '/admin/platforms/instagram',
      tiktok: '/admin/platforms/tiktok',
      zalo: '/admin/platforms/zalo',
      shopee: '/admin/platforms/shopee',
    };
    
    return serviceRoutes[service] || `/admin/platforms/${service}`;
  };

  return (
    <div className="sidebar">
      <h2>Dịch vụ đã đăng ký</h2>
      
      {subscriptions.length === 0 ? (
        <p>Chưa có dịch vụ nào được đăng ký</p>
      ) : (
        <ul className="subscriptions-list">
          {subscriptions.map((sub) => (
            <li key={sub.id} className="subscription-item">
              <a href={getServiceConfigUrl(sub.service)}>
                {sub.imageUrl && (
                  <img 
                    src={sub.imageUrl} 
                    alt={sub.serviceName}
                    className="service-icon"
                  />
                )}
                <div className="service-info">
                  <h3>{sub.serviceName}</h3>
                  <p className="days-remaining">
                    Còn lại: {sub.daysRemaining} ngày
                  </p>
                  {sub.daysRemaining <= 7 && (
                    <span className="warning-badge">
                      Sắp hết hạn
                    </span>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 3. Token Management với Axios Interceptor

```typescript
// Example: Axios setup với auto-refresh token
import axios from 'axios';

// Create axios instance
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Thêm access token vào mọi request
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Auto-refresh token khi 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        // Gọi refresh token API
        const response = await axios.post('/api/v1/auth/refresh', {
          refreshToken,
        });

        const { accessToken } = response.data.data;
        
        // Lưu access token mới
        localStorage.setItem('accessToken', accessToken);
        
        // Retry original request với token mới
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh token cũng hết hạn → redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### 4. Logout Flow

```typescript
async function logout(): Promise<void> {
  try {
    const accessToken = localStorage.getItem('accessToken');
    
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage
    localStorage.clear();
    
    // Redirect to login
    window.location.href = '/login';
  }
}
```

---

## 🎯 Service Subscriptions - Use Cases

### 1. Hiển thị danh sách services trong Sidebar

Subscriptions array chứa tất cả services mà tenant đã đăng ký và đang active. Frontend có thể:

- Hiển thị danh sách services với icon/logo
- Hiển thị số ngày còn lại
- Highlight services sắp hết hạn (daysRemaining <= 7)
- Link đến config page cho từng service

### 2. Navigation đến Service Config

Mỗi subscription có `service` field (e.g., "whatsapp, facebook, instagram"). Frontend có thể map service name đến config route:

```typescript
const serviceRoutes = {
  whatsapp: '/admin/platforms/whatsapp',
  facebook: '/admin/platforms/facebook',
  messenger: '/admin/platforms/messenger',
  instagram: '/admin/platforms/instagram',
  tiktok: '/admin/platforms/tiktok',
  zalo: '/admin/platforms/zalo',
  shopee: '/admin/platforms/shopee',
};
```

### 3. Kiểm tra Service Availability

Trước khi cho phép user config một service, frontend có thể check:

```typescript
function isServiceSubscribed(service: string): boolean {
  const subscriptions = JSON.parse(
    localStorage.getItem('subscriptions') || '[]'
  );
  
  return subscriptions.some(
    (sub: Subscription) => 
      sub.service === service && 
      sub.isActive && 
      sub.daysRemaining > 0
  );
}

// Usage
if (isServiceSubscribed('whatsapp')) {
  // Show WhatsApp config page
} else {
  // Show "Subscribe to WhatsApp" message
}
```

### 4. Hiển thị Warning khi sắp hết hạn

```typescript
function getExpiringSoonSubscriptions(): Subscription[] {
  const subscriptions = JSON.parse(
    localStorage.getItem('subscriptions') || '[]'
  );
  
  return subscriptions.filter(
    (sub: Subscription) => sub.daysRemaining <= 7 && sub.daysRemaining > 0
  );
}
```

---

## 📝 Notes

### Subscriptions trong Login Response

- **Chỉ trả về active subscriptions**: Chỉ subscriptions có `status='active'` và `endDate > now` mới được trả về
- **Primary tenant only**: Subscriptions chỉ của primary tenant (tenant đầu tiên hoặc owner tenant)
- **Auto-updated**: Subscriptions được lấy fresh mỗi lần login, không cần cache
- **Empty array**: Nếu không có subscriptions, trả về `[]` (không phải `null`)

### Token Management Best Practices

1. **Access Token**: 
   - Short-lived (~15 phút)
   - Lưu trong memory hoặc secure storage
   - Tự động refresh khi hết hạn

2. **Refresh Token**:
   - Long-lived (~7 ngày)
   - Lưu trong secure storage (httpOnly cookie nếu có thể)
   - Chỉ dùng để refresh access token

3. **Security**:
   - Không log tokens
   - Không gửi tokens trong URL
   - Clear tokens khi logout

### Error Handling

- **401 Unauthorized**: Token hết hạn hoặc invalid → Refresh token hoặc redirect to login
- **400 Validation Error**: Input không hợp lệ → Hiển thị validation errors
- **500 Internal Error**: Server error → Hiển thị error message, có thể retry

---

## 🔗 Related Documentation

- [Service Packages API](./API_SERVICE_PACKAGES_FRONTEND.md) - Quản lý service packages và subscriptions
- [Platforms API](./API_PLATFORMS_FRONTEND.md) - Config platforms (WhatsApp, Facebook, etc.)

---

## 📞 Support

Nếu có vấn đề hoặc câu hỏi, vui lòng liên hệ backend team.

