# Chatbot Service API – Frontend Integration Guide

## 1. Roles & Base URLs

- **SP-Admin** (super admin – hệ thống tổng):
  - Base: `https://cchatbot.pro/api/v1/admin`
  - Header: `Authorization: Bearer <sp-admin-access-token>`

- **Tenant Admin** (admin của từng shop/tenant):
  - Base: `https://cchatbot.pro/api/v1`
  - Header: `Authorization: Bearer <tenant-access-token>`

---

## 2. SP-Admin – Quản lý gói dịch vụ (Service Packages)

### 2.1. Lấy danh sách gói dịch vụ

- **Method**: `GET /admin/service-packages`
- **Query (optional)**:
  - `service`: `whatsapp|messenger|tiktok|zalo|instagram`
  - `isActive`: `true|false`

**Request example:**

```http
GET /api/v1/admin/service-packages?service=whatsapp&isActive=true
Authorization: Bearer <sp-admin-token>
```

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "pkg_123",
      "name": "Gói WhatsApp",
      "description": "Chatbot WhatsApp",
      "service": "whatsapp",
      "pricePerMonth": 100000,
      "minDuration": 1,
      "imageUrl": "/uploads/service-packages/xxx.jpg",
      "features": { "bots": 1, "messagesPerMonth": 5000 },
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "2026-01-09T00:00:00.000Z",
      "updatedAt": "2026-01-09T00:00:00.000Z"
    }
  ]
}
```

---

### 2.2. Tạo gói dịch vụ (kèm upload ảnh)

- **Method**: `POST /admin/service-packages`
- **Content-Type**: `multipart/form-data`
- **Role**: `sp-admin`

**Fields (form-data):**

- `name` (string, required)
- `description` (string, optional)
- `service` (string, required): `whatsapp|messenger|tiktok|zalo|instagram`
- `pricePerMonth` (number, required, VNĐ/tháng)
- `minDuration` (number, optional, default 1 – số tháng tối thiểu)
- `image` (file, optional – jpg/png/webp, max 5MB)
- `features` (string JSON, optional – frontend stringify object)
- `sortOrder` (number, optional)

**Request example (cURL):**

```bash
curl -X POST https://cchatbot.pro/api/v1/admin/service-packages \
  -H "Authorization: Bearer <sp-admin-token>" \
  -F "name=Gói WhatsApp" \
  -F "description=Dịch vụ chatbot WhatsApp" \
  -F "service=whatsapp" \
  -F "pricePerMonth=100000" \
  -F "minDuration=1" \
  -F "sortOrder=0" \
  -F "features={\"bots\":1,\"messagesPerMonth\":5000}" \
  -F "image=@/path/to/image.jpg"
```

**Frontend (JS/TS) example:**

```ts
const formData = new FormData();
formData.append('name', values.name);
formData.append('description', values.description || '');
formData.append('service', values.service); // whatsapp...
formData.append('pricePerMonth', String(values.pricePerMonth));
formData.append('minDuration', String(values.minDuration ?? 1));
formData.append('sortOrder', String(values.sortOrder ?? 0));
formData.append('features', JSON.stringify(values.features || {}));
if (values.imageFile) {
  formData.append('image', values.imageFile);
}

await fetch('https://cchatbot.pro/api/v1/admin/service-packages', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${spAdminToken}`,
  },
  body: formData,
});
```

---

### 2.3. Lấy chi tiết gói dịch vụ

- **Method**: `GET /admin/service-packages/:id`

```http
GET /api/v1/admin/service-packages/pkg_123
Authorization: Bearer <sp-admin-token>
```

**Response 200:** cùng cấu trúc 1 object trong danh sách ở 2.1.

---

### 2.4. Cập nhật gói dịch vụ (kèm upload ảnh mới)

- **Method**: `PUT /admin/service-packages/:id`
- **Content-Type**: `multipart/form-data`
- Chỉ gửi field muốn đổi (partial update).

**Fields giống 2.2**, tất cả optional.

**Ví dụ:** muốn update giá + ảnh:

```bash
curl -X PUT https://cchatbot.pro/api/v1/admin/service-packages/pkg_123 \
  -H "Authorization: Bearer <sp-admin-token>" \
  -F "pricePerMonth=150000" \
  -F "image=@/path/to/new-image.jpg"
```

---

### 2.5. Xoá (soft delete) gói dịch vụ

- **Method**: `DELETE /admin/service-packages/:id`
- Soft delete: `isActive` = `false`. Không xoá nếu có subscription còn active.

```http
DELETE /api/v1/admin/service-packages/pkg_123
Authorization: Bearer <sp-admin-token>
```

**Response 200:**

```json
{
  "success": true,
  "message": "Đã xóa gói dịch vụ thành công"
}
```

**Response 400 (có active subscription):**

```json
{
  "error": {
    "message": "Cannot delete service package with active subscriptions",
    "statusCode": 400
  }
}
```

---

## 3. Tenant Admin – Đăng ký dịch vụ & Subscription

**Base URL (tenant admin)**: `https://cchatbot.pro/api/v1/service-packages`

Header bắt buộc:

```http
Authorization: Bearer <tenant-access-token>
```

### 3.1. Lấy danh sách gói dịch vụ cho marketplace

- **Method**: `GET /service-packages`
- Public (không cần Authorization) – nhưng frontend vẫn có thể gửi token.
- Query: `?service=whatsapp` (optional)

```http
GET /api/v1/service-packages?service=whatsapp
```

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "pkg_123",
      "name": "Gói WhatsApp",
      "description": "Chatbot WhatsApp",
      "service": "whatsapp",
      "pricePerMonth": 100000,
      "minDuration": 1,
      "features": { "bots": 1, "messagesPerMonth": 5000 }
    }
  ]
}
```

> Dùng API này để render danh sách gói cho màn **Chọn dịch vụ**.

---

### 3.2. Admin mua gói dịch vụ (đăng ký dịch vụ)

- **Method**: `POST /service-packages/:packageId/purchase`
- **Body (JSON)**:
  - `duration`: `1–5` (số tháng đăng ký)
- Thanh toán bằng **VND Wallet** của tenant; nếu không đủ sẽ trả lỗi.

**Request:**

```http
POST /api/v1/service-packages/pkg_123/purchase
Authorization: Bearer <tenant-token>
Content-Type: application/json

{
  "duration": 3
}
```

**Response 200 (success):**

```json
{
  "success": true,
  "message": "Đã mua gói Gói WhatsApp 3 tháng thành công",
  "data": {
    "subscriptionId": "sub_123",
    "packageName": "Gói WhatsApp",
    "service": "whatsapp",
    "duration": 3,
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-04-01T00:00:00.000Z",
    "price": 300000
  }
}
```

**Response 400 – không đủ tiền:**

```json
{
  "error": {
    "code": "INSUFFICIENT_VND_BALANCE",
    "message": "Insufficient VND balance to purchase service package",
    "statusCode": 400
  }
}
```

> Flow UI: trước khi gọi API này, frontend nên hiển thị số dư VND (từ `GET /credits/vnd-balance`).

---

### 3.3. Lấy danh sách subscription chi tiết

- **Method**: `GET /service-packages/subscriptions`
- Trả về đầy đủ thông tin package + ngày bắt đầu/kết thúc + daysRemaining.

```http
GET /api/v1/service-packages/subscriptions
Authorization: Bearer <tenant-token>
```

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "sub_123",
      "package": {
        "id": "pkg_123",
        "name": "Gói WhatsApp",
        "description": "Chatbot WhatsApp",
        "service": "whatsapp",
        "pricePerMonth": 100000,
        "minDuration": 1,
        "features": { "bots": 1, "messagesPerMonth": 5000 },
        "imageUrl": "/uploads/service-packages/xxx.jpg"
      },
      "duration": 3,
      "price": 300000,
      "status": "active",
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-04-01T00:00:00.000Z",
      "autoRenew": false,
      "daysRemaining": 45
    }
  ]
}
```

> Dùng cho màn quản lý subscription chi tiết trong trang dịch vụ.

---

### 3.4. API cho Sidebar – Dịch vụ đang kích hoạt

#### 3.4.1. Lấy dịch vụ đang active cho sidebar

- **Method**: `GET /service-packages/my-subscriptions`
- Tối ưu cho sidebar: trả về list gọn, đủ để render menu/config.

```http
GET /api/v1/service-packages/my-subscriptions
Authorization: Bearer <tenant-token>
```

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "sub_123",
      "service": "whatsapp",
      "serviceName": "Gói WhatsApp",
      "imageUrl": "/uploads/service-packages/xxx.jpg",
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-04-01T00:00:00.000Z",
      "daysRemaining": 45,
      "isActive": true
    }
  ]
}
```

> Gợi ý UI: render list này trong sidebar, mỗi item tương ứng 1 nền tảng (WhatsApp, Messenger, ...). Khi user click → mở trang config tương ứng.

#### 3.4.2. Kiểm tra 1 service có đang active không

- **Method**: `GET /service-packages/check/:service`
- Ví dụ: `:service = whatsapp`

```http
GET /api/v1/service-packages/check/whatsapp
Authorization: Bearer <tenant-token>
```

**Response 200 (active):**

```json
{
  "success": true,
  "data": {
    "isActive": true,
    "subscription": {
      "id": "sub_123",
      "service": "whatsapp",
      "serviceName": "Gói WhatsApp",
      "imageUrl": "/uploads/service-packages/xxx.jpg",
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-04-01T00:00:00.000Z",
      "daysRemaining": 45
    }
  }
}
```

**Response 200 (không active):**

```json
{
  "success": true,
  "data": {
    "isActive": false,
    "subscription": null
  }
}
```

> Dùng để:
> - Ẩn/disable các tính năng WhatsApp nếu chưa đăng ký hoặc đã hết hạn.
> - Redirect user sang trang mua dịch vụ nếu `isActive = false`.

---

### 3.5. Huỷ subscription

- **Method**: `POST /service-packages/subscriptions/:subscriptionId/cancel`

```http
POST /api/v1/service-packages/subscriptions/sub_123/cancel
Authorization: Bearer <tenant-token>
```

**Response 200:**

```json
{
  "success": true,
  "message": "Đã hủy đăng ký gói dịch vụ"
}
```

> Lưu ý: backend chỉ cho huỷ khi status = `active`.

---

## 4. Gợi ý tích hợp Frontend

### 4.1. Flow cho SP-Admin (quản lý gói)

1. Trang danh sách gói:
   - Call `GET /admin/service-packages?service=&isActive=` để render bảng.

2. Trang tạo gói:
   - Form + upload ảnh → gửi `multipart/form-data` đến `POST /admin/service-packages`.

3. Trang sửa gói:
   - Load detail bằng `GET /admin/service-packages/:id`.
   - Submit `PUT /admin/service-packages/:id` (form-data, có thể đổi ảnh).

4. Xoá gói:
   - Gọi `DELETE /admin/service-packages/:id`.
   - Nếu nhận lỗi `Cannot delete service package with active subscriptions` → hiển thị cảnh báo.

### 4.2. Flow cho Tenant Admin (đăng ký và config dịch vụ)

1. Trang marketplace dịch vụ:
   - Lấy list gói bằng `GET /service-packages?service=`.
   - Hiển thị giá/thời gian/feature.

2. Đăng ký gói:
   - User chọn số tháng `duration` (1–5).
   - Gọi `POST /service-packages/:packageId/purchase`.
   - Nếu 400 + code `INSUFFICIENT_VND_BALANCE` → điều hướng sang màn nạp tiền.

3. Sidebar hiển thị dịch vụ đã đăng ký:
   - Gọi `GET /service-packages/my-subscriptions` sau khi login.
   - Lưu kết quả vào global state (Redux/Zustand/etc.).
   - Render mỗi subscription thành 1 menu item (WhatsApp, Messenger, ...).

4. Trước khi vào màn config 1 nền tảng (vd `/whatsapp`):
   - Option A: Dùng data từ `my-subscriptions`.
   - Option B: Gọi `GET /service-packages/check/whatsapp` để verify.
   - Nếu `isActive = false` → redirect về trang marketplace.

---

## 5. Headers & Auth Summary

### SP-Admin

```http
Authorization: Bearer <sp-admin-access-token>
```

### Tenant Admin

```http
Authorization: Bearer <tenant-access-token>
X-Tenant-Slug: <tenant-slug-optional-if-used>
```

---

## 6. Quick Checklist cho Frontend

- [ ] Login flow trả về `accessToken` + thông tin `role` (`sp-admin` vs `admin`).
- [ ] SP-Admin:
  - [ ] Màn quản lý gói dịch vụ (list/create/update/delete).
  - [ ] Form upload ảnh (multipart/form-data).
- [ ] Tenant Admin:
  - [ ] Màn marketplace chọn gói dịch vụ.
  - [ ] Gọi `POST /service-packages/:packageId/purchase` với `duration`.
  - [ ] Nối với VNĐ wallet (hiển thị số dư, xử lý lỗi thiếu tiền).
  - [ ] Sidebar dùng `GET /service-packages/my-subscriptions`.
  - [ ] Check quyền dịch vụ bằng `GET /service-packages/check/:service`.

