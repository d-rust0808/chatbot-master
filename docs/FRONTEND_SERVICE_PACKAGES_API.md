# 📦 Hướng Dẫn Tích Hợp API Service Packages cho Admin

## 🎯 Mục Đích

Document này mô tả cách tích hợp **Service Packages API** cho **Tenant Admin** để:
- Xem danh sách gói dịch vụ (WhatsApp, Facebook, Instagram, TikTok, Zalo)
- Đăng ký/mua gói dịch vụ
- Quản lý subscriptions
- Kiểm tra trạng thái service

---

## 🔐 Authentication

**TẤT CẢ** API endpoints đều yêu cầu authentication:

```
Authorization: Bearer <jwt_token>
```

Token được lấy từ API login (`POST /api/v1/auth/login`).

---

## 📋 API Endpoints

### 1. Xem Danh Sách Gói Dịch vụ

**Endpoint:** `GET /api/v1/admin/service-packages`

**Query Parameters:**
- `service` (optional): Filter theo service (`whatsapp`, `facebook`, `instagram`, `tiktok`, `zalo`, `messenger`)

**Request:**
```http
GET /api/v1/admin/service-packages?service=whatsapp
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Service packages retrieved successfully",
  "data": [
    {
      "id": "pkg_123",
      "name": "Gói WhatsApp",
      "description": "Gói dịch vụ WhatsApp với đầy đủ tính năng",
      "service": "whatsapp",
      "pricePerMonth": 100000,
      "minDuration": 1,
      "features": {
        "messages": "unlimited",
        "media": true,
        "groups": true
      }
    },
    {
      "id": "pkg_456",
      "name": "Gói Facebook Messenger",
      "description": "Gói dịch vụ Facebook Messenger",
      "service": "facebook",
      "pricePerMonth": 150000,
      "minDuration": 1
    }
  ],
  "api_version": "v1",
  "provider": "cdudu"
}
```

**TypeScript Interface:**
```typescript
interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  service: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'zalo' | 'messenger';
  pricePerMonth: number; // VNĐ
  minDuration: number; // Số tháng tối thiểu (1-5)
  features?: Record<string, any>; // Optional features
}
```

---

### 2. Đăng Ký/Mua Gói Dịch vụ

**Endpoint:** `POST /api/v1/admin/service-packages/:packageId/purchase`

**Request:**
```http
POST /api/v1/admin/service-packages/pkg_123/purchase
Authorization: Bearer <token>
Content-Type: application/json

{
  "duration": 3 // Số tháng (1-5)
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Đã mua gói Gói WhatsApp 3 tháng thành công",
  "data": {
    "subscriptionId": "sub_123",
    "packageName": "Gói WhatsApp",
    "service": "whatsapp",
    "duration": 3,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-04-01T00:00:00Z",
    "price": 300000
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Lưu ý:**
- Số tiền sẽ được trừ từ **VND wallet** của tenant
- Nếu đã có subscription active cho service này, sẽ **gia hạn** thêm tháng
- Service sẽ được **tự động enable** sau khi purchase thành công

**Error Responses:**

**400 - Insufficient VND Balance:**
```json
{
  "status": 400,
  "message": "Insufficient VND balance to purchase service package",
  "error": {
    "code": "INSUFFICIENT_VND_BALANCE",
    "details": {
      "required": 300000,
      "current": 100000,
      "shortfall": 200000
    }
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**400 - Invalid Duration:**
```json
{
  "status": 400,
  "message": "Duration must be at least 1 month(s)",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "path": ["duration"],
        "message": "Tối thiểu 1 tháng"
      }
    ]
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

---

### 3. Xem Danh Sách Subscriptions

**Endpoint:** `GET /api/v1/admin/service-packages/subscriptions`

**Request:**
```http
GET /api/v1/admin/service-packages/subscriptions
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Tenant subscriptions retrieved successfully",
  "data": [
    {
      "id": "sub_123",
      "packageId": "pkg_123",
      "package": {
        "id": "pkg_123",
        "name": "Gói WhatsApp",
        "service": "whatsapp",
        "imageUrl": "https://example.com/image.jpg"
      },
      "duration": 3,
      "price": 300000,
      "status": "active",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-04-01T00:00:00Z",
      "autoRenew": false,
      "cancelledAt": null,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "sub_456",
      "packageId": "pkg_456",
      "package": {
        "id": "pkg_456",
        "name": "Gói Facebook Messenger",
        "service": "facebook"
      },
      "duration": 1,
      "price": 150000,
      "status": "expired",
      "startDate": "2023-12-01T00:00:00Z",
      "endDate": "2024-01-01T00:00:00Z",
      "autoRenew": false,
      "cancelledAt": null,
      "createdAt": "2023-12-01T00:00:00Z"
    }
  ],
  "api_version": "v1",
  "provider": "cdudu"
}
```

**TypeScript Interface:**
```typescript
interface ServiceSubscription {
  id: string;
  packageId: string;
  package: {
    id: string;
    name: string;
    service: string;
    imageUrl?: string;
  };
  duration: number;
  price: number; // VNĐ đã thanh toán
  status: 'active' | 'expired' | 'cancelled';
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  autoRenew: boolean;
  cancelledAt: string | null;
  createdAt: string;
}
```

---

### 4. Xem Active Subscriptions (Sidebar)

**Endpoint:** `GET /api/v1/admin/service-packages/my-subscriptions`

**Request:**
```http
GET /api/v1/admin/service-packages/my-subscriptions
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Active subscriptions retrieved successfully",
  "data": [
    {
      "service": "whatsapp",
      "packageName": "Gói WhatsApp",
      "endDate": "2024-04-01T00:00:00Z",
      "isActive": true,
      "daysRemaining": 45
    },
    {
      "service": "facebook",
      "packageName": "Gói Facebook Messenger",
      "endDate": "2024-02-15T00:00:00Z",
      "isActive": true,
      "daysRemaining": 10
    }
  ],
  "api_version": "v1",
  "provider": "cdudu"
}
```

**TypeScript Interface:**
```typescript
interface ActiveSubscription {
  service: string;
  packageName: string;
  endDate: string;
  isActive: boolean;
  daysRemaining: number;
}
```

**Lưu ý:** API này được tối ưu cho sidebar, chỉ trả về thông tin cần thiết.

---

### 5. Kiểm Tra Service Active

**Endpoint:** `GET /api/v1/admin/service-packages/check/:service`

**Request:**
```http
GET /api/v1/admin/service-packages/check/whatsapp
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Service status checked successfully",
  "data": {
    "service": "whatsapp",
    "isActive": true,
    "subscription": {
      "id": "sub_123",
      "endDate": "2024-04-01T00:00:00Z",
      "daysRemaining": 45
    }
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Response khi không active:**
```json
{
  "status": 200,
  "message": "Service status checked successfully",
  "data": {
    "service": "whatsapp",
    "isActive": false,
    "subscription": null
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**TypeScript Interface:**
```typescript
interface ServiceStatus {
  service: string;
  isActive: boolean;
  subscription: {
    id: string;
    endDate: string;
    daysRemaining: number;
  } | null;
}
```

---

### 6. Hủy Subscription

**Endpoint:** `POST /api/v1/admin/service-packages/subscriptions/:subscriptionId/cancel`

**Request:**
```http
POST /api/v1/admin/service-packages/subscriptions/sub_123/cancel
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "status": 200,
  "message": "Đã hủy đăng ký gói dịch vụ",
  "data": null,
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Lưu ý:**
- Subscription sẽ được đánh dấu là `cancelled`
- Service sẽ vẫn hoạt động đến hết `endDate`
- Không hoàn tiền khi hủy

---

## 🔧 Frontend Integration Examples

### React/TypeScript Example

```typescript
// api/service-packages.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://cchatbot.pro/api/v1';

// Types
export interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  service: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'zalo' | 'messenger';
  pricePerMonth: number;
  minDuration: number;
  features?: Record<string, any>;
}

export interface ServiceSubscription {
  id: string;
  packageId: string;
  package: {
    id: string;
    name: string;
    service: string;
    imageUrl?: string;
  };
  duration: number;
  price: number;
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  cancelledAt: string | null;
  createdAt: string;
}

export interface ActiveSubscription {
  service: string;
  packageName: string;
  endDate: string;
  isActive: boolean;
  daysRemaining: number;
}

export interface ServiceStatus {
  service: string;
  isActive: boolean;
  subscription: {
    id: string;
    endDate: string;
    daysRemaining: number;
  } | null;
}

// API Client
class ServicePackageAPI {
  private getHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get service packages
   */
  async getPackages(service?: string): Promise<ServicePackage[]> {
    const url = service 
      ? `${API_BASE_URL}/admin/service-packages?service=${service}`
      : `${API_BASE_URL}/admin/service-packages`;
    
    const response = await axios.get(url, { headers: this.getHeaders() });
    return response.data.data;
  }

  /**
   * Purchase service package
   */
  async purchasePackage(
    packageId: string,
    duration: number
  ): Promise<{
    subscriptionId: string;
    packageName: string;
    service: string;
    duration: number;
    startDate: string;
    endDate: string;
    price: number;
  }> {
    const response = await axios.post(
      `${API_BASE_URL}/admin/service-packages/${packageId}/purchase`,
      { duration },
      { headers: this.getHeaders() }
    );
    return response.data.data;
  }

  /**
   * Get tenant subscriptions
   */
  async getSubscriptions(): Promise<ServiceSubscription[]> {
    const response = await axios.get(
      `${API_BASE_URL}/admin/service-packages/subscriptions`,
      { headers: this.getHeaders() }
    );
    return response.data.data;
  }

  /**
   * Get active subscriptions (sidebar)
   */
  async getActiveSubscriptions(): Promise<ActiveSubscription[]> {
    const response = await axios.get(
      `${API_BASE_URL}/admin/service-packages/my-subscriptions`,
      { headers: this.getHeaders() }
    );
    return response.data.data;
  }

  /**
   * Check service status
   */
  async checkService(service: string): Promise<ServiceStatus> {
    const response = await axios.get(
      `${API_BASE_URL}/admin/service-packages/check/${service}`,
      { headers: this.getHeaders() }
    );
    return response.data.data;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await axios.post(
      `${API_BASE_URL}/admin/service-packages/subscriptions/${subscriptionId}/cancel`,
      {},
      { headers: this.getHeaders() }
    );
  }
}

export const servicePackageAPI = new ServicePackageAPI();
```

### React Component Example

```typescript
// components/ServicePackages.tsx
import React, { useState, useEffect } from 'react';
import { servicePackageAPI, ServicePackage } from '../api/service-packages';

export function ServicePackages() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string>('');

  useEffect(() => {
    loadPackages();
  }, [selectedService]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await servicePackageAPI.getPackages(
        selectedService || undefined
      );
      setPackages(data);
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string, duration: number) => {
    try {
      const result = await servicePackageAPI.purchasePackage(packageId, duration);
      alert(`Đã mua gói ${result.packageName} ${result.duration} tháng thành công!`);
      // Reload subscriptions
    } catch (error: any) {
      if (error.response?.data?.error?.code === 'INSUFFICIENT_VND_BALANCE') {
        alert('Số dư VNĐ không đủ. Vui lòng nạp thêm tiền.');
      } else {
        alert('Có lỗi xảy ra: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Gói Dịch vụ</h2>
      
      {/* Filter by service */}
      <select 
        value={selectedService} 
        onChange={(e) => setSelectedService(e.target.value)}
      >
        <option value="">Tất cả</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="facebook">Facebook</option>
        <option value="instagram">Instagram</option>
        <option value="tiktok">TikTok</option>
        <option value="zalo">Zalo</option>
      </select>

      {/* Package list */}
      <div className="packages-grid">
        {packages.map((pkg) => (
          <div key={pkg.id} className="package-card">
            <h3>{pkg.name}</h3>
            <p>{pkg.description}</p>
            <p className="price">
              {pkg.pricePerMonth.toLocaleString('vi-VN')} VNĐ/tháng
            </p>
            <p>Tối thiểu: {pkg.minDuration} tháng</p>
            
            {/* Duration selector */}
            <select id={`duration-${pkg.id}`}>
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {d} tháng ({pkg.pricePerMonth * d.toLocaleString('vi-VN')} VNĐ)
                </option>
              ))}
            </select>
            
            <button
              onClick={() => {
                const duration = parseInt(
                  (document.getElementById(`duration-${pkg.id}`) as HTMLSelectElement).value
                );
                handlePurchase(pkg.id, duration);
              }}
            >
              Đăng Ký Ngay
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Subscriptions Component

```typescript
// components/Subscriptions.tsx
import React, { useState, useEffect } from 'react';
import { servicePackageAPI, ServiceSubscription } from '../api/service-packages';

export function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<ServiceSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await servicePackageAPI.getSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    if (!confirm('Bạn có chắc muốn hủy đăng ký này?')) return;
    
    try {
      await servicePackageAPI.cancelSubscription(subscriptionId);
      alert('Đã hủy đăng ký thành công');
      loadSubscriptions();
    } catch (error) {
      alert('Có lỗi xảy ra khi hủy đăng ký');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Gói Dịch vụ Đã Đăng Ký</h2>
      
      <table>
        <thead>
          <tr>
            <th>Gói Dịch vụ</th>
            <th>Service</th>
            <th>Thời hạn</th>
            <th>Trạng thái</th>
            <th>Giá</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((sub) => (
            <tr key={sub.id}>
              <td>{sub.package.name}</td>
              <td>{sub.package.service}</td>
              <td>
                {new Date(sub.startDate).toLocaleDateString('vi-VN')} - {' '}
                {new Date(sub.endDate).toLocaleDateString('vi-VN')}
              </td>
              <td>
                <span className={`status-${sub.status}`}>
                  {sub.status === 'active' ? 'Đang hoạt động' : 
                   sub.status === 'expired' ? 'Đã hết hạn' : 'Đã hủy'}
                </span>
              </td>
              <td>{sub.price.toLocaleString('vi-VN')} VNĐ</td>
              <td>
                {sub.status === 'active' && (
                  <button onClick={() => handleCancel(sub.id)}>
                    Hủy
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Sidebar Component

```typescript
// components/SidebarSubscriptions.tsx
import React, { useState, useEffect } from 'react';
import { servicePackageAPI, ActiveSubscription } from '../api/service-packages';

export function SidebarSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);

  useEffect(() => {
    loadActiveSubscriptions();
    // Refresh every 5 minutes
    const interval = setInterval(loadActiveSubscriptions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadActiveSubscriptions = async () => {
    try {
      const data = await servicePackageAPI.getActiveSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error('Failed to load active subscriptions:', error);
    }
  };

  return (
    <div className="sidebar-subscriptions">
      <h3>Dịch vụ Đang Hoạt Động</h3>
      {subscriptions.length === 0 ? (
        <p>Chưa có dịch vụ nào được kích hoạt</p>
      ) : (
        <ul>
          {subscriptions.map((sub) => (
            <li key={sub.service}>
              <strong>{sub.packageName}</strong>
              <br />
              <small>
                Còn lại: {sub.daysRemaining} ngày
                <br />
                Hết hạn: {new Date(sub.endDate).toLocaleDateString('vi-VN')}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## ⚠️ Error Handling

### Common Error Codes

| Code | HTTP Status | Mô tả | Giải pháp |
|------|-------------|-------|-----------|
| `AUTH_ERROR` | 401 | Chưa đăng nhập hoặc token hết hạn | Redirect đến login page |
| `INSUFFICIENT_VND_BALANCE` | 400 | Số dư VNĐ không đủ | Hiển thị thông báo và link đến nạp tiền |
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ | Hiển thị lỗi validation |
| `NOT_FOUND_ERROR` | 404 | Không tìm thấy resource | Hiển thị thông báo "Không tìm thấy" |
| `INTERNAL_ERROR` | 500 | Lỗi server | Hiển thị thông báo lỗi chung |

### Error Response Format

```json
{
  "status": 400,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {
      // Additional error details
    }
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

---

## 🔄 Workflow Tích Hợp

### 1. Trang Danh Sách Gói Dịch vụ

```
1. Load packages: GET /admin/service-packages
2. Hiển thị danh sách packages
3. User chọn package và duration
4. Click "Đăng Ký"
5. Call: POST /admin/service-packages/:packageId/purchase
6. Nếu thành công: Show success message, reload subscriptions
7. Nếu lỗi balance: Redirect đến trang nạp tiền
```

### 2. Trang Quản Lý Subscriptions

```
1. Load subscriptions: GET /admin/service-packages/subscriptions
2. Hiển thị bảng subscriptions
3. Filter theo status (active, expired, cancelled)
4. Click "Hủy" → Confirm → POST /admin/service-packages/subscriptions/:id/cancel
5. Reload subscriptions sau khi hủy
```

### 3. Sidebar Active Services

```
1. Load active subscriptions: GET /admin/service-packages/my-subscriptions
2. Hiển thị danh sách services đang active
3. Show days remaining
4. Auto-refresh mỗi 5 phút
5. Click vào service → Navigate đến trang quản lý
```

### 4. Check Service Before Action

```
1. Trước khi enable platform connection
2. Call: GET /admin/service-packages/check/:service
3. Nếu isActive = false → Show message "Vui lòng đăng ký gói dịch vụ"
4. Nếu isActive = true → Proceed với action
```

---

## 💡 Best Practices

### 1. Caching
- Cache packages list (ít thay đổi)
- Cache active subscriptions (refresh mỗi 5 phút)
- Invalidate cache sau khi purchase/cancel

### 2. Error Handling
- Luôn check `response.data.status` trước khi dùng `response.data.data`
- Handle `INSUFFICIENT_VND_BALANCE` với UX tốt (redirect đến nạp tiền)
- Show loading states khi đang process

### 3. User Experience
- Show confirmation dialog trước khi purchase
- Show success/error messages rõ ràng
- Disable buttons khi đang process
- Show days remaining cho active subscriptions

### 4. Security
- **NEVER** expose JWT token trong logs hoặc console
- Store token trong `httpOnly` cookie hoặc secure storage
- Validate token expiration trước khi call API

---

## 📝 TypeScript Types (Complete)

```typescript
// Copy vào frontend project
export interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  service: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'zalo' | 'messenger';
  pricePerMonth: number;
  minDuration: number;
  features?: Record<string, any>;
}

export interface ServiceSubscription {
  id: string;
  packageId: string;
  package: {
    id: string;
    name: string;
    service: string;
    imageUrl?: string;
  };
  duration: number;
  price: number;
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  cancelledAt: string | null;
  createdAt: string;
}

export interface ActiveSubscription {
  service: string;
  packageName: string;
  endDate: string;
  isActive: boolean;
  daysRemaining: number;
}

export interface ServiceStatus {
  service: string;
  isActive: boolean;
  subscription: {
    id: string;
    endDate: string;
    daysRemaining: number;
  } | null;
}

export interface ApiSuccessResponse<T> {
  status: number;
  message: string;
  data: T;
  api_version: string;
  provider: string;
}

export interface ApiErrorResponse {
  status: number;
  message: string;
  error: {
    code: string;
    details?: any;
  };
  api_version: string;
  provider: string;
}
```

---

## 🚀 Quick Start

1. **Setup API Client:**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://cchatbot.pro/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

2. **Load Packages:**
```typescript
const packages = await api.get('/admin/service-packages');
console.log(packages.data.data); // Array of ServicePackage
```

3. **Purchase Package:**
```typescript
const result = await api.post(
  '/admin/service-packages/pkg_123/purchase',
  { duration: 3 }
);
console.log(result.data.data); // Purchase result
```

---

## 📞 Support

Nếu có vấn đề khi tích hợp, vui lòng:
1. Kiểm tra authentication token
2. Kiểm tra response format (status, message, data)
3. Kiểm tra error code và details
4. Contact backend team với request ID (nếu có)

---

**Last Updated:** 2024-01-10
**API Version:** v1
**Provider:** cdudu

