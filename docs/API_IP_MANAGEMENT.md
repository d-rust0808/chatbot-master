# IP Management - Hướng Dẫn Frontend

**Tài liệu đơn giản cho Frontend - SP-Admin quản lý IP Blacklist/Whitelist**

---

## 🔑 Base URL & Authentication

```
Base URL: /api/v1/sp-admin/ip-management
Authentication: Bearer Token (chỉ SP-Admin)
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
```

---

## 📋 Tổng Quan Chức Năng

### 1. **IP Blacklist** - Chặn IP
- Ban IP addresses hoặc IP ranges (CIDR)
- Tạm thời ban với expiration date
- Toggle active/inactive status
- Xem danh sách blacklist với pagination

### 2. **IP Whitelist** - Cho phép IP
- Whitelist IP addresses hoặc IP ranges (CIDR)
- Whitelist có priority cao hơn blacklist
- Tạm thời whitelist với expiration date
- Toggle active/inactive status
- Xem danh sách whitelist với pagination

### 3. **Ban/Unban IP** - Alias endpoints
- Convenience endpoints cho ban/unban

---

## 🚫 IP Blacklist APIs

### 1.1. Lấy danh sách Blacklist

```bash
GET /api/v1/sp-admin/ip-management/blacklist?page=1&limit=50&isActive=true
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional, default: 1): Số trang
- `limit` (optional, default: 50, max: 100): Số items mỗi trang
- `isActive` (optional): Filter theo status (`true`/`false`)

**Response:**
```json
{
  "data": [
    {
      "id": "clx1234567890",
      "ipAddress": "192.168.1.100",
      "reason": "Suspicious activity detected",
      "bannedBy": "user_abc123",
      "isActive": true,
      "expiresAt": "2024-02-01T00:00:00Z",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "clx1234567891",
      "ipAddress": "10.0.0.0/24",
      "reason": "Block entire subnet",
      "bannedBy": "user_abc123",
      "isActive": true,
      "expiresAt": null,
      "createdAt": "2024-01-14T08:00:00Z",
      "updatedAt": "2024-01-14T08:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

---

### 1.2. Thêm IP vào Blacklist (Ban IP)

```bash
POST /api/v1/sp-admin/ip-management/blacklist
Authorization: Bearer <token>
Content-Type: application/json

{
  "ipAddress": "192.168.1.100",
  "reason": "Suspicious activity detected",
  "expiresAt": "2024-02-01T00:00:00Z"  // Optional: ISO 8601 datetime
}
```

**Request Body:**
- `ipAddress` (required): IP address hoặc CIDR range (e.g., `192.168.1.100` hoặc `192.168.1.0/24`)
- `reason` (optional): Lý do ban
- `expiresAt` (optional): Thời gian tự động unban (ISO 8601 format). Nếu không có, ban vĩnh viễn

**Response (201 Created):**
```json
{
  "data": {
    "id": "clx1234567890",
    "ipAddress": "192.168.1.100",
    "reason": "Suspicious activity detected",
    "bannedBy": "user_abc123",
    "isActive": true,
    "expiresAt": "2024-02-01T00:00:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Lưu ý:**
- Nếu IP đã tồn tại trong blacklist, sẽ update entry thay vì tạo mới
- `bannedBy` tự động lấy từ JWT token (user hiện tại)

---

### 1.3. Xóa IP khỏi Blacklist (Unban IP)

```bash
DELETE /api/v1/sp-admin/ip-management/blacklist/192.168.1.100
Authorization: Bearer <token>
```

**URL Parameters:**
- `ipAddress`: IP address cần unban (URL encoded nếu có `/` trong CIDR)

**Response (200 OK):**
```json
{
  "message": "IP removed from blacklist"
}
```

**Error (404 Not Found):**
```json
{
  "error": {
    "message": "IP 192.168.1.100 is not in blacklist"
  }
}
```

---

### 1.4. Toggle Blacklist Status

```bash
PATCH /api/v1/sp-admin/ip-management/blacklist/192.168.1.100/toggle
Authorization: Bearer <token>
Content-Type: application/json

{
  "isActive": false
}
```

**Request Body:**
- `isActive` (required, boolean): `true` để enable ban, `false` để tạm thời disable

**Response (200 OK):**
```json
{
  "message": "IP blacklist status disabled"
}
```

**Use Case:**
- Tạm thời disable ban mà không cần xóa entry
- Có thể enable lại sau

---

## ✅ IP Whitelist APIs

### 2.1. Lấy danh sách Whitelist

```bash
GET /api/v1/sp-admin/ip-management/whitelist?page=1&limit=50&isActive=true
Authorization: Bearer <token>
```

**Query Parameters:** (giống blacklist)

**Response:**
```json
{
  "data": [
    {
      "id": "clx1234567892",
      "ipAddress": "203.0.113.0/24",
      "reason": "Trusted office network",
      "addedBy": "user_abc123",
      "isActive": true,
      "expiresAt": null,
      "createdAt": "2024-01-10T09:00:00Z",
      "updatedAt": "2024-01-10T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 2.2. Thêm IP vào Whitelist

```bash
POST /api/v1/sp-admin/ip-management/whitelist
Authorization: Bearer <token>
Content-Type: application/json

{
  "ipAddress": "203.0.113.0/24",
  "reason": "Trusted office network",
  "expiresAt": "2024-12-31T23:59:59Z"  // Optional
}
```

**Request Body:** (giống blacklist)

**Response (201 Created):**
```json
{
  "data": {
    "id": "clx1234567892",
    "ipAddress": "203.0.113.0/24",
    "reason": "Trusted office network",
    "addedBy": "user_abc123",
    "isActive": true,
    "expiresAt": "2024-12-31T23:59:59Z",
    "createdAt": "2024-01-10T09:00:00Z"
  }
}
```

---

### 2.3. Xóa IP khỏi Whitelist

```bash
DELETE /api/v1/sp-admin/ip-management/whitelist/203.0.113.0%2F24
Authorization: Bearer <token>
```

**Lưu ý:** URL encode CIDR ranges (ví dụ: `/` → `%2F`)

**Response (200 OK):**
```json
{
  "message": "IP removed from whitelist"
}
```

---

### 2.4. Toggle Whitelist Status

```bash
PATCH /api/v1/sp-admin/ip-management/whitelist/203.0.113.0%2F24/toggle
Authorization: Bearer <token>
Content-Type: application/json

{
  "isActive": false
}
```

---

## 🚨 Ban/Unban APIs (Aliases)

### 3.1. Ban IP

```bash
POST /api/v1/sp-admin/ip-management/ban
Authorization: Bearer <token>
Content-Type: application/json

{
  "ipAddress": "192.168.1.100",
  "reason": "Abuse detected",
  "expiresAt": "2024-02-01T00:00:00Z"
}
```

**Note:** Alias của `POST /blacklist`, response giống nhau.

---

### 3.2. Unban IP

```bash
DELETE /api/v1/sp-admin/ip-management/ban/192.168.1.100
Authorization: Bearer <token>
```

**Note:** Alias của `DELETE /blacklist/:ipAddress`, response giống nhau.

---

## 📝 CIDR Range Support

### Format CIDR
- **Single IP**: `192.168.1.100`
- **CIDR Range**: `192.168.1.0/24` (block cả subnet)
- **Examples:**
  - `10.0.0.0/8` - Block toàn bộ class A private network
  - `172.16.0.0/12` - Block toàn bộ class B private network
  - `192.168.0.0/16` - Block toàn bộ class C private network

### URL Encoding
Khi dùng CIDR trong URL (DELETE, PATCH), cần URL encode:
- `/` → `%2F`
- Example: `192.168.1.0/24` → `192.168.1.0%2F24`

---

## 🎨 UI/UX Recommendations

### 1. **Blacklist Management Page**

#### Layout:
```
┌─────────────────────────────────────────────────────────┐
│  IP Blacklist Management                                │
├─────────────────────────────────────────────────────────┤
│  [Add to Blacklist Button]                              │
│                                                          │
│  Filters: [Active Only ▼] [Search IP...]              │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ IP Address    │ Reason          │ Status │ Actions│  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 192.168.1.100 │ Suspicious      │ ✅ Active│ [Toggle][Delete]│  │
│  │ 10.0.0.0/24   │ Block subnet    │ ✅ Active│ [Toggle][Delete]│  │
│  │ 172.16.1.50   │ Abuse           │ ⏸ Inactive│ [Toggle][Delete]│  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [< 1 2 3 ... 10 >]                                     │
└─────────────────────────────────────────────────────────┘
```

#### Add to Blacklist Modal:
```
┌─────────────────────────────────────┐
│  Add IP to Blacklist                 │
├─────────────────────────────────────┤
│  IP Address / CIDR:                 │
│  [192.168.1.100              ]      │
│  💡 Supports CIDR (e.g., 192.168.1.0/24)│
│                                      │
│  Reason (optional):                  │
│  [Suspicious activity...     ]      │
│                                      │
│  Expiration (optional):              │
│  [📅 2024-02-01] [🕐 00:00]          │
│  ☐ Never expires                     │
│                                      │
│  [Cancel] [Add to Blacklist]         │
└─────────────────────────────────────┘
```

### 2. **Whitelist Management Page**

Tương tự blacklist, nhưng với:
- Badge màu xanh thay vì đỏ
- "Add to Whitelist" thay vì "Add to Blacklist"

### 3. **Table Columns**

#### Blacklist Table:
| Column | Width | Format |
|--------|-------|--------|
| **IP Address** | 200px | `192.168.1.100` hoặc `192.168.1.0/24` (badge nếu CIDR) |
| **Reason** | 250px | Truncate nếu dài, tooltip full text |
| **Status** | 100px | Badge: ✅ Active / ⏸ Inactive |
| **Expires At** | 150px | `2024-02-01` hoặc "Never" |
| **Created At** | 150px | `2024-01-15 10:30` |
| **Actions** | 120px | [Toggle] [Delete] buttons |

#### Whitelist Table:
Tương tự, nhưng thay "Banned By" → "Added By"

### 4. **Status Badges**

```typescript
// Active
<span className="badge badge-success">✅ Active</span>

// Inactive
<span className="badge badge-warning">⏸ Inactive</span>

// Expired (nếu expiresAt < now)
<span className="badge badge-danger">⏰ Expired</span>
```

### 5. **IP Address Display**

```typescript
// Single IP
<span>192.168.1.100</span>

// CIDR Range
<span>
  192.168.1.0/24
  <span className="badge badge-info">CIDR</span>
</span>
```

### 6. **Confirmation Dialogs**

Khi delete hoặc toggle:
```
┌─────────────────────────────────────┐
│  ⚠️ Confirm Action                  │
├─────────────────────────────────────┤
│  Are you sure you want to remove    │
│  IP 192.168.1.100 from blacklist?   │
│                                      │
│  [Cancel] [Confirm]                 │
└─────────────────────────────────────┘
```

---

## ⚠️ Error Handling

### Common Errors

#### 400 Bad Request
```json
{
  "error": {
    "message": "Invalid request body",
    "details": [
      {
        "path": ["ipAddress"],
        "message": "IP address is required"
      }
    ]
  }
}
```

#### 404 Not Found
```json
{
  "error": {
    "message": "IP 192.168.1.100 is not in blacklist"
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "message": "Failed to add IP to blacklist"
  }
}
```

### Frontend Error Handling

```typescript
try {
  const response = await fetch('/api/v1/sp-admin/ip-management/blacklist', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ipAddress: '192.168.1.100',
      reason: 'Suspicious activity',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 400) {
      // Show validation errors
      showValidationErrors(error.error.details);
    } else if (response.status === 404) {
      // Show not found message
      showError(error.error.message);
    } else {
      // Show generic error
      showError('Failed to add IP to blacklist');
    }
    return;
  }

  const data = await response.json();
  // Success - refresh list
  refreshBlacklist();
} catch (error) {
  showError('Network error. Please try again.');
}
```

---

## 🔄 Real-time Updates (Optional)

Nếu muốn real-time updates khi có IP mới được ban:

1. **Polling**: Refresh list mỗi 30 giây
2. **WebSocket**: Subscribe to IP management events (nếu có)
3. **Optimistic Updates**: Update UI ngay sau khi ban, rollback nếu fail

---

## 📊 Example: Complete Flow

### Ban IP từ Suspicious IPs List

```typescript
// 1. User click "Ban IP" từ suspicious IPs list
async function banIPFromSuspiciousList(ipAddress: string) {
  // 2. Show modal
  const reason = await showBanIPModal(ipAddress);
  
  // 3. Call API
  const response = await fetch('/api/v1/sp-admin/ip-management/ban', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ipAddress,
      reason: reason || 'Banned from suspicious IPs list',
    }),
  });

  if (response.ok) {
    // 4. Show success message
    showSuccess('IP banned successfully');
    
    // 5. Refresh both lists
    refreshSuspiciousIPs();
    refreshBlacklist();
  } else {
    showError('Failed to ban IP');
  }
}
```

---

## 🧪 Testing Examples

### Test Cases

1. **Ban single IP**
   ```json
   POST /api/v1/sp-admin/ip-management/ban
   {
     "ipAddress": "192.168.1.100",
     "reason": "Test ban"
   }
   ```

2. **Ban CIDR range**
   ```json
   POST /api/v1/sp-admin/ip-management/ban
   {
     "ipAddress": "192.168.1.0/24",
     "reason": "Block entire subnet"
   }
   ```

3. **Ban with expiration**
   ```json
   POST /api/v1/sp-admin/ip-management/ban
   {
     "ipAddress": "10.0.0.1",
     "reason": "Temporary ban",
     "expiresAt": "2024-02-01T00:00:00Z"
   }
   ```

4. **Whitelist IP**
   ```json
   POST /api/v1/sp-admin/ip-management/whitelist
   {
     "ipAddress": "203.0.113.0/24",
     "reason": "Office network"
   }
   ```

---

## 📌 Best Practices

1. **URL Encoding**: Luôn URL encode CIDR ranges trong URL parameters
2. **Validation**: Validate IP format trước khi submit
3. **Confirmation**: Luôn confirm trước khi delete
4. **Feedback**: Show loading states và success/error messages
5. **Pagination**: Implement pagination cho large lists
6. **Search**: Add search/filter functionality
7. **Sorting**: Allow sort by createdAt, ipAddress, etc.

---

## 🔗 Related APIs

- **Suspicious IPs**: `GET /api/v1/sp-admin/ai-logs/suspicious-ips`
  - Có thể dùng để ban IPs từ suspicious list

---

## 📝 Notes

- Whitelist có priority cao hơn blacklist
- IPs tự động unban khi `expiresAt` đã qua
- CIDR ranges được support cho cả blacklist và whitelist
- `bannedBy` / `addedBy` tự động lấy từ JWT token

---

**Last Updated**: 2024-01-09

