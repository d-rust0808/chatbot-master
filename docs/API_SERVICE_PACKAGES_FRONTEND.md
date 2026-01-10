# Service Packages API Documentation - Frontend Integration Guide

## 📋 Tổng quan

Tài liệu này mô tả bộ API Service Packages dành cho **Tenant Admin** để quản lý gói dịch vụ và subscriptions.

**Base URL**: `/api/v1/admin/service-packages`

**Prefix**: Tất cả endpoints đều có prefix `/admin/service-packages`

---

## 🔐 Authentication

**BẮT BUỘC**: Tất cả endpoints đều yêu cầu authentication.

### Headers Required

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Token Format

Token được lấy từ login API, có dạng JWT token. Token phải được gửi kèm trong header `Authorization` của mọi request.

---

## 📦 Response Format

Tất cả API responses đều tuân theo format chuẩn:

### Success Response

```typescript
{
  status: number;           // HTTP status code (200, 201, etc.)
  message: string;          // Success message
  data: T;                  // Response data (generic type)
  api_version: string;       // "v1"
  provider: string;         // "cdudu"
  meta?: Record<string, any>; // Optional metadata
}
```

### Error Response

```typescript
{
  status: number;           // HTTP status code (400, 401, 404, 500, etc.)
  message: string;          // Error message
  error: {
    code: string;           // Error code (e.g., "VALIDATION_ERROR", "AUTH_ERROR")
    details?: any;          // Additional error details
    requestId?: string;     // Request ID for tracking
  };
  api_version: string;      // "v1"
  provider: string;         // "cdudu"
}
```

---

## 🎯 API Endpoints

### 1. GET /api/v1/admin/service-packages

**Mô tả**: Lấy danh sách các service packages có sẵn.

**Query Parameters**:
- `service` (optional): Filter theo service type
  - Values: `whatsapp`, `facebook`, `instagram`, `tiktok`, `zalo`, `messenger`

**Request Example**:
```typescript
// Get all packages
GET /api/v1/admin/service-packages
Authorization: Bearer <token>

// Get packages for specific service
GET /api/v1/admin/service-packages?service=whatsapp
Authorization: Bearer <token>
```

**Response Example** (200 OK):
```json
{
  "status": 200,
  "message": "Service packages retrieved successfully",
  "data": [
    {
      "id": "pkg_123",
      "name": "WhatsApp Business Package",
      "description": "Gói dịch vụ WhatsApp Business",
      "service": "whatsapp",
      "pricePerMonth": 50000,
      "minDuration": 1,
      "imageUrl": "https://example.com/image.jpg",
      "isActive": true,
      "sortOrder": 0,
      "features": {
        "messages": "unlimited",
        "support": "24/7"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Error Responses**:
- `401 Unauthorized`: Token không hợp lệ hoặc thiếu
- `500 Internal Server Error`: Lỗi server

**Frontend Implementation**:
```typescript
interface ServicePackage {
  id: string;
  name: string;
  description?: string;
  service: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'zalo' | 'messenger';
  pricePerMonth: number;
  minDuration: number;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  features?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

async function getServicePackages(service?: string): Promise<ServicePackage[]> {
  const url = service 
    ? `/api/v1/admin/service-packages?service=${service}`
    : '/api/v1/admin/service-packages';
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch service packages');
  }
  
  const result = await response.json();
  return result.data;
}
```

---

### 2. POST /api/v1/admin/service-packages/:packageId/purchase

**Mô tả**: Đăng ký mua một service package.

**Path Parameters**:
- `packageId` (required): ID của package cần mua

**Request Body**:
```typescript
{
  duration: number;  // Số tháng (tối thiểu 1, tối đa theo package)
}
```

**Request Example**:
```typescript
POST /api/v1/admin/service-packages/pkg_123/purchase
Authorization: Bearer <token>
Content-Type: application/json

{
  "duration": 3
}
```

**Response Example** (200 OK):
```json
{
  "status": 200,
  "message": "Đã mua gói WhatsApp Business Package 3 tháng thành công",
  "data": {
    "subscriptionId": "sub_456",
    "packageId": "pkg_123",
    "packageName": "WhatsApp Business Package",
    "duration": 3,
    "totalPrice": 150000,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-04-01T00:00:00Z",
    "status": "active"
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Error Responses**:
- `400 Bad Request`: 
  - `INSUFFICIENT_VND_BALANCE`: Không đủ số dư VND trong wallet
  - `VALIDATION_ERROR`: Duration không hợp lệ (phải >= 1)
- `401 Unauthorized`: Token không hợp lệ
- `404 Not Found`: Package không tồn tại
- `500 Internal Server Error`: Lỗi server

**Frontend Implementation**:
```typescript
interface PurchaseRequest {
  duration: number;
}

interface PurchaseResult {
  subscriptionId: string;
  packageId: string;
  packageName: string;
  duration: number;
  totalPrice: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
}

async function purchasePackage(
  packageId: string, 
  duration: number
): Promise<PurchaseResult> {
  const response = await fetch(
    `/api/v1/admin/service-packages/${packageId}/purchase`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ duration }),
    }
  );
  
  const result = await response.json();
  
  if (!response.ok) {
    // Handle specific error codes
    if (result.error?.code === 'INSUFFICIENT_VND_BALANCE') {
      throw new Error('Không đủ số dư VND. Vui lòng nạp thêm tiền vào wallet.');
    }
    throw new Error(result.message || 'Failed to purchase package');
  }
  
  return result.data;
}
```

---

### 3. GET /api/v1/admin/service-packages/subscriptions

**Mô tả**: Lấy danh sách tất cả subscriptions của tenant (bao gồm cả active và expired).

**Request Example**:
```typescript
GET /api/v1/admin/service-packages/subscriptions
Authorization: Bearer <token>
```

**Response Example** (200 OK):
```json
{
  "status": 200,
  "message": "Tenant subscriptions retrieved successfully",
  "data": [
    {
      "id": "sub_456",
      "packageId": "pkg_123",
      "packageName": "WhatsApp Business Package",
      "service": "whatsapp",
      "duration": 3,
      "totalPrice": 150000,
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-04-01T00:00:00Z",
      "status": "active",
      "isCancelled": false,
      "cancelledAt": null,
      "package": {
        "id": "pkg_123",
        "name": "WhatsApp Business Package",
        "imageUrl": "https://example.com/image.jpg",
        "features": {}
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Error Responses**:
- `401 Unauthorized`: Token không hợp lệ
- `500 Internal Server Error`: Lỗi server

**Frontend Implementation**:
```typescript
interface Subscription {
  id: string;
  packageId: string;
  packageName: string;
  service: string;
  duration: number;
  totalPrice: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  isCancelled: boolean;
  cancelledAt: string | null;
  package: {
    id: string;
    name: string;
    imageUrl?: string;
    features?: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}

async function getSubscriptions(): Promise<Subscription[]> {
  const response = await fetch(
    '/api/v1/admin/service-packages/subscriptions',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch subscriptions');
  }
  
  const result = await response.json();
  return result.data;
}
```

---

### 4. GET /api/v1/admin/service-packages/my-subscriptions

**Mô tả**: Lấy danh sách các subscriptions đang active (tối ưu cho sidebar).

**Request Example**:
```typescript
GET /api/v1/admin/service-packages/my-subscriptions
Authorization: Bearer <token>
```

**Response Example** (200 OK):
```json
{
  "status": 200,
  "message": "Active subscriptions retrieved successfully",
  "data": [
    {
      "id": "sub_456",
      "packageId": "pkg_123",
      "packageName": "WhatsApp Business Package",
      "service": "whatsapp",
      "endDate": "2024-04-01T00:00:00Z",
      "status": "active",
      "package": {
        "id": "pkg_123",
        "name": "WhatsApp Business Package",
        "imageUrl": "https://example.com/image.jpg"
      }
    }
  ],
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Lưu ý**: Response này được tối ưu, chỉ trả về thông tin cần thiết cho sidebar (không có full details như endpoint `/subscriptions`).

**Error Responses**:
- `401 Unauthorized`: Token không hợp lệ
- `500 Internal Server Error`: Lỗi server

**Frontend Implementation**:
```typescript
interface ActiveSubscription {
  id: string;
  packageId: string;
  packageName: string;
  service: string;
  endDate: string;
  status: 'active';
  package: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

async function getActiveSubscriptions(): Promise<ActiveSubscription[]> {
  const response = await fetch(
    '/api/v1/admin/service-packages/my-subscriptions',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch active subscriptions');
  }
  
  const result = await response.json();
  return result.data;
}
```

---

### 5. GET /api/v1/admin/service-packages/check/:service

**Mô tả**: Kiểm tra nhanh xem một service có đang active không.

**Path Parameters**:
- `service` (required): Service type cần check
  - Values: `whatsapp`, `facebook`, `instagram`, `tiktok`, `zalo`, `messenger`

**Request Example**:
```typescript
GET /api/v1/admin/service-packages/check/whatsapp
Authorization: Bearer <token>
```

**Response Example** (200 OK):
```json
{
  "status": 200,
  "message": "Service status checked successfully",
  "data": {
    "service": "whatsapp",
    "isActive": true,
    "subscriptionId": "sub_456",
    "endDate": "2024-04-01T00:00:00Z",
    "daysRemaining": 45
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Response khi service không active**:
```json
{
  "status": 200,
  "message": "Service status checked successfully",
  "data": {
    "service": "whatsapp",
    "isActive": false,
    "subscriptionId": null,
    "endDate": null,
    "daysRemaining": 0
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Error Responses**:
- `401 Unauthorized`: Token không hợp lệ
- `500 Internal Server Error`: Lỗi server

**Frontend Implementation**:
```typescript
interface ServiceStatus {
  service: string;
  isActive: boolean;
  subscriptionId: string | null;
  endDate: string | null;
  daysRemaining: number;
}

async function checkServiceActive(service: string): Promise<ServiceStatus> {
  const response = await fetch(
    `/api/v1/admin/service-packages/check/${service}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to check service status');
  }
  
  const result = await response.json();
  return result.data;
}
```

---

### 6. POST /api/v1/admin/service-packages/subscriptions/:subscriptionId/cancel

**Mô tả**: Hủy một subscription đang active.

**Path Parameters**:
- `subscriptionId` (required): ID của subscription cần hủy

**Request Example**:
```typescript
POST /api/v1/admin/service-packages/subscriptions/sub_456/cancel
Authorization: Bearer <token>
```

**Response Example** (200 OK):
```json
{
  "status": 200,
  "message": "Đã hủy đăng ký gói dịch vụ",
  "data": null,
  "api_version": "v1",
  "provider": "cdudu"
}
```

**Error Responses**:
- `400 Bad Request`: 
  - Subscription không tồn tại
  - Subscription đã bị hủy trước đó
  - Subscription đã hết hạn
- `401 Unauthorized`: Token không hợp lệ
- `404 Not Found`: Subscription không tồn tại
- `500 Internal Server Error`: Lỗi server

**Frontend Implementation**:
```typescript
async function cancelSubscription(subscriptionId: string): Promise<void> {
  const response = await fetch(
    `/api/v1/admin/service-packages/subscriptions/${subscriptionId}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to cancel subscription');
  }
  
  // Success - subscription cancelled
  return;
}
```

---

## 🔧 Error Handling Best Practices

### 1. Centralized Error Handler

```typescript
interface ApiError {
  status: number;
  message: string;
  error: {
    code: string;
    details?: any;
    requestId?: string;
  };
}

async function handleApiError(response: Response): Promise<never> {
  const error: ApiError = await response.json();
  
  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'AUTH_ERROR': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    'INSUFFICIENT_VND_BALANCE': 'Không đủ số dư VND. Vui lòng nạp thêm tiền vào wallet.',
    'VALIDATION_ERROR': 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
    'NOT_FOUND_ERROR': 'Không tìm thấy tài nguyên.',
    'FORBIDDEN_ERROR': 'Bạn không có quyền thực hiện thao tác này.',
  };
  
  const userMessage = errorMessages[error.error.code] || error.message;
  
  throw new Error(userMessage);
}
```

### 2. Retry Logic (Optional)

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Retry on 5xx errors
      if (response.status >= 500 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}
```

---

## 📱 Complete Frontend Service Example

```typescript
/**
 * Service Packages API Service
 * 
 * Centralized service for all service package operations
 */

class ServicePackageService {
  private baseUrl = '/api/v1/admin/service-packages';
  
  private getHeaders(): HeadersInit {
    const token = this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
  
  private getAccessToken(): string {
    // Implement your token retrieval logic
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found');
    }
    return token;
  }
  
  private async handleResponse<T>(response: Response): Promise<T> {
    const result = await response.json();
    
    if (!response.ok) {
      const error = result.error || {};
      throw new Error(result.message || 'Request failed');
    }
    
    return result.data;
  }
  
  /**
   * Get all service packages
   */
  async getPackages(service?: string): Promise<ServicePackage[]> {
    const url = service 
      ? `${this.baseUrl}?service=${service}`
      : this.baseUrl;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<ServicePackage[]>(response);
  }
  
  /**
   * Purchase a service package
   */
  async purchasePackage(
    packageId: string,
    duration: number
  ): Promise<PurchaseResult> {
    const response = await fetch(
      `${this.baseUrl}/${packageId}/purchase`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ duration }),
      }
    );
    
    return this.handleResponse<PurchaseResult>(response);
  }
  
  /**
   * Get all subscriptions
   */
  async getSubscriptions(): Promise<Subscription[]> {
    const response = await fetch(
      `${this.baseUrl}/subscriptions`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    
    return this.handleResponse<Subscription[]>(response);
  }
  
  /**
   * Get active subscriptions (for sidebar)
   */
  async getActiveSubscriptions(): Promise<ActiveSubscription[]> {
    const response = await fetch(
      `${this.baseUrl}/my-subscriptions`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    
    return this.handleResponse<ActiveSubscription[]>(response);
  }
  
  /**
   * Check if service is active
   */
  async checkServiceActive(service: string): Promise<ServiceStatus> {
    const response = await fetch(
      `${this.baseUrl}/check/${service}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    
    return this.handleResponse<ServiceStatus>(response);
  }
  
  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    );
    
    await this.handleResponse<void>(response);
  }
}

// Export singleton instance
export const servicePackageService = new ServicePackageService();
```

---

## 🎨 UI/UX Recommendations

### 1. Loading States

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handlePurchase(packageId: string, duration: number) {
  setLoading(true);
  setError(null);
  
  try {
    const result = await servicePackageService.purchasePackage(packageId, duration);
    // Show success message
    toast.success(result.message || 'Đăng ký thành công!');
    // Refresh subscriptions
    await refreshSubscriptions();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    toast.error(error);
  } finally {
    setLoading(false);
  }
}
```

### 2. Confirmation Dialog

```typescript
async function handleCancelSubscription(subscriptionId: string) {
  const confirmed = await showConfirmDialog({
    title: 'Xác nhận hủy đăng ký',
    message: 'Bạn có chắc chắn muốn hủy đăng ký gói dịch vụ này?',
    confirmText: 'Hủy đăng ký',
    cancelText: 'Hủy',
  });
  
  if (!confirmed) return;
  
  try {
    await servicePackageService.cancelSubscription(subscriptionId);
    toast.success('Đã hủy đăng ký thành công');
    await refreshSubscriptions();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
  }
}
```

### 3. Service Status Badge

```typescript
function ServiceStatusBadge({ service }: { service: string }) {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function checkStatus() {
      try {
        const result = await servicePackageService.checkServiceActive(service);
        setStatus(result);
      } catch (err) {
        console.error('Failed to check service status', err);
      } finally {
        setLoading(false);
      }
    }
    
    checkStatus();
  }, [service]);
  
  if (loading) return <Spinner />;
  
  if (!status?.isActive) {
    return <Badge color="red">Không active</Badge>;
  }
  
  return (
    <Badge color="green">
      Active - Còn {status.daysRemaining} ngày
    </Badge>
  );
}
```

---

## 📝 Notes

1. **Token Expiration**: Frontend nên handle token expiration và tự động refresh token hoặc redirect về login page.

2. **Rate Limiting**: API có rate limiting, frontend nên handle 429 status code và hiển thị thông báo phù hợp.

3. **Caching**: Có thể cache danh sách packages và subscriptions để giảm số lượng API calls. Tuy nhiên, cần invalidate cache khi có thay đổi (purchase, cancel).

4. **Real-time Updates**: Nếu cần real-time updates, có thể implement polling hoặc WebSocket để cập nhật subscription status.

5. **Error Tracking**: Nên log errors để tracking và debugging:
   ```typescript
   catch (error) {
     console.error('Service Package API Error:', {
       endpoint: url,
       error: error.message,
       timestamp: new Date().toISOString(),
     });
     // Send to error tracking service (Sentry, etc.)
   }
   ```

---

## ✅ Testing Checklist

- [ ] Test với valid token
- [ ] Test với invalid/expired token (401)
- [ ] Test purchase với đủ số dư
- [ ] Test purchase với không đủ số dư (400)
- [ ] Test cancel subscription
- [ ] Test check service status
- [ ] Test error handling
- [ ] Test loading states
- [ ] Test với network errors
- [ ] Test với rate limiting (429)

---

**Version**: 1.0  
**Last Updated**: 2024-01-01  
**Maintained by**: Backend Team

