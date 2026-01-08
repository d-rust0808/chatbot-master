# Payment API Documentation - Frontend Guide

## Tổng quan

Payment API cho phép frontend tích hợp tính năng nạp tiền qua Sepay (QR Code). API hỗ trợ:
- Tạo lệnh nạp tiền với QR Code
- Xem lịch sử giao dịch
- Kiểm tra trạng thái payment
- Hủy payment đang pending
- Tự động xử lý expired payments

**Base URL**: `/api/v1/admin/payments`

**Authentication**: Tất cả endpoints (trừ webhook) yêu cầu:
- JWT Token trong header: `Authorization: Bearer <token>`
- User phải có role `admin` hoặc `owner`

---

## Payment Status

Payment có các trạng thái sau:

| Status | Mô tả | Hành động |
|--------|-------|-----------|
| `pending` | Đang chờ thanh toán | User có thể thanh toán hoặc hủy |
| `completed` | Đã thanh toán thành công | Tiền đã được cộng vào wallet |
| `expired` | Đã hết hạn (quá 15 phút) | Tự động hủy khi tạo payment mới |
| `cancelled` | Đã bị hủy | Không thể sử dụng |
| `processing` | Đang xử lý (webhook) | Chờ hệ thống xử lý |

---

## API Endpoints

### 1. Tạo lệnh nạp tiền

**POST** `/api/v1/admin/payments`

Tạo lệnh nạp tiền mới. Hệ thống sẽ:
- Tự động trả về payment pending nếu còn hiệu lực (chưa hết hạn)
- Tự động hủy expired payments và cho phép tạo mới
- Tạo QR Code thanh toán tự động

#### Request Body

```json
{
  "amount": 100000
}
```

**Validation**:
- `amount`: Số nguyên, tối thiểu 10,000 VNĐ

#### Response Success (201)

```json
{
  "success": true,
  "message": "Tạo lệnh nạp tiền thành công",
  "data": {
    "id": "payment_id",
    "code": "ABC12345",
    "amount": 100000,
    "qrCode": "https://qr.sepay.vn/img?acc=...",
    "qrCodeData": "{\"account\":\"...\",\"bank\":\"...\",\"amount\":100000,\"content\":\"ABC12345\"}",
    "expiresAt": "2026-01-08T21:15:00.000Z",
    "paymentInfo": {
      "account": "0123456789",
      "bank": "VCB",
      "amount": 100000,
      "content": "ABC12345"
    }
  }
}
```

#### Response Error (400)

```json
{
  "error": {
    "message": "Số tiền tối thiểu là 10,000 VNĐ",
    "statusCode": 400
  }
}
```

#### Logic đặc biệt

1. **Nếu có payment pending chưa hết hạn**: Trả về payment đó (không tạo mới)
   - Frontend nên hiển thị QR Code cũ và thông báo "Bạn đang có giao dịch đang chờ thanh toán"

2. **Nếu có payment expired**: Tự động hủy và tạo payment mới
   - Frontend không cần xử lý gì, hệ thống tự động xử lý

#### Example (JavaScript/TypeScript)

```typescript
async function createPayment(amount: number) {
  const response = await fetch('/api/v1/admin/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ amount })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  const data = await response.json();
  return data.data;
}

// Usage
try {
  const payment = await createPayment(100000);
  console.log('QR Code:', payment.qrCode);
  console.log('Mã giao dịch:', payment.code);
  console.log('Hết hạn lúc:', payment.expiresAt);
} catch (error) {
  console.error('Lỗi:', error.message);
}
```

---

### 2. Lấy lịch sử giao dịch

**GET** `/api/v1/admin/payments`

Lấy danh sách payments của user hiện tại với pagination.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Số trang |
| `limit` | number | No | 20 | Số items mỗi trang (max: 100) |
| `status` | string | No | - | Lọc theo status (`pending`, `completed`, `expired`, `cancelled`) |

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "payment_id",
      "code": "ABC12345",
      "amount": 100000,
      "status": "completed",
      "qrCode": "https://qr.sepay.vn/img?...",
      "expiresAt": "2026-01-08T21:15:00.000Z",
      "createdAt": "2026-01-08T21:00:00.000Z",
      "completedAt": "2026-01-08T21:05:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### Example

```typescript
async function getPaymentHistory(page = 1, limit = 20, status?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(status && { status })
  });
  
  const response = await fetch(`/api/v1/admin/payments?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data;
}
```

---

### 3. Lấy chi tiết payment

**GET** `/api/v1/admin/payments/:id`

Lấy thông tin chi tiết của một payment.

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "id": "payment_id",
    "code": "ABC12345",
    "amount": 100000,
    "status": "pending",
    "qrCode": "https://qr.sepay.vn/img?...",
    "qrCodeData": "{...}",
    "expiresAt": "2026-01-08T21:15:00.000Z",
    "createdAt": "2026-01-08T21:00:00.000Z",
    "completedAt": null,
    "cancelledAt": null,
    "webhookData": null
  }
}
```

#### Response Error (404)

```json
{
  "error": {
    "message": "Payment not found",
    "statusCode": 404
  }
}
```

---

### 4. Lấy payment đang pending

**GET** `/api/v1/admin/payments/pending`

Lấy payment đang pending (chưa hết hạn) của user hiện tại. Hữu ích khi user quay lại trang và muốn tiếp tục thanh toán.

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "id": "payment_id",
    "code": "ABC12345",
    "amount": 100000,
    "status": "pending",
    "qrCode": "https://qr.sepay.vn/img?...",
    "expiresAt": "2026-01-08T21:15:00.000Z",
    "paymentInfo": {
      "account": "0123456789",
      "bank": "VCB",
      "amount": 100000,
      "content": "ABC12345"
    }
  }
}
```

#### Response Error (404)

```json
{
  "error": {
    "message": "No pending payment found",
    "statusCode": 404
  }
}
```

#### Use Case

```typescript
// Khi user vào trang nạp tiền, kiểm tra xem có payment pending không
async function checkPendingPayment() {
  try {
    const response = await fetch('/api/v1/admin/payments/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data; // Có payment pending
    }
    
    return null; // Không có payment pending
  } catch (error) {
    return null;
  }
}
```

---

### 5. Hủy payment đang pending

**DELETE** `/api/v1/admin/payments/pending`

Hủy payment pending đầu tiên (mới nhất) của user.

#### Response Success (200)

```json
{
  "success": true,
  "message": "Payment đã được hủy thành công",
  "data": {
    "id": "payment_id",
    "code": "ABC12345",
    "status": "cancelled"
  }
}
```

#### Response Error (404)

```json
{
  "error": {
    "message": "Không tìm thấy payment đang chờ thanh toán",
    "statusCode": 404
  }
}
```

---

### 6. Hủy payment theo ID

**DELETE** `/api/v1/admin/payments/:id`

Hủy một payment cụ thể theo ID.

#### Response Success (200)

```json
{
  "success": true,
  "message": "Payment đã được hủy thành công"
}
```

---

### 7. Kiểm tra trạng thái payment theo code

**GET** `/api/v1/admin/payments/status/:code`

Kiểm tra trạng thái payment theo mã giao dịch (8 ký tự). Endpoint này có thể dùng để polling status.

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "code": "ABC12345",
    "status": "pending",
    "amount": 100000
  }
}
```

#### Example: Polling payment status

```typescript
async function pollPaymentStatus(code: string, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`/api/v1/admin/payments/status/${code}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.data.status === 'completed') {
        return { success: true, payment: data.data };
      }
      
      if (data.data.status === 'expired' || data.data.status === 'cancelled') {
        return { success: false, status: data.data.status };
      }
    }
    
    // Đợi 5 giây trước khi check lại
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  return { success: false, message: 'Timeout' };
}
```

---

## Payment Flow - Best Practices

### Flow 1: Tạo payment mới

```typescript
async function createNewPayment(amount: number) {
  try {
    // 1. Tạo payment
    const payment = await createPayment(amount);
    
    // 2. Hiển thị QR Code
    displayQRCode(payment.qrCode);
    
    // 3. Hiển thị thông tin thanh toán
    showPaymentInfo({
      account: payment.paymentInfo.account,
      bank: payment.paymentInfo.bank,
      amount: payment.amount,
      content: payment.code,
      expiresAt: payment.expiresAt
    });
    
    // 4. Bắt đầu polling status (optional)
    startPollingStatus(payment.code);
    
    return payment;
  } catch (error) {
    showError(error.message);
    throw error;
  }
}
```

### Flow 2: Kiểm tra payment pending khi vào trang

```typescript
async function initializePaymentPage() {
  // 1. Kiểm tra có payment pending không
  const pendingPayment = await checkPendingPayment();
  
  if (pendingPayment) {
    // Có payment pending → hiển thị QR Code cũ
    displayQRCode(pendingPayment.qrCode);
    showPaymentInfo(pendingPayment.paymentInfo);
    showMessage('Bạn đang có giao dịch đang chờ thanh toán');
    
    // Bắt đầu polling
    startPollingStatus(pendingPayment.code);
    
    return { hasPending: true, payment: pendingPayment };
  }
  
  // Không có payment pending → sẵn sàng tạo mới
  return { hasPending: false };
}
```

### Flow 3: Polling payment status

```typescript
let pollingInterval: NodeJS.Timeout | null = null;

function startPollingStatus(code: string) {
  // Dừng polling cũ nếu có
  stopPollingStatus();
  
  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/v1/admin/payments/status/${code}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const status = data.data.status;
        
        if (status === 'completed') {
          stopPollingStatus();
          showSuccess('Thanh toán thành công!');
          refreshWallet(); // Refresh số dư wallet
          // Redirect hoặc reload page
        } else if (status === 'expired' || status === 'cancelled') {
          stopPollingStatus();
          showError('Giao dịch đã hết hạn hoặc bị hủy');
        }
        // pending → tiếp tục polling
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 5000); // Poll mỗi 5 giây
}

function stopPollingStatus() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}
```

### Flow 4: Hủy payment và tạo mới

```typescript
async function cancelAndCreateNew(amount: number) {
  try {
    // 1. Hủy payment pending hiện tại
    await cancelPendingPayment();
    
    // 2. Tạo payment mới
    const newPayment = await createPayment(amount);
    
    return newPayment;
  } catch (error) {
    // Nếu không có payment pending, vẫn có thể tạo mới
    if (error.message.includes('Không tìm thấy')) {
      return await createPayment(amount);
    }
    throw error;
  }
}
```

---

## Error Handling

### Common Errors

| Status Code | Error Message | Giải pháp |
|-------------|--------------|-----------|
| 400 | `Số tiền tối thiểu là 10,000 VNĐ` | Kiểm tra amount >= 10000 |
| 401 | `Unauthorized: User not found` | Kiểm tra token hợp lệ |
| 401 | `Unauthorized: Tenant not found` | User phải thuộc tenant |
| 404 | `Payment not found` | Payment không tồn tại hoặc không thuộc user |
| 404 | `No pending payment found` | Không có payment pending |

### Error Response Format

```json
{
  "error": {
    "message": "Error message",
    "statusCode": 400,
    "details": {} // Optional
  }
}
```

---

## Payment Expiry Logic

### Thời gian hết hạn
- **15 phút** từ lúc tạo payment
- Payment tự động chuyển sang `expired` sau 15 phút

### Tự động xử lý expired payments
- Khi user tạo payment mới, hệ thống tự động:
  1. Expire tất cả pending payments đã hết hạn
  2. Cancel tất cả expired payments
  3. Cho phép tạo payment mới

**Frontend không cần xử lý gì**, hệ thống tự động xử lý.

---

## QR Code Information

### QR Code URL
QR Code được tạo từ Sepay API:
```
https://qr.sepay.vn/img?acc={account}&bank={bank}&amount={amount}&des={code}&template={template}
```

### Thông tin thanh toán
Khi user quét QR Code hoặc chuyển khoản thủ công, cần:
- **Số tài khoản**: `paymentInfo.account`
- **Ngân hàng**: `paymentInfo.bank`
- **Số tiền**: `paymentInfo.amount`
- **Nội dung chuyển khoản**: `paymentInfo.content` (mã giao dịch 8 ký tự)

**Lưu ý**: Nội dung chuyển khoản **PHẢI** đúng mã giao dịch để hệ thống tự động nhận diện.

---

## TypeScript Types

```typescript
interface Payment {
  id: string;
  code: string;
  amount: number;
  status: 'pending' | 'completed' | 'expired' | 'cancelled' | 'processing';
  qrCode: string;
  qrCodeData: string;
  expiresAt: string; // ISO 8601
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  webhookData: any | null;
}

interface PaymentInfo {
  account: string;
  bank: string;
  amount: number;
  content: string; // Payment code
}

interface CreatePaymentRequest {
  amount: number; // >= 10000
}

interface CreatePaymentResponse {
  success: boolean;
  message: string;
  data: Payment & {
    paymentInfo: PaymentInfo;
  };
}

interface PaymentHistoryResponse {
  success: boolean;
  data: Payment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## Testing

### Test Cases

1. **Tạo payment mới**
   - ✅ Tạo thành công với amount >= 10000
   - ✅ Trả về QR Code và payment info
   - ❌ Lỗi nếu amount < 10000

2. **Payment pending**
   - ✅ Trả về payment pending nếu còn hiệu lực
   - ✅ Tự động hủy expired và tạo mới

3. **Polling status**
   - ✅ Tự động detect khi payment completed
   - ✅ Dừng polling khi expired/cancelled

4. **Hủy payment**
   - ✅ Hủy thành công payment pending
   - ✅ Lỗi nếu không có payment pending

---

## Notes

1. **Payment code**: 8 ký tự (A-Z0-9), unique
2. **Expiry time**: 15 phút từ lúc tạo
3. **Auto-cleanup**: Expired payments tự động bị cancel khi tạo mới
4. **Webhook**: Hệ thống tự động xử lý webhook từ Sepay, frontend không cần quan tâm
5. **Wallet**: Tiền được cộng vào VND wallet (không phải credit), user cần mua credit riêng

---

## Support

Nếu có vấn đề, vui lòng liên hệ backend team hoặc xem logs tại server.

