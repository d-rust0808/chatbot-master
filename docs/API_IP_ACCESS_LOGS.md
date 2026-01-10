# IP Access Logs & Suspicious IP Detection - Hướng Dẫn Frontend

**Tài liệu đơn giản cho Frontend - SP-Admin xem access logs và detect suspicious IPs**

---

## 🔑 Base URL & Authentication

```
Base URL: /api/v1/sp-admin/access-logs
Authentication: Bearer Token (chỉ SP-Admin)
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
```

---

## 📋 Tổng Quan Chức Năng

### 1. **Access Logs** - Xem tất cả HTTP requests
- Xem logs của tất cả IPs đang truy cập hệ thống
- Filter theo IP, tenant, user, method, path, status code
- Xem chi tiết requests từ mỗi IP

### 2. **Suspicious IP Detection** - Phát hiện IP đáng nghi
- Hệ thống tự động detect IPs có dấu hiệu spam/abuse
- Risk scoring (0-100) dựa trên multiple factors
- Recommendations: ban, monitor, hoặc safe
- Ban IP trực tiếp từ suspicious list

### 3. **IP Details** - Chi tiết IP
- Statistics của IP (request count, error rate, etc.)
- Recent requests từ IP đó
- Check blacklist/whitelist status

---

## 📊 Access Logs APIs

### 1.1. Lấy danh sách Access Logs

```bash
GET /api/v1/sp-admin/access-logs?page=1&limit=50&ipAddress=192.168.1.100&startDate=2024-01-01T00:00:00Z
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional, default: 1): Số trang
- `limit` (optional, default: 50, max: 100): Số items mỗi trang
- `ipAddress` (optional): Filter theo IP
- `tenantId` (optional): Filter theo tenant
- `userId` (optional): Filter theo user
- `method` (optional): Filter theo HTTP method (GET, POST, etc.)
- `path` (optional): Filter theo path (contains)
- `statusCode` (optional): Filter theo status code
- `startDate` (optional): ISO 8601 datetime
- `endDate` (optional): ISO 8601 datetime

**Response:**
```json
{
  "data": [
    {
      "id": "clx1234567890",
      "ipAddress": "192.168.1.100",
      "method": "GET",
      "url": "/api/v1/ai/generate?message=hello",
      "path": "/api/v1/ai/generate",
      "statusCode": 200,
      "responseTime": 1250,
      "userAgent": "Mozilla/5.0...",
      "referer": "https://example.com",
      "tenantId": "tenant_abc123",
      "userId": "user_xyz789",
      "error": null,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1523,
    "totalPages": 31
  }
}
```

---

### 1.2. Lấy Suspicious IPs

```bash
GET /api/v1/sp-admin/access-logs/suspicious?minRiskScore=50
Authorization: Bearer <token>
```

**Query Parameters:**
- `minRiskScore` (optional, default: 30): Minimum risk score (0-100)
- `startDate` (optional): ISO 8601 datetime
- `endDate` (optional): ISO 8601 datetime

**Response:**
```json
{
  "data": [
    {
      "ipAddress": "192.168.1.100",
      "riskScore": 85,
      "requestCount": 5000,
      "requestsPerMinute": 120,
      "errorRate": 45.5,
      "failedAuthCount": 10,
      "suspiciousFactors": [
        "Very high request rate",
        "High error rate",
        "Multiple failed auth attempts"
      ],
      "lastRequestAt": "2024-01-15T10:30:00Z",
      "recommendation": "ban"
    },
    {
      "ipAddress": "10.0.0.50",
      "riskScore": 65,
      "requestCount": 2000,
      "requestsPerMinute": 80,
      "errorRate": 30.2,
      "failedAuthCount": 3,
      "suspiciousFactors": [
        "High request rate",
        "High error rate"
      ],
      "lastRequestAt": "2024-01-15T10:25:00Z",
      "recommendation": "monitor"
    }
  ]
}
```

**Risk Score Explanation:**
- **0-30**: Safe - Normal traffic
- **30-50**: Monitor - Slightly suspicious
- **50-70**: Monitor - Suspicious, watch closely
- **70-100**: Ban - High risk, should be banned

**Recommendation:**
- `ban`: Should ban immediately
- `monitor`: Should monitor closely
- `safe`: Safe, no action needed

**Suspicious Factors:**
- "Very high request rate" - >120 requests/minute
- "High request rate" - >60 requests/minute
- "Very high error rate" - >50% errors
- "High error rate" - >30% errors
- "Multiple failed auth attempts" - >5 failed attempts
- "Scanning behavior" - Accessing many different paths
- "High 404 rate" - Many 404 errors (probing)

---

### 1.3. Lấy IP Details

```bash
GET /api/v1/sp-admin/access-logs/ip/192.168.1.100?startDate=2024-01-01T00:00:00Z
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): ISO 8601 datetime (default: last 24h)
- `endDate` (optional): ISO 8601 datetime (default: now)

**Response:**
```json
{
  "data": {
    "ipAddress": "192.168.1.100",
    "totalRequests": 5000,
    "successCount": 2750,
    "errorCount": 2250,
    "avgResponseTime": 850,
    "methods": {
      "GET": 3000,
      "POST": 2000
    },
    "statusCodes": {
      "200": 2500,
      "404": 1500,
      "500": 750,
      "401": 250
    },
    "paths": [
      { "path": "/api/v1/ai/generate", "count": 2000 },
      { "path": "/api/v1/auth/login", "count": 500 },
      { "path": "/api/v1/admin/users", "count": 300 }
    ],
    "lastRequestAt": "2024-01-15T10:30:00Z",
    "isBlacklisted": false,
    "isWhitelisted": false
  }
}
```

---

### 1.4. Ban IP từ Suspicious List

```bash
POST /api/v1/sp-admin/access-logs/ip/192.168.1.100/ban
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Suspicious activity detected",
  "expiresAt": "2024-02-01T00:00:00Z"  // Optional
}
```

**Request Body:**
- `reason` (optional): Lý do ban (nếu không có, sẽ tự động generate từ suspicious factors)
- `expiresAt` (optional): ISO 8601 datetime (nếu không có, ban vĩnh viễn)

**Response (201 Created):**
```json
{
  "data": {
    "id": "clx1234567890",
    "ipAddress": "192.168.1.100",
    "reason": "Suspicious activity detected: Very high request rate, High error rate",
    "bannedBy": "user_abc123",
    "isActive": true,
    "expiresAt": "2024-02-01T00:00:00Z",
    "createdAt": "2024-01-15T10:35:00Z"
  },
  "message": "IP banned successfully"
}
```

---

## 🎨 UI/UX Recommendations

### 1. **IP Access Logs Page**

#### Layout:
```
┌─────────────────────────────────────────────────────────┐
│  IP Access Logs                                         │
├─────────────────────────────────────────────────────────┤
│  Filters:                                               │
│  [IP Address] [Method ▼] [Status Code] [Date Range 📅] │
│  [Search Path...] [Apply Filters]                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Time      │ IP          │ Method │ Path      │ Status│  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 10:30:00  │ 192.168.1.1 │ GET    │ /api/ai  │ 200  │  │
│  │ 10:29:45  │ 10.0.0.50   │ POST   │ /auth    │ 401  │  │
│  │ 10:29:30  │ 192.168.1.1 │ GET    │ /admin   │ 403  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [< 1 2 3 ... 10 >]                                     │
└─────────────────────────────────────────────────────────┘
```

### 2. **Suspicious IPs Page**

#### Layout:
```
┌─────────────────────────────────────────────────────────┐
│  Suspicious IPs Detection                                │
├─────────────────────────────────────────────────────────┤
│  [Refresh] [Min Risk Score: 50 ▼]                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ IP          │ Risk │ Requests │ Errors │ Actions│  │
│  ├──────────────────────────────────────────────────┤  │
│  │ 192.168.1.1 │ 🔴 85│ 5000     │ 45.5%  │ [Ban] │  │
│  │ 10.0.0.50   │ 🟡 65│ 2000     │ 30.2%  │ [Ban] │  │
│  │ 172.16.1.10 │ 🟢 45│ 500      │ 15.0%  │ [View]│  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Click IP → View Details                                │
└─────────────────────────────────────────────────────────┘
```

#### Risk Score Badges:
```typescript
// High risk (70-100)
<span className="badge badge-danger">🔴 {riskScore}</span>

// Medium risk (50-70)
<span className="badge badge-warning">🟡 {riskScore}</span>

// Low risk (30-50)
<span className="badge badge-info">🟢 {riskScore}</span>
```

#### Recommendation Badges:
```typescript
// Ban
<span className="badge badge-danger">⚠️ Ban Recommended</span>

// Monitor
<span className="badge badge-warning">👁️ Monitor</span>

// Safe
<span className="badge badge-success">✅ Safe</span>
```

### 3. **IP Details Modal**

```
┌─────────────────────────────────────┐
│  IP Details: 192.168.1.100          │
├─────────────────────────────────────┤
│  Status: [Not Blacklisted] [Whitelist]│
│                                      │
│  Statistics (Last 24h):              │
│  • Total Requests: 5,000            │
│  • Success Rate: 55%                 │
│  • Error Rate: 45%                   │
│  • Avg Response Time: 850ms          │
│  • Failed Auth: 10                   │
│                                      │
│  Methods:                            │
│  • GET: 3,000                        │
│  • POST: 2,000                       │
│                                      │
│  Top Paths:                          │
│  • /api/v1/ai/generate: 2,000       │
│  • /api/v1/auth/login: 500           │
│                                      │
│  [View All Logs] [Ban IP] [Close]   │
└─────────────────────────────────────┘
```

### 4. **Ban IP Modal (from Suspicious List)**

```
┌─────────────────────────────────────┐
│  Ban IP: 192.168.1.100              │
├─────────────────────────────────────┤
│  Suspicious Factors:                 │
│  • Very high request rate            │
│  • High error rate                   │
│  • Multiple failed auth attempts     │
│                                      │
│  Reason (auto-filled):               │
│  [Suspicious activity detected: ...]│
│                                      │
│  Expiration (optional):              │
│  [📅 2024-02-01] [🕐 00:00]          │
│  ☐ Never expires                     │
│                                      │
│  [Cancel] [Ban IP]                  │
└─────────────────────────────────────┘
```

---

## 🔄 Integration với IP Management

### Flow: Ban IP từ Suspicious List

```typescript
// 1. User xem suspicious IPs
const suspiciousIPs = await fetch('/api/v1/sp-admin/access-logs/suspicious');

// 2. User click "Ban" trên IP có recommendation = "ban"
async function banSuspiciousIP(ipAddress: string, suspiciousIP: SuspiciousIP) {
  // 3. Show confirmation modal với auto-filled reason
  const confirmed = await showBanModal({
    ipAddress,
    reason: `Suspicious activity: ${suspiciousIP.suspiciousFactors.join(', ')}`,
    riskScore: suspiciousIP.riskScore,
  });
  
  if (!confirmed) return;
  
  // 4. Call ban API
  const response = await fetch(
    `/api/v1/sp-admin/access-logs/ip/${ipAddress}/ban`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: confirmed.reason,
        expiresAt: confirmed.expiresAt,
      }),
    }
  );
  
  if (response.ok) {
    // 5. Show success và refresh lists
    showSuccess('IP banned successfully');
    refreshSuspiciousIPs();
    refreshBlacklist();
  }
}
```

---

## 📊 Example: Complete Flow

### Scenario: Detect và Ban Spam IP

```typescript
// 1. Load suspicious IPs
const suspiciousIPs = await getSuspiciousIPs({ minRiskScore: 50 });

// 2. Display trong table
suspiciousIPs.forEach(ip => {
  if (ip.recommendation === 'ban') {
    // Highlight high-risk IPs
    displaySuspiciousIP(ip, { highlight: true, showBanButton: true });
  }
});

// 3. User click "Ban"
async function handleBanClick(ip: SuspiciousIP) {
  // 4. Show modal với details
  const action = await showBanModal({
    ipAddress: ip.ipAddress,
    riskScore: ip.riskScore,
    factors: ip.suspiciousFactors,
    stats: {
      requests: ip.requestCount,
      errors: ip.errorRate,
      failedAuth: ip.failedAuthCount,
    },
  });
  
  if (action === 'ban') {
    // 5. Ban IP
    await banIPFromSuspicious(ip.ipAddress, {
      reason: `Auto-detected: ${ip.suspiciousFactors.join(', ')}`,
    });
    
    // 6. Refresh và show notification
    refreshSuspiciousIPs();
    showNotification('IP banned successfully', 'success');
  } else if (action === 'view') {
    // 7. View IP details
    const details = await getIPDetails(ip.ipAddress);
    showIPDetailsModal(details);
  }
}
```

---

## ⚠️ Error Handling

### Common Errors

#### 400 Bad Request
```json
{
  "error": {
    "message": "Invalid query parameters",
    "details": [
      {
        "path": ["startDate"],
        "message": "Invalid datetime format"
      }
    ]
  }
}
```

#### 500 Internal Server Error
```json
{
  "error": {
    "message": "Failed to get suspicious IPs"
  }
}
```

---

## 📌 Best Practices

1. **Auto-refresh**: Refresh suspicious IPs list mỗi 5-10 phút
2. **Real-time updates**: Use WebSocket nếu có (optional)
3. **Caching**: Cache suspicious IPs để tránh nhiều requests
4. **Pagination**: Luôn paginate access logs
5. **Filters**: Save filter preferences trong localStorage
6. **Confirmation**: Luôn confirm trước khi ban IP
7. **Feedback**: Show loading states và success/error messages

---

## 🔗 Related APIs

- **IP Management**: `/api/v1/sp-admin/ip-management/*`
  - Ban/unban IPs
  - Whitelist IPs
  - View blacklist/whitelist

- **AI Logs**: `/api/v1/sp-admin/ai-logs`
  - AI request logs
  - Suspicious IPs from AI requests

---

## 📝 Notes

- Access logs được log tự động cho tất cả HTTP requests
- Suspicious detection chạy real-time khi query
- Risk score được tính dựa trên multiple factors
- Recommendations là suggestions, admin có thể override
- Ban từ suspicious list tự động generate reason từ factors

---

**Last Updated**: 2024-01-10

