# Wallet Balance Updates - Frontend Integration Guide

## Tổng quan

Hệ thống hỗ trợ cập nhật số dư real-time qua WebSocket và API endpoints. Frontend có thể:
- Nhận balance updates tự động khi nạp tiền, mua credit
- Refresh balance khi reload trang
- Không cần login lại để thấy số dư mới

---

## WebSocket Real-time Updates

### Kết nối WebSocket

```typescript
import { io } from 'socket.io-client';

// Connect với tenantId
const socket = io('wss://cchatbot.pro/socket.io', {
  query: { tenantId: 'tenant_123' }, // Tenant ID từ JWT token hoặc user context
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

### Subscribe Balance Updates

```typescript
// Listen for balance updates
socket.on('wallet:balance:update', (data) => {
  console.log('Balance updated:', data);
  /*
  data = {
    tenantId: "tenant_123",
    balances: {
      vnd: 100000,      // Số dư VNĐ
      credit: 50000     // Số dư Credit
    },
    timestamp: "2026-01-09T06:10:00.000Z"
  }
  */
  
  // Update UI với số dư mới
  updateBalanceUI(data.balances.vnd, data.balances.credit);
});

// Handle connection events
socket.on('connect', () => {
  console.log('WebSocket connected');
});

socket.on('disconnect', () => {
  console.log('WebSocket disconnected');
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
});
```

### Complete Example: React Hook

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Balances {
  vnd: number;
  credit: number;
}

export function useBalanceUpdates(tenantId: string | null) {
  const [balances, setBalances] = useState<Balances>({ vnd: 0, credit: 0 });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!tenantId) return;

    // Connect WebSocket
    const newSocket = io('wss://cchatbot.pro/socket.io', {
      query: { tenantId },
      transports: ['websocket'],
      reconnection: true,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    // Balance update event
    newSocket.on('wallet:balance:update', (data: { balances: Balances }) => {
      console.log('Balance updated via WebSocket:', data.balances);
      setBalances(data.balances);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.close();
    };
  }, [tenantId]);

  return { balances, socket, connected };
}

// Usage in component
function WalletBalance() {
  const { tenantId } = useAuth(); // Get from your auth context
  const { balances, connected } = useBalanceUpdates(tenantId);

  return (
    <div>
      <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      <div>VNĐ: {balances.vnd.toLocaleString('vi-VN')} VNĐ</div>
      <div>Credit: {balances.credit.toLocaleString('vi-VN')}</div>
    </div>
  );
}
```

---

## API Endpoints

### 1. Get All Balances (Recommended)

**GET** `/api/v1/credits/balances`

Lấy cả VND và Credit balance cùng lúc. Nên dùng endpoint này thay vì gọi 2 endpoint riêng.

#### Request

```typescript
const response = await fetch('/api/v1/credits/balances', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "balances": {
      "vnd": 100000,
      "credit": 50000
    },
    "tenantId": "tenant_123"
  }
}
```

#### Example

```typescript
async function getAllBalances(): Promise<{ vnd: number; credit: number }> {
  const response = await fetch('/api/v1/credits/balances', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get balances');
  }

  const data = await response.json();
  return data.data.balances;
}

// Usage
const balances = await getAllBalances();
console.log('VND:', balances.vnd);
console.log('Credit:', balances.credit);
```

### 2. Get Credit Balance Only

**GET** `/api/v1/credits/balance`

#### Response

```json
{
  "success": true,
  "data": {
    "balance": 50000,
    "currency": "CREDIT",
    "tenantId": "tenant_123"
  }
}
```

### 3. Get VND Balance Only

**GET** `/api/v1/credits/vnd-balance`

#### Response

```json
{
  "success": true,
  "data": {
    "balance": 100000,
    "currency": "VND",
    "tenantId": "tenant_123"
  }
}
```

---

## Complete Integration Example

### React Component với WebSocket + API

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Balances {
  vnd: number;
  credit: number;
}

export function WalletBalanceComponent() {
  const { user, token } = useAuth(); // Your auth hook
  const [balances, setBalances] = useState<Balances>({ vnd: 0, credit: 0 });
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initial load: Get balances from API
  useEffect(() => {
    async function loadBalances() {
      try {
        const response = await fetch('/api/v1/credits/balances', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBalances(data.data.balances);
        }
      } catch (error) {
        console.error('Failed to load balances:', error);
      } finally {
        setLoading(false);
      }
    }

    if (token && user?.tenantId) {
      loadBalances();
    }
  }, [token, user?.tenantId]);

  // WebSocket: Real-time updates
  useEffect(() => {
    if (!user?.tenantId) return;

    const newSocket = io('wss://cchatbot.pro/socket.io', {
      query: { tenantId: user.tenantId },
      transports: ['websocket'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected for balance updates');
    });

    newSocket.on('wallet:balance:update', (data: { balances: Balances }) => {
      console.log('💰 Balance updated:', data.balances);
      setBalances(data.balances);
      
      // Optional: Show notification
      showNotification('Số dư đã được cập nhật');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user?.tenantId]);

  // Manual refresh function
  const refreshBalances = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/credits/balances', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBalances(data.data.balances);
      }
    } catch (error) {
      console.error('Failed to refresh balances:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading balances...</div>;
  }

  return (
    <div>
      <div>
        <h3>Số dư</h3>
        <div>VNĐ: {balances.vnd.toLocaleString('vi-VN')} VNĐ</div>
        <div>Credit: {balances.credit.toLocaleString('vi-VN')}</div>
        <button onClick={refreshBalances}>🔄 Refresh</button>
      </div>
    </div>
  );
}
```

---

## Khi nào Balance được cập nhật?

### Tự động qua WebSocket (Real-time)

1. **Nạp tiền thành công**
   - Khi payment completed → emit `wallet:balance:update`
   - VND balance tăng

2. **Mua credit**
   - Khi `purchaseCredits()` thành công → emit update
   - VND giảm, Credit tăng

3. **Mua credit package**
   - Khi `purchaseCreditPackage()` thành công → emit update
   - VND giảm, Credit tăng (có bonus)

### Manual refresh (API)

- Khi user reload trang → gọi `GET /api/v1/credits/balances`
- Khi user click "Refresh" button
- Khi cần verify balance sau transaction

---

## WebSocket Event Format

### Event: `wallet:balance:update`

```typescript
{
  tenantId: string;        // Tenant ID
  balances: {
    vnd: number;           // Số dư VNĐ
    credit: number;        // Số dư Credit
  },
  timestamp: string;        // ISO 8601 timestamp
}
```

### Example Event Data

```json
{
  "tenantId": "cmk2lfvar000113w2qevq7e20",
  "balances": {
    "vnd": 150000,
    "credit": 75000
  },
  "timestamp": "2026-01-09T06:10:00.000Z"
}
```

---

## Best Practices

### 1. Kết hợp WebSocket + API

```typescript
// Strategy: WebSocket cho real-time, API cho initial load và fallback
function useWalletBalance(tenantId: string) {
  const [balances, setBalances] = useState({ vnd: 0, credit: 0 });

  // 1. Initial load từ API
  useEffect(() => {
    fetchBalances().then(setBalances);
  }, []);

  // 2. Subscribe WebSocket cho updates
  useEffect(() => {
    const socket = connectWebSocket(tenantId);
    socket.on('wallet:balance:update', (data) => {
      setBalances(data.balances);
    });
    return () => socket.close();
  }, [tenantId]);

  return balances;
}
```

### 2. Error Handling

```typescript
socket.on('connect_error', (error) => {
  console.error('WebSocket connection failed:', error);
  // Fallback: Poll API every 5 seconds
  const pollInterval = setInterval(() => {
    fetchBalances().then(setBalances);
  }, 5000);

  socket.on('connect', () => {
    clearInterval(pollInterval); // Stop polling when connected
  });
});
```

### 3. Reconnection Strategy

```typescript
const socket = io('wss://cchatbot.pro/socket.io', {
  query: { tenantId },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  timeout: 20000,
});
```

### 4. Optimistic Updates

```typescript
// Khi user nạp tiền, update UI ngay (optimistic)
function handlePaymentSuccess(paymentAmount: number) {
  // Optimistic update
  setBalances(prev => ({
    ...prev,
    vnd: prev.vnd + paymentAmount
  }));

  // WebSocket sẽ confirm lại sau
  // Nếu WebSocket không đến, API refresh sẽ correct
}
```

---

## Testing

### Test WebSocket Connection

```typescript
// Test WebSocket connection
const socket = io('wss://cchatbot.pro/socket.io', {
  query: { tenantId: 'test_tenant' },
});

socket.on('connect', () => {
  console.log('✅ Connected');
});

socket.on('wallet:balance:update', (data) => {
  console.log('✅ Received balance update:', data);
});
```

### Test API Endpoint

```bash
# Get balances
curl -X GET https://cchatbot.pro/api/v1/credits/balances \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### WebSocket không connect

1. **Kiểm tra tenantId**: Đảm bảo tenantId được gửi trong query
2. **Kiểm tra CORS**: WebSocket server đã config CORS đúng chưa
3. **Kiểm tra network**: Firewall có block WebSocket không

### Không nhận được balance updates

1. **Kiểm tra tenantId**: Phải match với tenantId của user
2. **Kiểm tra WebSocket connection**: Socket có connected không
3. **Kiểm tra logs**: Xem server có emit event không

### Balance không cập nhật sau transaction

1. **Fallback**: Gọi API `GET /api/v1/credits/balances` để refresh
2. **Kiểm tra WebSocket**: Có thể WebSocket disconnected, cần reconnect
3. **Kiểm tra logs**: Xem server có emit event sau transaction không

---

## TypeScript Types

```typescript
// Balance types
interface Balances {
  vnd: number;
  credit: number;
}

interface BalanceUpdateEvent {
  tenantId: string;
  balances: Balances;
  timestamp: string;
}

// API Response types
interface BalanceResponse {
  success: boolean;
  data: {
    balances: Balances;
    tenantId: string;
  };
}

// Usage
socket.on('wallet:balance:update', (data: BalanceUpdateEvent) => {
  // Type-safe access
  const vnd = data.balances.vnd;
  const credit = data.balances.credit;
});
```

---

## Quick Start Checklist

- [ ] Install `socket.io-client`: `npm install socket.io-client`
- [ ] Connect WebSocket với tenantId trong query
- [ ] Subscribe event `wallet:balance:update`
- [ ] Update UI khi nhận được event
- [ ] Add API endpoint `GET /api/v1/credits/balances` cho initial load
- [ ] Add manual refresh button (optional)
- [ ] Handle WebSocket disconnection và reconnection
- [ ] Test với nạp tiền và mua credit

---

## Example: Vue.js

```vue
<template>
  <div>
    <div>VNĐ: {{ balances.vnd.toLocaleString('vi-VN') }} VNĐ</div>
    <div>Credit: {{ balances.credit.toLocaleString('vi-VN') }}</div>
    <button @click="refreshBalances">Refresh</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

const balances = ref({ vnd: 0, credit: 0 });
const socket = ref<Socket | null>(null);
const tenantId = 'tenant_123'; // Get from your auth

async function loadBalances() {
  const response = await fetch('/api/v1/credits/balances', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json();
  balances.value = data.data.balances;
}

function refreshBalances() {
  loadBalances();
}

onMounted(() => {
  // Initial load
  loadBalances();

  // WebSocket connection
  socket.value = io('wss://cchatbot.pro/socket.io', {
    query: { tenantId },
  });

  socket.value.on('wallet:balance:update', (data) => {
    balances.value = data.balances;
  });
});

onUnmounted(() => {
  socket.value?.close();
});
</script>
```

---

## Example: Vanilla JavaScript

```javascript
// Connect WebSocket
const socket = io('wss://cchatbot.pro/socket.io', {
  query: { tenantId: 'tenant_123' },
});

// Listen for balance updates
socket.on('wallet:balance:update', (data) => {
  document.getElementById('vnd-balance').textContent = 
    data.balances.vnd.toLocaleString('vi-VN') + ' VNĐ';
  document.getElementById('credit-balance').textContent = 
    data.balances.credit.toLocaleString('vi-VN');
});

// Initial load
async function loadBalances() {
  const response = await fetch('/api/v1/credits/balances', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await response.json();
  
  document.getElementById('vnd-balance').textContent = 
    data.data.balances.vnd.toLocaleString('vi-VN') + ' VNĐ';
  document.getElementById('credit-balance').textContent = 
    data.data.balances.credit.toLocaleString('vi-VN');
}

// Load on page load
loadBalances();
```

---

## Summary

✅ **WebSocket**: Real-time updates khi có giao dịch  
✅ **API Endpoint**: Refresh balance khi reload hoặc manual  
✅ **Auto-update**: Không cần login lại  
✅ **Type-safe**: TypeScript types included  
✅ **Error handling**: Reconnection và fallback strategies  

**Copy code examples trên để integrate vào frontend!**

