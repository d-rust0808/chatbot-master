# API Tạo Service Package - Quick Reference

## 🚀 Endpoint
```
POST /api/v1/admin/service-packages
```

## 🔑 Authentication
```
Authorization: Bearer <JWT_TOKEN>
Role: sp-admin (Super Admin only)
```

## 📦 Request Format
```
Content-Type: multipart/form-data
```

### Required Fields
- `name` (string): Tên gói dịch vụ
- `service` (string): `whatsapp` | `facebook` | `instagram` | `tiktok` | `zalo`
- `pricePerMonth` (number): Giá mỗi tháng (VND), phải > 0

### Optional Fields
- `description` (string): Mô tả
- `minDuration` (number): Thời gian tối thiểu (tháng), default: 1
- `sortOrder` (number): Thứ tự sắp xếp, default: 0
- `image` (file): Ảnh đại diện, max 5MB

## ✅ Success Response (201)
```json
{
  "success": true,
  "message": "Service package created successfully",
  "data": {
    "id": "pkg_abc123",
    "name": "WhatsApp Business Pro",
    "service": "whatsapp",
    "pricePerMonth": 50000,
    "imageUrl": "https://cchatbot.pro/uploads/service-packages/pkg_abc123.jpg",
    ...
  }
}
```

## ❌ Common Errors

### 400 - Missing Required Fields
```json
{
  "error": {
    "message": "Missing required fields: name, service, pricePerMonth"
  }
}
```

### 400 - Invalid Content-Type
```json
{
  "error": {
    "message": "Content-Type must be multipart/form-data"
  }
}
```

### 401 - Unauthorized
```json
{
  "error": {
    "message": "Missing or invalid authorization header"
  }
}
```

### 403 - Forbidden
```json
{
  "error": {
    "message": "Forbidden: Super admin only"
  }
}
```

## 💻 Code Example (JavaScript)

```javascript
const formData = new FormData();
formData.append('name', 'WhatsApp Business Pro');
formData.append('service', 'whatsapp');
formData.append('pricePerMonth', '50000');
formData.append('description', 'Gói dịch vụ WhatsApp Business Pro');

// Optional: Add image
if (imageFile) {
  formData.append('image', imageFile);
}

fetch('https://cchatbot.pro/api/v1/admin/service-packages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    // DON'T set Content-Type - browser will set it automatically
  },
  body: formData,
})
  .then(res => res.json())
  .then(data => console.log('Success:', data))
  .catch(err => console.error('Error:', err));
```

## 🐛 Troubleshooting

### Request không đến được backend?
1. ✅ Kiểm tra URL: `/api/v1/admin/service-packages` (có `/api/v1`)
2. ✅ Kiểm tra CORS: Backend cho phép origin của frontend
3. ✅ Kiểm tra Network tab: Request có được gửi đi không?
4. ✅ Kiểm tra backend logs: Có log "Admin route request" không?

### 400 - Content-Type must be multipart/form-data?
- ✅ Sử dụng `FormData` object
- ✅ KHÔNG set `Content-Type` header manually
- ✅ Để browser tự động set với boundary

### 401/403?
- ✅ Token hợp lệ và chưa expired?
- ✅ User có role `sp-admin`?
- ✅ Header format: `Bearer <token>`

## 📚 Full Documentation
Xem file `API_SERVICE_PACKAGE_CREATE.md` để biết chi tiết.

