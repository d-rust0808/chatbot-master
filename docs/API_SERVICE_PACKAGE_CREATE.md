# API Tạo Service Package

## 📋 Tổng quan

API này cho phép Super Admin (sp-admin) tạo mới một service package với khả năng upload ảnh.

**Endpoint**: `POST /api/v1/admin/service-packages`

**Authentication**: Required (Bearer Token với role `sp-admin`)

**Content-Type**: `multipart/form-data`

---

## 🔐 Authentication

### Header Required
```
Authorization: Bearer <JWT_TOKEN>
```

### Role Required
- `sp-admin` (Super Admin only)

### Error Responses

#### 401 Unauthorized
```json
{
  "error": {
    "message": "Missing or invalid authorization header",
    "statusCode": 401
  }
}
```

#### 403 Forbidden
```json
{
  "error": {
    "message": "Forbidden: Super admin only",
    "statusCode": 403
  }
}
```

---

## 📤 Request Format

### Content-Type
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

### Form Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | ✅ Yes | Tên gói dịch vụ | "WhatsApp Business Pro" |
| `service` | string | ✅ Yes | Loại dịch vụ (platform) | "whatsapp", "facebook", "instagram", "tiktok", "zalo" |
| `pricePerMonth` | number | ✅ Yes | Giá mỗi tháng (VND) | 50000 |
| `description` | string | ❌ No | Mô tả gói dịch vụ | "Gói dịch vụ WhatsApp Business Pro với đầy đủ tính năng" |
| `minDuration` | number | ❌ No | Thời gian đăng ký tối thiểu (tháng). Default: 1 | 1 |
| `sortOrder` | number | ❌ No | Thứ tự sắp xếp. Default: 0 | 0 |
| `image` | file | ❌ No | Ảnh đại diện gói dịch vụ (max 5MB) | image.jpg |

### Request Example

#### JavaScript (FormData)
```javascript
const formData = new FormData();
formData.append('name', 'WhatsApp Business Pro');
formData.append('service', 'whatsapp');
formData.append('pricePerMonth', '50000');
formData.append('description', 'Gói dịch vụ WhatsApp Business Pro với đầy đủ tính năng');
formData.append('minDuration', '1');
formData.append('sortOrder', '0');

// Optional: Add image
const imageFile = document.querySelector('input[type="file"]').files[0];
if (imageFile) {
  formData.append('image', imageFile);
}

fetch('https://cchatbot.pro/api/v1/admin/service-packages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    // DON'T set Content-Type header - browser will set it automatically with boundary
  },
  body: formData,
})
  .then(response => response.json())
  .then(data => console.log('Success:', data))
  .catch(error => console.error('Error:', error));
```

#### cURL
```bash
curl -X POST https://cchatbot.pro/api/v1/admin/service-packages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=WhatsApp Business Pro" \
  -F "service=whatsapp" \
  -F "pricePerMonth=50000" \
  -F "description=Gói dịch vụ WhatsApp Business Pro với đầy đủ tính năng" \
  -F "minDuration=1" \
  -F "sortOrder=0" \
  -F "image=@/path/to/image.jpg"
```

#### Axios
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('name', 'WhatsApp Business Pro');
formData.append('service', 'whatsapp');
formData.append('pricePerMonth', '50000');
formData.append('description', 'Gói dịch vụ WhatsApp Business Pro');
formData.append('minDuration', '1');
formData.append('sortOrder', '0');

// Optional: Add image
if (imageFile) {
  formData.append('image', imageFile);
}

axios.post('https://cchatbot.pro/api/v1/admin/service-packages', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    // Axios will automatically set Content-Type to multipart/form-data
  },
})
  .then(response => console.log('Success:', response.data))
  .catch(error => console.error('Error:', error));
```

---

## ✅ Success Response

### Status Code: 201 Created

```json
{
  "success": true,
  "message": "Service package created successfully",
  "data": {
    "id": "pkg_abc123",
    "name": "WhatsApp Business Pro",
    "description": "Gói dịch vụ WhatsApp Business Pro với đầy đủ tính năng",
    "service": "whatsapp",
    "pricePerMonth": 50000,
    "minDuration": 1,
    "sortOrder": 0,
    "imageUrl": "https://cchatbot.pro/uploads/service-packages/pkg_abc123.jpg",
    "isActive": true,
    "createdAt": "2026-01-09T12:00:00.000Z",
    "updatedAt": "2026-01-09T12:00:00.000Z"
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

---

## ❌ Error Responses

### 400 Bad Request - Missing Required Fields
```json
{
  "error": {
    "message": "Missing required fields: name, service, pricePerMonth",
    "statusCode": 400,
    "details": {
      "name": "missing",
      "service": "missing",
      "pricePerMonth": "missing or invalid"
    }
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

### 400 Bad Request - Invalid Content-Type
```json
{
  "error": {
    "message": "Content-Type must be multipart/form-data",
    "statusCode": 400
  }
}
```

### 400 Bad Request - Multipart Parsing Error
```json
{
  "error": {
    "message": "Failed to parse multipart form data",
    "statusCode": 400,
    "details": "Error message here"
  },
  "api_version": "v1",
  "provider": "cdudu"
}
```

### 400 Bad Request - Invalid pricePerMonth
```json
{
  "error": {
    "message": "Missing required fields: name, service, pricePerMonth",
    "statusCode": 400,
    "details": {
      "pricePerMonth": "missing or invalid"
    }
  }
}
```

### 500 Internal Server Error
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

---

## 🔍 Validation Rules

### Required Fields
- `name`: Non-empty string
- `service`: Must be one of: `whatsapp`, `facebook`, `instagram`, `tiktok`, `zalo`
- `pricePerMonth`: Positive integer > 0

### Optional Fields
- `description`: String (max length: no limit, but recommended < 500 chars)
- `minDuration`: Integer >= 1 (default: 1)
- `sortOrder`: Integer (default: 0)
- `image`: Image file
  - Max size: 5MB
  - Supported formats: jpg, jpeg, png, gif, webp
  - Will be automatically resized/optimized if needed

---

## 🖼️ Image Upload

### Image Processing
- Image được lưu vào thư mục `public/uploads/service-packages/`
- Filename format: `{packageId}.{extension}`
- Image URL được trả về trong field `imageUrl`

### Image URL Format
```
https://cchatbot.pro/uploads/service-packages/{packageId}.jpg
```

### Image Requirements
- **Max file size**: 5MB
- **Supported formats**: jpg, jpeg, png, gif, webp
- **Recommended dimensions**: 800x600px hoặc 16:9 aspect ratio
- **Recommended format**: JPEG hoặc PNG

---

## 🐛 Troubleshooting

### Issue: Request không đến được backend

#### Kiểm tra:
1. **CORS**: Đảm bảo backend cho phép origin của frontend
   - Backend hiện tại cho phép tất cả origins (`*`)
   - Nếu vẫn lỗi, kiểm tra reverse proxy (nginx) có block không

2. **Network**: Kiểm tra network tab trong browser DevTools
   - Status code là gì?
   - Có error message không?
   - Request có được gửi đi không?

3. **Route matching**: Đảm bảo URL đúng format
   - ✅ Correct: `https://cchatbot.pro/api/v1/admin/service-packages`
   - ❌ Wrong: `https://cchatbot.pro/admin/service-packages` (thiếu `/api/v1`)
   - ❌ Wrong: `https://cchatbot.pro/api/v1/admin/service-package` (thiếu `s`)

4. **Content-Type**: Đảm bảo không set Content-Type header manually
   - ✅ Correct: Browser tự động set với boundary
   - ❌ Wrong: `Content-Type: multipart/form-data` (thiếu boundary)

5. **Authentication**: Kiểm tra token có hợp lệ không
   - Token có expired không?
   - Role có phải `sp-admin` không?
   - Token format: `Bearer <token>`

#### Debug Steps:
1. Thêm logging vào frontend:
```javascript
console.log('Request URL:', url);
console.log('Request headers:', headers);
console.log('Request body:', formData);
```

2. Kiểm tra Network tab:
   - Xem request có được gửi đi không
   - Xem response status code
   - Xem response body nếu có error

3. Kiểm tra backend logs:
   - Xem có log "Admin route request" không
   - Xem có log "POST /service-packages request received" không
   - Nếu không có log → request không đến được backend

### Issue: 400 Bad Request - Content-Type must be multipart/form-data

**Nguyên nhân**: Request không phải multipart/form-data

**Giải pháp**:
- Sử dụng `FormData` object
- Không set `Content-Type` header manually
- Để browser tự động set header với boundary

### Issue: 400 Bad Request - Missing required fields

**Nguyên nhân**: Thiếu field bắt buộc hoặc giá trị không hợp lệ

**Giải pháp**:
- Kiểm tra tất cả required fields đã có chưa
- Kiểm tra `pricePerMonth` là số > 0
- Kiểm tra `service` là một trong các giá trị hợp lệ

### Issue: 401 Unauthorized

**Nguyên nhân**: Token không hợp lệ hoặc thiếu

**Giải pháp**:
- Kiểm tra `Authorization` header có đúng format không
- Kiểm tra token có expired không
- Refresh token nếu cần

### Issue: 403 Forbidden

**Nguyên nhân**: User không có role `sp-admin`

**Giải pháp**:
- Đảm bảo user có role `sp-admin`
- Kiểm tra token có chứa role đúng không

---

## 📝 Notes

1. **Multipart Form Data**: API yêu cầu `multipart/form-data` để hỗ trợ upload file. Không thể dùng `application/json`.

2. **Image Upload**: Image là optional. Nếu không upload, `imageUrl` sẽ là `null`.

3. **Service Types**: Hiện tại hỗ trợ các service types:
   - `whatsapp`
   - `facebook`
   - `instagram`
   - `tiktok`
   - `zalo`

4. **Price**: `pricePerMonth` phải là số nguyên dương (VND).

5. **Sort Order**: Packages với `sortOrder` nhỏ hơn sẽ hiển thị trước.

---

## 🔗 Related APIs

- `GET /api/v1/admin/service-packages` - Lấy danh sách packages
- `GET /api/v1/admin/service-packages/:id` - Lấy chi tiết package
- `PUT /api/v1/admin/service-packages/:id` - Cập nhật package
- `DELETE /api/v1/admin/service-packages/:id` - Xóa package

---

## 📚 Code Examples

### React Hook Example
```typescript
import { useState } from 'react';
import axios from 'axios';

interface CreatePackageData {
  name: string;
  service: string;
  pricePerMonth: number;
  description?: string;
  minDuration?: number;
  sortOrder?: number;
  image?: File;
}

export function useCreateServicePackage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPackage = async (data: CreatePackageData, token: string) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('service', data.service);
      formData.append('pricePerMonth', data.pricePerMonth.toString());
      
      if (data.description) {
        formData.append('description', data.description);
      }
      if (data.minDuration) {
        formData.append('minDuration', data.minDuration.toString());
      }
      if (data.sortOrder !== undefined) {
        formData.append('sortOrder', data.sortOrder.toString());
      }
      if (data.image) {
        formData.append('image', data.image);
      }

      const response = await axios.post(
        'https://cchatbot.pro/api/v1/admin/service-packages',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to create package';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createPackage, loading, error };
}
```

### Vue 3 Composition API Example
```typescript
import { ref } from 'vue';
import axios from 'axios';

export function useCreateServicePackage() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const createPackage = async (data: any, token: string) => {
    loading.value = true;
    error.value = null;

    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          if (key === 'image' && data[key] instanceof File) {
            formData.append(key, data[key]);
          } else {
            formData.append(key, String(data[key]));
          }
        }
      });

      const response = await axios.post(
        'https://cchatbot.pro/api/v1/admin/service-packages',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'Failed to create package';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { createPackage, loading, error };
}
```

---

## ✅ Checklist trước khi gọi API

- [ ] Token JWT hợp lệ và chưa expired
- [ ] User có role `sp-admin`
- [ ] URL đúng format: `/api/v1/admin/service-packages`
- [ ] Method: `POST`
- [ ] Content-Type: `multipart/form-data` (browser tự set)
- [ ] Required fields: `name`, `service`, `pricePerMonth`
- [ ] `pricePerMonth` > 0
- [ ] `service` là một trong: `whatsapp`, `facebook`, `instagram`, `tiktok`, `zalo`
- [ ] Image file (nếu có) < 5MB
- [ ] Không set `Content-Type` header manually

