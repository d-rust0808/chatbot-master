# System Config API - Hướng Dẫn Sử Dụng

**Tài liệu đơn giản cho Frontend - SP-Admin quản lý cấu hình hệ thống**

## 🔑 Base URL & Authentication

```
Base URL: /api/v1/sp-admin/system-configs
Authentication: Bearer Token (chỉ SP-Admin)
```

---

## 📋 Các Use Cases Chính

### 1. Config API Keys (Không Hardcode trong .env)

**Mục đích**: Lưu API keys trong database, có thể thay đổi qua UI mà không cần restart server.

#### Config Keys:

| Key | Type | Mô tả |
|-----|------|-------|
| `ai.api_keys.openai` | string | OpenAI API Key |
| `ai.api_keys.gemini` | string | Google Gemini API Key |
| `ai.api_keys.deepseek` | string | DeepSeek API Key |
| `ai.api_keys.proxy_api_key` | string | Proxy API Key (nếu dùng) |

#### Ví dụ:

**Lưu OpenAI API Key:**
```bash
POST /api/v1/sp-admin/system-configs
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "ai",
  "key": "ai.api_keys.openai",
  "value": "sk-xxxxx",
  "type": "string",
  "description": "OpenAI API Key",
  "isEditable": true
}
```

**Update API Key:**
```bash
PATCH /api/v1/sp-admin/system-configs/ai/ai.api_keys.openai
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": "sk-new-key-xxxxx"
}
```

**Lấy API Key (để hiển thị trong UI - mask sensitive):**
```bash
GET /api/v1/sp-admin/system-configs/ai/ai.api_keys.openai
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": {
    "category": "ai",
    "key": "ai.api_keys.openai",
    "value": "sk-xxxxx",
    "type": "string"
  }
}
```

---

### 2. Config Các Model AI

**Mục đích**: Bật/tắt models, set default model, config costs.

#### Config Keys:

| Key | Type | Default | Mô tả |
|-----|------|---------|-------|
| `ai.models.openai.enabled` | boolean | true | Bật/tắt OpenAI |
| `ai.models.gemini.enabled` | boolean | true | Bật/tắt Gemini |
| `ai.models.deepseek.enabled` | boolean | true | Bật/tắt DeepSeek |
| `ai.models.default` | string | "gpt-3.5-turbo" | Model mặc định |
| `ai.models.openai.cost_per_1k_tokens` | number | 0.002 | Giá OpenAI (USD/1k tokens) |
| `ai.models.gemini.cost_per_1k_tokens` | number | 0.001 | Giá Gemini (USD/1k tokens) |
| `ai.models.deepseek.cost_per_1k_tokens` | number | 0.0007 | Giá DeepSeek (USD/1k tokens) |

#### Ví dụ:

**Tắt OpenAI model:**
```bash
PATCH /api/v1/sp-admin/system-configs/ai/ai.models.openai.enabled
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": false
}
```

**Đổi model mặc định:**
```bash
PATCH /api/v1/sp-admin/system-configs/ai/ai.models.default
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": "gemini-pro"
}
```

**Update giá OpenAI:**
```bash
PATCH /api/v1/sp-admin/system-configs/ai/ai.models.openai.cost_per_1k_tokens
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": 0.003
}
```

---

### 3. Config Các Gói Credit AI

**Mục đích**: Quản lý các gói credit (mua credit để dùng AI).

#### Config Keys:

| Key | Type | Mô tả |
|-----|------|-------|
| `billing.credit_packages` | array | Danh sách các gói credit |
| `billing.credit_to_vnd_rate` | number | Tỷ lệ: 1 credit = X VND |
| `billing.vnd_to_credit_rate` | number | Tỷ lệ: 1 VND = X credit |

#### Ví dụ:

**Config danh sách gói credit:**
```bash
PATCH /api/v1/sp-admin/system-configs/billing/billing.credit_packages
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": [
    {
      "id": "package_1",
      "name": "Gói 10K Credit",
      "creditAmount": 10000,
      "priceVND": 100000,
      "bonusCredit": 0,
      "isActive": true
    },
    {
      "id": "package_2",
      "name": "Gói 50K Credit",
      "creditAmount": 50000,
      "priceVND": 450000,
      "bonusCredit": 5000,
      "isActive": true
    },
    {
      "id": "package_3",
      "name": "Gói 100K Credit",
      "creditAmount": 100000,
      "priceVND": 800000,
      "bonusCredit": 20000,
      "isActive": true
    }
  ]
}
```

**Config tỷ lệ chuyển đổi:**
```bash
# 1 credit = 10 VND
PATCH /api/v1/sp-admin/system-configs/billing/billing.credit_to_vnd_rate
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": 10
}
```

**Lấy danh sách gói credit:**
```bash
GET /api/v1/sp-admin/system-configs/billing/billing.credit_packages
Authorization: Bearer <token>
```

---

### 4. Config Blacklist/Whitelist

**Mục đích**: Chặn hoặc cho phép IP/domain cụ thể.

#### Config Keys:

| Key | Type | Mô tả |
|-----|------|-------|
| `security.ip_whitelist.enabled` | boolean | Bật/tắt IP whitelist |
| `security.ip_whitelist.addresses` | array | Danh sách IP được phép |
| `security.ip_blacklist.enabled` | boolean | Bật/tắt IP blacklist |
| `security.ip_blacklist.addresses` | array | Danh sách IP bị chặn |
| `security.domain_blacklist` | array | Danh sách domain bị chặn |

#### Ví dụ:

**Thêm IP vào whitelist:**
```bash
# Lấy danh sách hiện tại
GET /api/v1/sp-admin/system-configs/security/security.ip_whitelist.addresses
Authorization: Bearer <token>

# Response:
{
  "data": {
    "value": ["192.168.1.1", "10.0.0.1"]
  }
}

# Update với IP mới
PATCH /api/v1/sp-admin/system-configs/security/security.ip_whitelist.addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": ["192.168.1.1", "10.0.0.1", "203.0.113.1"]
}
```

**Bật IP whitelist:**
```bash
PATCH /api/v1/sp-admin/system-configs/security/security.ip_whitelist.enabled
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": true
}
```

**Thêm IP vào blacklist:**
```bash
# Lấy danh sách hiện tại
GET /api/v1/sp-admin/system-configs/security/security.ip_blacklist.addresses

# Update với IP mới
PATCH /api/v1/sp-admin/system-configs/security/security.ip_blacklist.addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": ["192.168.1.100", "10.0.0.50"]
}
```

---

### 5. Config Ban IP

**Mục đích**: Tạm thời hoặc vĩnh viễn chặn IP.

#### Config Keys:

| Key | Type | Mô tả |
|-----|------|-------|
| `security.banned_ips` | array | Danh sách IP bị ban |
| `security.ban_duration_minutes` | number | Thời gian ban (0 = vĩnh viễn) |

#### Ví dụ:

**Ban IP vĩnh viễn:**
```bash
# Lấy danh sách hiện tại
GET /api/v1/sp-admin/system-configs/security/security.banned_ips
Authorization: Bearer <token>

# Thêm IP vào danh sách ban
PATCH /api/v1/sp-admin/system-configs/security/security.banned_ips
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": [
    {
      "ip": "192.168.1.100",
      "reason": "Abuse detected",
      "bannedAt": "2024-01-09T10:00:00Z",
      "duration": 0,
      "bannedBy": "admin_123"
    }
  ]
}
```

**Ban IP tạm thời (24 giờ):**
```bash
PATCH /api/v1/sp-admin/system-configs/security/security.banned_ips
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": [
    {
      "ip": "192.168.1.101",
      "reason": "Rate limit exceeded",
      "bannedAt": "2024-01-09T10:00:00Z",
      "duration": 1440,
      "expiresAt": "2024-01-10T10:00:00Z",
      "bannedBy": "admin_123"
    }
  ]
}
```

**Unban IP:**
```bash
# Lấy danh sách, xóa IP khỏi array, update lại
PATCH /api/v1/sp-admin/system-configs/security/security.banned_ips
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": []  // Xóa IP khỏi danh sách
}
```

---

### 6. Hiển Thị IP Đang Gọi AI Liên Tục

**Mục đích**: Monitor và detect abuse.

#### Config Keys:

| Key | Type | Mô tả |
|-----|------|-------|
| `monitoring.ai_request_threshold_per_minute` | number | Ngưỡng cảnh báo (requests/phút) |
| `monitoring.suspicious_ips` | array | Danh sách IP đang nghi ngờ |

#### Ví dụ:

**Config ngưỡng cảnh báo:**
```bash
PATCH /api/v1/sp-admin/system-configs/monitoring/monitoring.ai_request_threshold_per_minute
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": 100
}
```

**Lấy danh sách IP nghi ngờ:**
```bash
GET /api/v1/sp-admin/system-configs/monitoring/monitoring.suspicious_ips
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": {
    "category": "monitoring",
    "key": "monitoring.suspicious_ips",
    "value": [
      {
        "ip": "192.168.1.100",
        "requestCount": 150,
        "timeWindow": "2024-01-09T10:00:00Z - 2024-01-09T10:01:00Z",
        "lastRequestAt": "2024-01-09T10:01:00Z"
      },
      {
        "ip": "10.0.0.50",
        "requestCount": 200,
        "timeWindow": "2024-01-09T10:00:00Z - 2024-01-09T10:01:00Z",
        "lastRequestAt": "2024-01-09T10:01:00Z"
      }
    ],
    "type": "array"
  }
}
```

---

## 📡 API Endpoints Cơ Bản

### 1. List Tất Cả Configs

```bash
GET /api/v1/sp-admin/system-configs?category=ai&page=1&limit=50
Authorization: Bearer <token>
```

**Query Params:**
- `category` (optional): platform, ai, security, billing, monitoring
- `page` (optional): Số trang
- `limit` (optional): Số items/trang
- `search` (optional): Tìm kiếm theo key

**Response:**
```json
{
  "data": [
    {
      "id": "config_123",
      "category": "ai",
      "key": "ai.api_keys.openai",
      "value": "sk-xxxxx",
      "type": "string",
      "description": "OpenAI API Key",
      "isEditable": true,
      "updatedBy": "admin_456",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-09T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### 2. Get Config

```bash
GET /api/v1/sp-admin/system-configs/:category/:key
Authorization: Bearer <token>
```

**Ví dụ:**
```bash
GET /api/v1/sp-admin/system-configs/ai/ai.api_keys.openai
```

### 3. Create Config

```bash
POST /api/v1/sp-admin/system-configs
Authorization: Bearer <token>
Content-Type: application/json

{
  "category": "ai",
  "key": "ai.api_keys.openai",
  "value": "sk-xxxxx",
  "type": "string",
  "description": "OpenAI API Key",
  "isEditable": true
}
```

### 4. Update Config

```bash
PATCH /api/v1/sp-admin/system-configs/:category/:key
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": "new-value"
}
```

### 5. Delete Config

```bash
DELETE /api/v1/sp-admin/system-configs/:category/:key
Authorization: Bearer <token>
```

---

## 💻 Frontend Code Examples

### 1. Lưu API Key

```typescript
// services/system-config.service.ts
export const systemConfigService = {
  async saveAPIKey(provider: 'openai' | 'gemini' | 'deepseek', apiKey: string) {
    return fetch(`/api/v1/sp-admin/system-configs/ai/ai.api_keys.${provider}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: apiKey }),
    });
  },

  async getAPIKey(provider: 'openai' | 'gemini' | 'deepseek') {
    const res = await fetch(`/api/v1/sp-admin/system-configs/ai/ai.api_keys.${provider}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    return data.data.value;
  },
};
```

### 2. Config Gói Credit

```typescript
// components/CreditPackageConfig.tsx
import { useState } from 'react';

export function CreditPackageConfig() {
  const [packages, setPackages] = useState([]);

  const savePackages = async () => {
    await fetch('/api/v1/sp-admin/system-configs/billing/billing.credit_packages', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: packages }),
    });
  };

  return (
    <div>
      <h2>Quản Lý Gói Credit</h2>
      {/* Form để thêm/sửa gói credit */}
      <button onClick={savePackages}>Lưu</button>
    </div>
  );
}
```

### 3. Quản Lý Blacklist/Whitelist

```typescript
// components/IPManagement.tsx
export function IPManagement() {
  const [blacklist, setBlacklist] = useState([]);
  const [whitelist, setWhitelist] = useState([]);

  const addToBlacklist = async (ip: string) => {
    const newList = [...blacklist, ip];
    await fetch('/api/v1/sp-admin/system-configs/security/security.ip_blacklist.addresses', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: newList }),
    });
    setBlacklist(newList);
  };

  return (
    <div>
      <h2>Quản Lý IP</h2>
      <input 
        placeholder="Nhập IP" 
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            addToBlacklist(e.target.value);
          }
        }}
      />
      <ul>
        {blacklist.map(ip => <li key={ip}>{ip}</li>)}
      </ul>
    </div>
  );
}
```

### 4. Hiển Thị IP Đang Gọi AI Liên Tục

```typescript
// components/SuspiciousIPs.tsx
export function SuspiciousIPs() {
  const [suspiciousIPs, setSuspiciousIPs] = useState([]);

  useEffect(() => {
    const fetchSuspiciousIPs = async () => {
      const res = await fetch(
        '/api/v1/sp-admin/system-configs/monitoring/monitoring.suspicious_ips',
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      setSuspiciousIPs(data.data.value || []);
    };

    fetchSuspiciousIPs();
    const interval = setInterval(fetchSuspiciousIPs, 60000); // Refresh mỗi phút
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>IP Đang Gọi AI Liên Tục</h2>
      <table>
        <thead>
          <tr>
            <th>IP</th>
            <th>Số Request</th>
            <th>Thời Gian</th>
            <th>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {suspiciousIPs.map((item: any) => (
            <tr key={item.ip}>
              <td>{item.ip}</td>
              <td>{item.requestCount}</td>
              <td>{item.timeWindow}</td>
              <td>
                <button onClick={() => banIP(item.ip)}>Ban IP</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## ⚠️ Lưu Ý

1. **API Keys**: Khi hiển thị trong UI, nên mask sensitive data (ví dụ: `sk-xxxxx...xxxxx`)

2. **Array Updates**: Khi update array (blacklist, whitelist, packages), phải gửi toàn bộ array, không phải chỉ phần thay đổi

3. **Type Safety**: Đảm bảo value type đúng với config type (string, number, boolean, array, object)

4. **Cache**: Configs được cache 1 giờ. Sau khi update, cache tự động clear.

5. **Permissions**: Chỉ SP-Admin mới có quyền truy cập các endpoints này.

---

**Last Updated**: 2024-01-09
