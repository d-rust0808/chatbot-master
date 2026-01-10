# SP-Admin Analytics API - Frontend Integration Guide

## 📋 Tổng quan

Tài liệu này hướng dẫn frontend tích hợp các API endpoints cho SP-Admin Analytics Dashboard.

**Base URL:** `/api/v1/sp-admin/analytics`

**Authentication:** Tất cả endpoints yêu cầu JWT token với role `sp-admin`

**Headers:**
```typescript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

---

## 🎯 API Endpoints

### 1. GET `/analytics/overview`

**Mục đích:** Lấy overview metrics cho dashboard cards

**Query Parameters:**
```typescript
{
  startDate?: string;        // ISO 8601 (optional)
  endDate?: string;          // ISO 8601 (optional)
  period?: 'day' | 'week' | 'month';  // Default: 'month'
  compareWithPrevious?: boolean;      // Default: true
}
```

**Response:**
```typescript
{
  revenue: {
    total: number;                    // VND
    previousPeriod?: number;
    changePercent?: number;           // % change
  };
  creditSpent: {
    total: number;
    previousPeriod?: number;
    changePercent?: number;
  };
  tenants: {
    total: number;
    active: number;
    new: number;                      // New trong period
    previousPeriod?: number;
    changePercent?: number;
  };
  aiRequests: {
    total: number;
    previousPeriod?: number;
    changePercent?: number;
  };
  tokens: {
    total: number;
    prompt: number;
    completion: number;
    previousPeriod?: number;
    changePercent?: number;
  };
  performance: {
    avgResponseTime: number;          // ms
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;                // 0-1
    successRate: number;              // 0-1
  };
  systemHealth: {
    uptime: number;                   // percentage
    apiRequestRate: number;           // req/min
    cacheHitRate: number;            // 0-1
  };
}
```

**Example Request:**
```typescript
const response = await fetch('/api/v1/sp-admin/analytics/overview?period=month&compareWithPrevious=true', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

**UI Implementation:**
```typescript
// Display as cards with:
// - Main value (large)
// - Change percentage with arrow (up/down)
// - Previous period value (small, gray)
```

---

### 2. GET `/analytics/growth`

**Mục đích:** Time-series data cho growth charts

**Query Parameters:**
```typescript
{
  startDate: string;        // Required - ISO 8601
  endDate: string;          // Required - ISO 8601
  metric: 'users' | 'tenants' | 'revenue' | 'ai_requests' | 'tokens';
  interval: 'hour' | 'day' | 'week' | 'month';  // Default: 'day'
}
```

**Response:**
```typescript
{
  data: Array<{
    date: string;           // ISO 8601
    value: number;
  }>;
  summary: {
    total: number;
    average: number;
    growth: number;         // % change từ start đến end
  };
}
```

**Example Request:**
```typescript
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const endDate = new Date().toISOString();

const response = await fetch(
  `/api/v1/sp-admin/analytics/growth?startDate=${startDate}&endDate=${endDate}&metric=users&interval=day`,
  {
    headers: { 'Authorization': `Bearer ${token}` },
  }
);
```

**UI Implementation:**
```typescript
// Use line chart (recharts/chart.js)
// X-axis: date
// Y-axis: value
// Show summary stats below chart
```

---

### 3. GET `/analytics/revenue`

**Mục đích:** Revenue analytics với breakdown

**Query Parameters:**
```typescript
{
  startDate?: string;       // ISO 8601
  endDate?: string;         // ISO 8601
  groupBy?: 'day' | 'week' | 'month' | 'tenant';  // Default: 'day'
  limit?: number;           // Default: 10 (for tenant grouping)
}
```

**Response:**
```typescript
{
  timeline?: Array<{        // Present when groupBy is day/week/month
    period: string;         // Date string
    revenue: number;       // VND
    transactions: number;
  }>;
  byTenant?: Array<{        // Present when groupBy is 'tenant'
    tenantId: string;
    tenantName: string;
    revenue: number;
    transactions: number;
  }>;
  byPaymentMethod: Array<{
    method: string;
    revenue: number;
    count: number;
  }>;
  total: {
    revenue: number;
    transactions: number;
  };
}
```

**Example Request:**
```typescript
// Timeline view
const response = await fetch(
  '/api/v1/sp-admin/analytics/revenue?groupBy=day&startDate=2024-01-01T00:00:00Z',
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// Top tenants view
const response = await fetch(
  '/api/v1/sp-admin/analytics/revenue?groupBy=tenant&limit=10',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

**UI Implementation:**
```typescript
// Timeline: Area chart
// Top tenants: Bar chart or table
// Payment methods: Pie chart
```

---

### 4. GET `/analytics/ai-usage`

**Mục đích:** AI usage analytics

**Query Parameters:**
```typescript
{
  startDate?: string;       // ISO 8601
  endDate?: string;         // ISO 8601
  groupBy?: 'provider' | 'model' | 'hour' | 'day';  // Default: 'provider'
  tenantId?: string;        // Optional filter
}
```

**Response:**
```typescript
{
  byProvider: Array<{
    provider: string;       // 'openai' | 'gemini' | 'deepseek'
    requests: number;
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
    cost: number;           // USD
  }>;
  byModel: Array<{
    model: string;
    provider: string;
    requests: number;
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
    cost: number;
  }>;
  byHour?: Array<{          // Present when groupBy is 'hour'
    hour: number;          // 0-23
    requests: number;
    avgResponseTime: number; // ms
  }>;
  summary: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;      // USD
    avgResponseTime: number; // ms
  };
}
```

**Example Request:**
```typescript
const response = await fetch(
  '/api/v1/sp-admin/analytics/ai-usage?groupBy=provider&startDate=2024-01-01T00:00:00Z',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

**UI Implementation:**
```typescript
// byProvider: Bar chart (horizontal)
// byModel: Table with sortable columns
// byHour: Line chart (24 hours)
// Summary: Cards at top
```

---

### 5. GET `/analytics/platforms`

**Mục đích:** Platform distribution analytics

**Query Parameters:**
```typescript
{
  startDate?: string;       // ISO 8601
  endDate?: string;         // ISO 8601
  metric?: 'conversations' | 'messages' | 'active_users';  // Optional
}
```

**Response:**
```typescript
{
  distribution: Array<{
    platform: string;       // 'whatsapp' | 'zalo' | 'messenger' | etc.
    conversations: number;
    messages: number;
    activeUsers: number;
    percentage: number;     // % of total conversations
  }>;
  total: {
    conversations: number;
    messages: number;
    activeUsers: number;
  };
}
```

**Example Request:**
```typescript
const response = await fetch(
  '/api/v1/sp-admin/analytics/platforms?startDate=2024-01-01T00:00:00Z',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

**UI Implementation:**
```typescript
// Pie chart for distribution
// Table below with details
// Show total stats prominently
```

---

### 6. GET `/analytics/top`

**Mục đích:** Top lists (tenants, users, chatbots)

**Query Parameters:**
```typescript
{
  type: 'tenants' | 'users' | 'chatbots';
  metric: 'revenue' | 'ai_requests' | 'conversations' | 'messages' | 'credit_spent';
  startDate?: string;       // ISO 8601
  endDate?: string;         // ISO 8601
  limit?: number;           // Default: 10, max: 100
}
```

**Response:**
```typescript
{
  items: Array<{
    id: string;
    name: string;
    value: number;          // Metric value
    change?: number;        // % change vs previous period (optional)
    metadata?: Record<string, unknown>;
  }>;
}
```

**Example Request:**
```typescript
// Top tenants by revenue
const response = await fetch(
  '/api/v1/sp-admin/analytics/top?type=tenants&metric=revenue&limit=10',
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// Top chatbots by conversations
const response = await fetch(
  '/api/v1/sp-admin/analytics/top?type=chatbots&metric=conversations&limit=20',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

**UI Implementation:**
```typescript
// Table with:
// - Rank (1, 2, 3...)
// - Name
// - Value (formatted)
// - Change % (if available)
// - Optional: Avatar/icon
```

---

### 7. GET `/analytics/health`

**Mục đích:** System health metrics

**Query Parameters:**
```typescript
{
  startDate?: string;       // ISO 8601
  endDate?: string;         // ISO 8601
  interval?: 'hour' | 'day';  // Default: 'hour'
}
```

**Response:**
```typescript
{
  performance: Array<{
    timestamp: string;       // ISO 8601
    avgResponseTime: number; // ms
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;      // 0-1
    successRate: number;    // 0-1
  }>;
  infrastructure: {
    apiRequestRate: number; // req/min
    databaseQueryTime: number; // ms
    cacheHitRate: number;   // 0-1
    proxyBalance: {
      remain: number;
      used: number;
      percentage: number;
    };
  };
  errors: Array<{
    type: string;          // Error code (e.g., '500', '404')
    count: number;
    lastOccurred: string;  // ISO 8601
  }>;
}
```

**Example Request:**
```typescript
const response = await fetch(
  '/api/v1/sp-admin/analytics/health?interval=hour',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

**UI Implementation:**
```typescript
// Performance: Multi-line chart (response times, error rate)
// Infrastructure: Cards with metrics
// Errors: Table with error types
```

---

## 🎨 UI/UX Recommendations

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│ Analytics Dashboard                    [Date Range] [Period] │
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │Revenue  │ │Tenants  │ │AI Req   │ │Tokens   │        │
│ │+12.5%   │ │+5 new   │ │2.5M     │ │1.2B     │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐         │
│ │ Growth Trends        │ │ Revenue Analytics │         │
│ │ [Line Chart]         │ │ [Area Chart]      │         │
│ └──────────────────────┘ └──────────────────────┘         │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐         │
│ │ AI Usage             │ │ Platform Distribution│         │
│ │ [Bar Chart]          │ │ [Pie Chart]         │         │
│ └──────────────────────┘ └──────────────────────┘         │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐         │
│ │ Top Tenants          │ │ System Health        │         │
│ │ [Table]              │ │ [Metrics Cards]      │         │
│ └──────────────────────┘ └──────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### Date Range Picker

**Presets:**
- Today
- Last 7 days
- Last 30 days
- This month
- Last month
- Custom range

**Implementation:**
```typescript
const presets = {
  today: { start: startOfToday(), end: endOfToday() },
  last7Days: { start: subDays(today, 7), end: today },
  last30Days: { start: subDays(today, 30), end: today },
  thisMonth: { start: startOfMonth(today), end: endOfMonth(today) },
  lastMonth: { start: startOfMonth(subMonths(today, 1)), end: endOfMonth(subMonths(today, 1)) },
};
```

### Period Toggle

```typescript
// Toggle between Day/Week/Month view
const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
```

### Loading States

```typescript
// Show skeleton loaders while fetching
<SkeletonCard />
<SkeletonChart />
```

### Error Handling

```typescript
try {
  const data = await fetchAnalytics();
} catch (error) {
  if (error.status === 401) {
    // Redirect to login
  } else if (error.status === 403) {
    // Show "Access denied"
  } else {
    // Show error message with retry button
  }
}
```

---

## 💻 Code Examples

### React + TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';

// Overview hook
function useAnalyticsOverview(params: {
  period?: 'day' | 'week' | 'month';
  compareWithPrevious?: boolean;
}) {
  return useQuery({
    queryKey: ['analytics', 'overview', params],
    queryFn: async () => {
      const query = new URLSearchParams({
        period: params.period || 'month',
        compareWithPrevious: String(params.compareWithPrevious ?? true),
      });
      
      const response = await fetch(`/api/v1/sp-admin/analytics/overview?${query}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Growth hook
function useAnalyticsGrowth(params: {
  startDate: Date;
  endDate: Date;
  metric: 'users' | 'tenants' | 'revenue' | 'ai_requests' | 'tokens';
  interval?: 'hour' | 'day' | 'week' | 'month';
}) {
  return useQuery({
    queryKey: ['analytics', 'growth', params],
    queryFn: async () => {
      const query = new URLSearchParams({
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
        metric: params.metric,
        interval: params.interval || 'day',
      });
      
      const response = await fetch(`/api/v1/sp-admin/analytics/growth?${query}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });
}

// Usage in component
function AnalyticsDashboard() {
  const { data: overview, isLoading } = useAnalyticsOverview({ period: 'month' });
  const { data: growth } = useAnalyticsGrowth({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    metric: 'users',
  });
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      <OverviewCards data={overview} />
      <GrowthChart data={growth} />
    </div>
  );
}
```

### Vue 3 + Composition API

```typescript
import { ref, computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';

export function useAnalyticsOverview(params: {
  period?: 'day' | 'week' | 'month';
}) {
  return useQuery({
    queryKey: ['analytics', 'overview', params],
    queryFn: async () => {
      const query = new URLSearchParams({
        period: params.period || 'month',
      });
      
      const response = await fetch(`/api/v1/sp-admin/analytics/overview?${query}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      
      return response.json();
    },
  });
}
```

---

## 📊 Chart Library Recommendations

### Option 1: Recharts (React)

```bash
npm install recharts
```

**Pros:**
- React-friendly
- TypeScript support
- Responsive
- Good documentation

**Example:**
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

<LineChart data={growthData.data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="value" stroke="#8884d8" />
</LineChart>
```

### Option 2: Chart.js + react-chartjs-2

```bash
npm install chart.js react-chartjs-2
```

**Pros:**
- Very popular
- Many chart types
- Good performance

### Option 3: Victory (React)

```bash
npm install victory
```

**Pros:**
- Beautiful defaults
- Animations
- Flexible

---

## 🔄 Data Refresh Strategy

### Auto-refresh

```typescript
// Refresh every 5 minutes
const { data, refetch } = useAnalyticsOverview({ period: 'month' });

useEffect(() => {
  const interval = setInterval(() => {
    refetch();
  }, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, [refetch]);
```

### Manual refresh

```typescript
<Button onClick={() => refetch()}>
  <RefreshIcon />
  Refresh
</Button>
```

---

## 🎯 Best Practices

### 1. Parallel Queries

```typescript
// Fetch multiple endpoints in parallel
const { data: overview } = useAnalyticsOverview({ period: 'month' });
const { data: revenue } = useAnalyticsRevenue({ groupBy: 'day' });
const { data: platforms } = useAnalyticsPlatforms({});
```

### 2. Caching

```typescript
// Use appropriate staleTime
staleTime: 5 * 60 * 1000, // 5 minutes for overview
staleTime: 1 * 60 * 1000, // 1 minute for health
```

### 3. Error Boundaries

```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <AnalyticsDashboard />
</ErrorBoundary>
```

### 4. Formatting Numbers

```typescript
// Format VND
const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

// Format large numbers
const formatNumber = (num: number) => {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
};
```

### 5. Date Formatting

```typescript
import { format, parseISO } from 'date-fns';

const formatDate = (dateString: string) => {
  return format(parseISO(dateString), 'MMM dd, yyyy');
};
```

---

## ⚠️ Error Responses

All endpoints return errors in this format:

```typescript
{
  error: {
    message: string;
    details?: any;
  };
  api_version: "v1";
  provider: "cdudu";
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Internal Server Error

---

## 📝 Notes

1. **Date Format:** Always use ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
2. **Timezone:** Server uses UTC, convert to local time in frontend
3. **Pagination:** Top lists support `limit` parameter (max 100)
4. **Performance:** Large date ranges may take time, show loading states
5. **Caching:** Consider caching responses for better UX

---

## 🚀 Quick Start Checklist

- [ ] Install chart library (recharts/chart.js)
- [ ] Set up API client with authentication
- [ ] Create hooks/services for each endpoint
- [ ] Build Overview cards component
- [ ] Build Growth chart component
- [ ] Build Revenue chart component
- [ ] Build AI Usage chart component
- [ ] Build Platform distribution chart
- [ ] Build Top lists table component
- [ ] Build System health component
- [ ] Add date range picker
- [ ] Add period toggle
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add auto-refresh (optional)
- [ ] Test with real data

---

## 📞 Support

Nếu có vấn đề khi tích hợp, vui lòng:
1. Check network tab trong DevTools
2. Verify JWT token còn valid
3. Check response format
4. Contact backend team

