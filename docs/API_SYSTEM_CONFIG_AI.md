# System Config AI - Hướng Dẫn Frontend

**Tài liệu đơn giản cho Frontend - SP-Admin quản lý AI Config**

---

## 🔑 Base URL & Authentication

```
Base URL: /api/v1/sp-admin
Authentication: Bearer Token (chỉ SP-Admin)
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
```

---

## 📋 3 Chức Năng Chính

### 1. Config Proxy API Key

**Mục đích**: Cấu hình Proxy API Key cho v98store (thay vì hardcode trong .env)

#### 1.1. Lấy Proxy API Key

```bash
GET /api/v1/sp-admin/system-configs/ai/ai.proxy_api_key
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": {
    "category": "ai",
    "key": "ai.proxy_api_key",
    "value": "sk-A7on6NM4zkiN4fsLPRHeoUBpiY9egw3ZgkKFmDnCXAxivqEK",
    "type": "string",
    "description": "Proxy API Key for v98store",
    "isEditable": true
  }
}
```

#### 1.2. Lưu Proxy API Key

```bash
PATCH /api/v1/sp-admin/system-configs/ai/ai.proxy_api_key
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": "sk-A7on6NM4zkiN4fsLPRHeoUBpiY9egw3ZgkKFmDnCXAxivqEK"
}
```

**Response:**
```json
{
  "data": {
    "category": "ai",
    "key": "ai.proxy_api_key",
    "value": "sk-A7on6NM4zkiN4fsLPRHeoUBpiY9egw3ZgkKFmDnCXAxivqEK",
    "type": "string",
    "updatedAt": "2024-01-09T10:00:00Z"
  }
}
```

---

### 2. Hiển Thị Số Dư (Balance)

**Mục đích**: Xem số dư còn lại và đã sử dụng từ v98store proxy

#### API Endpoint:

```bash
GET /api/v1/sp-admin/ai/balance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "remain_quota": 8.042644,
    "used_quota": 16.957356
  }
}
```

**Lưu ý**: 
- `remain_quota`: Số dư còn lại (USD)
- `used_quota`: Số đã sử dụng (USD)
- API này gọi đến `https://v98store.com/check-balance?key=<PROXY_API_KEY>`

---

### 3. Hiển Thị Logs

**Mục đích**: Xem logs của tất cả AI API calls

#### 3.1. List AI Request Logs

```bash
GET /api/v1/sp-admin/ai-logs
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `tenantId` | string | No | Filter theo tenant |
| `provider` | enum | No | Filter theo provider: `openai`, `gemini`, `deepseek` |
| `model` | string | No | Filter theo model name |
| `ipAddress` | string | No | Filter theo IP address |
| `startDate` | datetime | No | Start date (ISO 8601) |
| `endDate` | datetime | No | End date (ISO 8601) |
| `page` | number | No | Số trang (default: 1) |
| `limit` | number | No | Số items/trang (default: 50, max: 100) |

**Ví dụ:**

```bash
# Lấy tất cả logs
GET /api/v1/sp-admin/ai-logs?page=1&limit=50

# Filter theo IP
GET /api/v1/sp-admin/ai-logs?ipAddress=192.168.1.100

# Filter theo date range
GET /api/v1/sp-admin/ai-logs?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z

# Filter theo provider và model
GET /api/v1/sp-admin/ai-logs?provider=openai&model=gpt-4o-mini
```

**Response:**
```json
{
  "data": [
    {
      "id": "log_123",
      "tenantId": "tenant_456",
      "conversationId": "conv_101",
      "chatbotId": "chatbot_202",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "requestUrl": "https://v98store.com/v1/chat/completions",
      "requestMethod": "POST",
      "statusCode": 200,
      "responseTime": 1250,
      "tokens": {
        "prompt": 150,
        "completion": 200,
        "total": 350
      },
      "cost": 0.00015,
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "error": null,
      "createdAt": "2024-01-09T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20
  }
}
```

#### 3.2. Xem Suspicious IPs (IP đang gọi AI liên tục)

```bash
GET /api/v1/sp-admin/ai-logs/suspicious-ips
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Mô tả |
|-----------|------|----------|-------|
| `threshold` | number | No | Ngưỡng số requests (default: 100) |
| `startDate` | datetime | No | Start date (ISO 8601) |
| `endDate` | datetime | No | End date (ISO 8601) |

**Ví dụ:**

```bash
GET /api/v1/sp-admin/ai-logs/suspicious-ips?threshold=100
```

**Response:**
```json
{
  "data": [
    {
      "ipAddress": "192.168.1.100",
      "requestCount": 150,
      "totalTokens": 50000,
      "totalCost": 25.5,
      "firstRequestAt": "2024-01-09T10:00:00Z",
      "lastRequestAt": "2024-01-09T10:05:00Z",
      "timeWindow": "5 minutes",
      "providers": ["openai"],
      "models": ["gpt-4o-mini", "gpt-4o"]
    }
  ]
}
```

---

## 💻 Frontend Implementation

### TypeScript Types

```typescript
// types/ai-config.ts
export interface ProxyBalance {
  remain_quota: number;
  used_quota: number;
}

export interface AIRequestLog {
  id: string;
  tenantId?: string;
  conversationId?: string;
  chatbotId?: string;
  provider: string;
  model: string;
  requestUrl?: string;
  requestMethod: string;
  statusCode?: number;
  responseTime?: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  ipAddress?: string;
  userAgent?: string;
  error?: string;
  createdAt: string;
}

export interface SuspiciousIP {
  ipAddress: string;
  requestCount: number;
  totalTokens: number;
  totalCost: number;
  firstRequestAt: string;
  lastRequestAt: string;
  timeWindow: string;
  providers: string[];
  models: string[];
}
```

### API Service

```typescript
// services/ai-config.service.ts
const API_BASE = '/api/v1/sp-admin';

export const aiConfigService = {
  /**
   * Get Proxy API Key
   */
  async getProxyAPIKey(): Promise<string> {
    const res = await fetch(`${API_BASE}/system-configs/ai/ai.proxy_api_key`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    const data = await res.json();
    return data.data.value as string;
  },

  /**
   * Update Proxy API Key
   */
  async updateProxyAPIKey(apiKey: string): Promise<void> {
    await fetch(`${API_BASE}/system-configs/ai/ai.proxy_api_key`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: apiKey }),
    });
  },

  /**
   * Get Balance
   */
  async getBalance(): Promise<ProxyBalance> {
    const res = await fetch(`${API_BASE}/ai/balance`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    const data = await res.json();
    return data.data;
  },

  /**
   * List AI Request Logs
   */
  async listLogs(options?: {
    tenantId?: string;
    provider?: 'openai' | 'gemini' | 'deepseek';
    model?: string;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AIRequestLog[]; meta: any }> {
    const params = new URLSearchParams();
    if (options?.tenantId) params.append('tenantId', options.tenantId);
    if (options?.provider) params.append('provider', options.provider);
    if (options?.model) params.append('model', options.model);
    if (options?.ipAddress) params.append('ipAddress', options.ipAddress);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const res = await fetch(`${API_BASE}/ai-logs?${params}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    return res.json();
  },

  /**
   * Get Suspicious IPs
   */
  async getSuspiciousIPs(options?: {
    threshold?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<SuspiciousIP[]> {
    const params = new URLSearchParams();
    if (options?.threshold) params.append('threshold', options.threshold.toString());
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const res = await fetch(`${API_BASE}/ai-logs/suspicious-ips?${params}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    const data = await res.json();
    return data.data;
  },
};

function getToken(): string {
  return localStorage.getItem('token') || '';
}
```

### React Components

#### 1. Proxy API Key Config Component

```typescript
// components/ProxyAPIKeyConfig.tsx
import { useState, useEffect } from 'react';
import { aiConfigService } from '../services/ai-config.service';

export function ProxyAPIKeyConfig() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAPIKey();
  }, []);

  const loadAPIKey = async () => {
    setLoading(true);
    try {
      const key = await aiConfigService.getProxyAPIKey();
      setApiKey(key);
    } catch (error) {
      console.error('Failed to load API key', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAPIKey = async () => {
    setSaving(true);
    try {
      await aiConfigService.updateProxyAPIKey(apiKey);
      alert('API Key saved successfully!');
    } catch (error) {
      alert('Failed to save API key');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const maskAPIKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return key;
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Proxy API Key Configuration</h2>
      <div>
        <label>API Key:</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-xxxxx"
          style={{ width: '400px', padding: '8px' }}
        />
        {apiKey && (
          <span style={{ marginLeft: '10px', color: '#666' }}>
            Current: {maskAPIKey(apiKey)}
          </span>
        )}
      </div>
      <button onClick={saveAPIKey} disabled={saving} style={{ marginTop: '10px' }}>
        {saving ? 'Saving...' : 'Save API Key'}
      </button>
    </div>
  );
}
```

#### 2. Balance Display Component

```typescript
// components/BalanceDisplay.tsx
import { useState, useEffect } from 'react';
import { aiConfigService } from '../services/ai-config.service';
import type { ProxyBalance } from '../types/ai-config';

export function BalanceDisplay() {
  const [balance, setBalance] = useState<ProxyBalance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBalance();
    // Auto refresh every 30 seconds
    const interval = setInterval(loadBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadBalance = async () => {
    setLoading(true);
    try {
      const data = await aiConfigService.getBalance();
      setBalance(data);
    } catch (error) {
      console.error('Failed to load balance', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !balance) return <div>Loading balance...</div>;

  if (!balance) return <div>No balance data</div>;

  const total = balance.remain_quota + balance.used_quota;
  const usedPercentage = total > 0 ? (balance.used_quota / total) * 100 : 0;

  return (
    <div>
      <h2>Proxy Balance</h2>
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>Remaining Quota</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
            ${balance.remain_quota.toFixed(6)}
          </div>
        </div>
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>Used Quota</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
            ${balance.used_quota.toFixed(6)}
          </div>
        </div>
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', color: '#666' }}>Total Quota</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            ${total.toFixed(6)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          Usage: {usedPercentage.toFixed(2)}%
        </div>
        <div style={{ width: '100%', height: '20px', backgroundColor: '#e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${usedPercentage}%`,
              height: '100%',
              backgroundColor: '#ef4444',
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>
      <button onClick={loadBalance} style={{ marginTop: '10px' }}>
        Refresh
      </button>
    </div>
  );
}
```

#### 3. AI Logs Viewer Component

```typescript
// components/AILogsViewer.tsx
import { useState, useEffect } from 'react';
import { aiConfigService } from '../services/ai-config.service';
import type { AIRequestLog } from '../types/ai-config';

export function AILogsViewer() {
  const [logs, setLogs] = useState<AIRequestLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    provider: '',
    model: '',
    ipAddress: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50,
  });
  const [meta, setMeta] = useState<any>({});

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await aiConfigService.listLogs(filters);
      setLogs(result.data);
      setMeta(result.meta);
    } catch (error) {
      console.error('Failed to load logs', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost?: number) => {
    if (!cost) return '-';
    return `$${cost.toFixed(6)}`;
  };

  const formatTokens = (tokens?: { prompt: number; completion: number; total: number }) => {
    if (!tokens) return '-';
    return `${tokens.total} (${tokens.prompt}+${tokens.completion})`;
  };

  return (
    <div>
      <h2>AI Request Logs</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select
          value={filters.provider}
          onChange={(e) => setFilters({ ...filters, provider: e.target.value, page: 1 })}
          style={{ padding: '8px' }}
        >
          <option value="">All Providers</option>
          <option value="openai">OpenAI</option>
          <option value="gemini">Gemini</option>
          <option value="deepseek">DeepSeek</option>
        </select>
        <input
          placeholder="Model"
          value={filters.model}
          onChange={(e) => setFilters({ ...filters, model: e.target.value, page: 1 })}
          style={{ padding: '8px', width: '200px' }}
        />
        <input
          placeholder="IP Address"
          value={filters.ipAddress}
          onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value, page: 1 })}
          style={{ padding: '8px', width: '150px' }}
        />
        <input
          type="datetime-local"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
          style={{ padding: '8px' }}
        />
        <input
          type="datetime-local"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
          style={{ padding: '8px' }}
        />
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Time</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Provider</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Model</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>IP</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Tokens</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Cost</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Response Time</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{log.provider}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{log.model}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{log.ipAddress || '-'}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{formatTokens(log.tokens)}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{formatCost(log.cost)}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {log.responseTime ? `${log.responseTime}ms` : '-'}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    {log.statusCode || (log.error ? 'Error' : '-')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              Previous
            </button>
            <span>
              Page {filters.page} of {meta.totalPages || 1} (Total: {meta.total || 0})
            </span>
            <button
              disabled={filters.page >= (meta.totalPages || 1)}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

#### 4. Suspicious IPs Component

```typescript
// components/SuspiciousIPs.tsx
import { useState, useEffect } from 'react';
import { aiConfigService } from '../services/ai-config.service';
import type { SuspiciousIP } from '../types/ai-config';

export function SuspiciousIPs() {
  const [suspiciousIPs, setSuspiciousIPs] = useState<SuspiciousIP[]>([]);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(100);

  useEffect(() => {
    loadSuspiciousIPs();
    const interval = setInterval(loadSuspiciousIPs, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [threshold]);

  const loadSuspiciousIPs = async () => {
    setLoading(true);
    try {
      const data = await aiConfigService.getSuspiciousIPs({ threshold });
      setSuspiciousIPs(data);
    } catch (error) {
      console.error('Failed to load suspicious IPs', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Suspicious IPs</h2>
      <div style={{ marginBottom: '20px' }}>
        <label>Threshold (requests): </label>
        <input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(parseInt(e.target.value) || 100)}
          style={{ padding: '8px', width: '100px' }}
        />
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>IP Address</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Request Count</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Total Tokens</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Total Cost</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Time Window</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Providers</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Models</th>
            </tr>
          </thead>
          <tbody>
            {suspiciousIPs.map((item) => (
              <tr key={item.ipAddress}>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.ipAddress}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.requestCount}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  {item.totalTokens.toLocaleString()}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  ${item.totalCost.toFixed(2)}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.timeWindow}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.providers.join(', ')}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{item.models.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

## ⚠️ Lưu Ý

1. **API Key Security**: 
   - Khi hiển thị trong UI, luôn mask sensitive data (ví dụ: `sk-xxxxx...xxxxx`)
   - Sử dụng `type="password"` cho input fields

2. **Balance Auto Refresh**: 
   - Nên auto refresh balance mỗi 30 giây để cập nhật số dư

3. **Logs Pagination**: 
   - Default: page=1, limit=50
   - Max limit: 100

4. **Date Format**: 
   - Sử dụng ISO 8601 format cho dates: `2024-01-09T10:00:00Z`
   - Frontend có thể convert từ `datetime-local` input sang ISO format

5. **Error Handling**: 
   - Luôn handle errors gracefully
   - Hiển thị user-friendly error messages

---

**Last Updated**: 2024-01-09

