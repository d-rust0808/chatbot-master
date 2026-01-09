# Debug Guide: API Request Không Nhận Được Response

## 🔍 Vấn đề

Request POST đến `/api/v1/admin/service-packages` không nhận được response.

## 📋 Checklist Debug

### 1. Kiểm tra Request Có Đến Backend Không

Sau khi restart backend, gửi request và kiểm tra logs:

#### ✅ Nếu thấy log này → Request đã đến Fastify
```
[info]: Incoming request
```

#### ✅ Nếu thấy log này → Request đã match admin routes
```
[info]: Admin route request
```

#### ✅ Nếu thấy log này → Route đã được match
```
[info]: POST /service-packages route matched and handler called
```

#### ✅ Nếu thấy log này → Handler đã được gọi
```
[info]: Create service package handler called
```

#### ❌ Nếu KHÔNG thấy bất kỳ log nào → Request không đến được backend

**Nguyên nhân có thể:**
- Reverse proxy (nginx) block request
- Network issue
- CORS preflight fail
- Firewall block

### 2. Kiểm tra Network Tab (Browser DevTools)

1. Mở **Network** tab
2. Gửi request
3. Kiểm tra:

#### Status Code
- **200/201**: Success (nhưng không thấy response → có thể bị mất)
- **400**: Bad Request (xem response body)
- **401**: Unauthorized (token invalid/expired)
- **403**: Forbidden (không có quyền)
- **404**: Not Found (route không match)
- **500**: Server Error (xem server logs)
- **Pending**: Request bị hang (timeout hoặc không có response)

#### Response Headers
- Kiểm tra `Content-Type`
- Kiểm tra `Access-Control-Allow-Origin`
- Kiểm tra `Content-Length`

#### Response Body
- Nếu có error message → đọc và fix
- Nếu empty → có thể response bị mất

### 3. Kiểm tra CORS

Request từ `http://localhost:3001` đến `https://cchatbot.pro` là **cross-origin**.

#### Preflight Request (OPTIONS)
Browser sẽ gửi OPTIONS request trước. Kiểm tra:
- OPTIONS request có thành công không?
- Response có header `Access-Control-Allow-Origin: *` không?

#### Nếu Preflight Fail
- Request sẽ không được gửi
- Network tab sẽ show CORS error

### 4. Kiểm tra Reverse Proxy (Nginx)

Nếu có nginx ở phía trước backend:

```nginx
# Kiểm tra config
location /api/v1/admin/service-packages {
    proxy_pass http://backend:30001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    
    # QUAN TRỌNG: Cho phép upload lớn
    client_max_body_size 10M;
    
    # QUAN TRỌNG: Timeout cho multipart
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
}
```

### 5. Kiểm tra Token

Token trong request:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWsyZDg1MmcwMDAwMTEzOGtvb2cwZWo2IiwiZW1haWwiOiJjZHVkdS5jb20udm5AZ21haWwuY29tIiwicm9sZSI6InNwLWFkbWluIiwiaWF0IjoxNzY3OTYyNjc1LCJleHAiOjE3Njc5NjM1NzV9.0QqxnHMfaZ-zed0zchsmn9-RejfmJ3EWM4DGOxwENvU
```

Decode JWT để kiểm tra:
- `exp`: 1767963575 → Expired time
- `role`: "sp-admin" → Role đúng
- `iat`: 1767962675 → Issued time

**Kiểm tra:**
```bash
# Decode JWT (chỉ payload, không verify signature)
echo "eyJ1c2VySWQiOiJjbWsyZDg1MmcwMDAwMTEzOGtvb2cwZWo2IiwiZW1haWwiOiJjZHVkdS5jb20udm5AZ21haWwuY29tIiwicm9sZSI6InNwLWFkbWluIiwiaWF0IjoxNzY3OTYyNjc1LCJleHAiOjE3Njc5NjM1NzV9" | base64 -d
```

### 6. Test Endpoint

Test endpoint đơn giản để verify route registration:

```bash
curl -X GET https://cchatbot.pro/api/v1/admin/service-packages/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Nếu endpoint này hoạt động → Routes đã được register đúng.

### 7. Kiểm tra Multipart Parsing

Request có `Content-Type: multipart/form-data` với boundary.

**Kiểm tra logs:**
- `[info]: Parsed form data successfully` → Multipart parsing OK
- `[error]: Multipart parsing error` → Có lỗi parsing

**Common issues:**
- Boundary không đúng format
- Content-Length không đúng
- Request body bị truncate

## 🛠️ Các Bước Debug

### Bước 1: Restart Backend
```bash
# Restart để load code mới với logging
pm2 restart chatbot-backend
# hoặc
npm run dev
```

### Bước 2: Gửi Request và Xem Logs
```bash
# Xem logs real-time
pm2 logs chatbot-backend
# hoặc
tail -f logs/app.log
```

### Bước 3: Kiểm tra Logs Theo Thứ Tự

1. **"Incoming request"** → Request đến Fastify
2. **"Admin route request"** → Request match admin routes
3. **"POST /service-packages route matched"** → Route matched
4. **"Create service package handler called"** → Handler called
5. **"Parsed form data successfully"** → Multipart parsed
6. **"Creating service package in database"** → Database operation
7. **"Service package created successfully"** → Success
8. **"Sending success response"** → Response sent

### Bước 4: Nếu Không Thấy Logs

**Request không đến được backend. Kiểm tra:**

1. **Reverse Proxy (Nginx)**
   ```bash
   # Check nginx logs
   tail -f /var/log/nginx/error.log
   tail -f /var/log/nginx/access.log
   ```

2. **Firewall**
   ```bash
   # Check firewall rules
   sudo ufw status
   sudo iptables -L
   ```

3. **Network Connectivity**
   ```bash
   # Test từ server
   curl -X POST http://localhost:30001/api/v1/admin/service-packages \
     -H "Authorization: Bearer TOKEN" \
     -F "name=Test" \
     -F "service=whatsapp" \
     -F "pricePerMonth=10000"
   ```

## 📊 Log Levels

### Info Level (Sẽ thấy trong logs)
- `Incoming request`
- `Admin route request`
- `POST /service-packages route matched`
- `Create service package handler called`
- `Parsed form data successfully`
- `Creating service package in database`
- `Service package created successfully`
- `Sending success response`

### Debug Level (Chỉ thấy nếu set log level = debug)
- `Create service package request received`
- `Image file received`
- `Form field received`
- `Extracted form fields`

## 🔧 Quick Fixes

### Fix 1: Token Expired
```javascript
// Refresh token
const newToken = await refreshToken();
```

### Fix 2: CORS Issue
Backend đã config CORS cho phép tất cả origins. Nếu vẫn lỗi:
- Kiểm tra nginx có block không
- Kiểm tra browser có block không

### Fix 3: Multipart Parsing Error
- Đảm bảo Content-Type header đúng format
- Đảm bảo boundary đúng
- Đảm bảo Content-Length đúng

### Fix 4: Timeout
- Tăng timeout trong nginx config
- Tăng timeout trong Fastify config

## 📝 Request Format Đúng

```http
POST /api/v1/admin/service-packages HTTP/1.1
Host: cchatbot.pro
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
Authorization: Bearer <TOKEN>
Origin: http://localhost:3001

------WebKitFormBoundary...
Content-Disposition: form-data; name="name"

WhatsAPp
------WebKitFormBoundary...
Content-Disposition: form-data; name="service"

whatsapp
------WebKitFormBoundary...
Content-Disposition: form-data; name="pricePerMonth"

200000
------WebKitFormBoundary...
Content-Disposition: form-data; name="image"; filename="whatsapp.png"
Content-Type: image/png

<binary data>
------WebKitFormBoundary...--
```

## ✅ Expected Response

```json
{
  "success": true,
  "message": "Service package created successfully",
  "data": {
    "id": "pkg_...",
    "name": "WhatsAPp",
    "service": "whatsapp",
    "pricePerMonth": 200000,
    ...
  }
}
```

## 🚨 Common Errors

### Error 1: "Missing required fields"
**Nguyên nhân**: Form data không được parse đúng
**Fix**: Kiểm tra multipart parsing logs

### Error 2: "Forbidden: Super admin only"
**Nguyên nhân**: User không có role `sp-admin`
**Fix**: Kiểm tra token có role đúng không

### Error 3: "Token expired"
**Nguyên nhân**: JWT token đã hết hạn
**Fix**: Refresh token

### Error 4: No Response
**Nguyên nhân**: 
- Request không đến được backend
- Response bị mất
- Timeout
**Fix**: Kiểm tra logs và network tab

## 📞 Next Steps

1. Restart backend với code mới
2. Gửi request từ frontend
3. Kiểm tra logs theo thứ tự ở trên
4. Nếu không thấy log nào → Kiểm tra nginx/network
5. Nếu thấy logs nhưng không có response → Kiểm tra error logs

