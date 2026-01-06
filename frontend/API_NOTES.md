# API Notes for Frontend

Base URL (dev): `http://localhost:3000`

Base prefix: `/api/v1`

## Headers

### Auth
- `Authorization: Bearer <accessToken>`

### Tenant (SaaS)
- `x-tenant-slug: <tenantSlug>`

> Backend cũng có thể extract tenant từ subdomain (Host), nhưng FE MVP nên dùng `x-tenant-slug` để rõ ràng.

## Authentication

### Register
- `POST /api/v1/auth/register`

Body:
```json
{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

### Login
- `POST /api/v1/auth/login`

Body:
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

### Refresh token
- `POST /api/v1/auth/refresh`

Body:
```json
{
  "refreshToken": "..."
}
```

### Logout
- `POST /api/v1/auth/logout`

Requires auth.

## Chatbots

### List chatbots
- `GET /api/v1/chatbots`

Requires auth + tenant header.

Query:
- `page` (default `1`)
- `limit` (default `50`, max `100`)

### Create chatbot
- `POST /api/v1/chatbots`

Requires auth + tenant header.

Body:
```json
{
  "name": "Shop Bot",
  "description": "...",
  "systemPrompt": "...",
  "aiModel": "gpt-4o-mini",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

### Get chatbot
- `GET /api/v1/chatbots/:chatbotId`

Requires auth + tenant header.

### Update chatbot
- `PATCH /api/v1/chatbots/:chatbotId`
- `PUT /api/v1/chatbots/:chatbotId`

Requires auth + tenant header.

### Models
- `GET /api/v1/chatbots/models` (public)
- `GET /api/v1/chatbots/models/test` (public)
- `GET /api/v1/chatbots/models/:modelName/test` (public)

## Platforms

All require auth. Most handlers also call `requireTenant()` → tenant header required.

### Connect platform
- `POST /api/v1/platforms/connect`

Body:
```json
{
  "chatbotId": "...",
  "platform": "whatsapp",
  "credentials": {},
  "options": {}
}
```

### Disconnect platform
- `DELETE /api/v1/platforms/:connectionId/disconnect`

### List connections
- `GET /api/v1/platforms/connections`

Optional query:
- `chatbotId`

### Send message
- `POST /api/v1/platforms/send-message`

Body:
```json
{
  "connectionId": "...",
  "chatId": "...",
  "message": "Hello",
  "useQueue": false,
  "options": {
    "mediaUrl": "https://...",
    "mediaType": "image"
  }
}
```

### Get chats
- `GET /api/v1/platforms/:connectionId/chats`

## AI

All routes require auth. Handler cũng gọi `requireTenant()` ở `/generate`.

### Generate
- `POST /api/v1/ai/generate`

Body:
```json
{
  "conversationId": "...",
  "message": "..."
}
```

### Proxy balance/logs
- `GET /api/v1/ai/balance`
- `GET /api/v1/ai/logs`

## Admin

Base path:
- `/api/v1/admin`

**Auth**: tất cả admin routes hiện tại chỉ require `Authorization` (JWT). Backend có TODO role check nên hiện tại *mọi user đã login đều call được* (cần siết lại sau).

### System stats
- `GET /api/v1/admin/stats`

Response `data` gồm tổng quan:
- users.total
- tenants.total
- chatbots.total
- conversations.total
- messages.total
- platformConnections.active

### Users
- `GET /api/v1/admin/users`

Query:
- `page` (default 1)
- `limit` (default 50, max 100)
- `search` (search by email/name, case-insensitive)

### Tenants
- `GET /api/v1/admin/tenants`

Query:
- `page` (default 1)
- `limit` (default 50, max 100)
- `search` (search by name/slug, case-insensitive)

### Tenant detail
- `GET /api/v1/admin/tenants/:tenantId`

Include:
- tenant.users (kèm user basic info)
- tenant.chatbots (basic fields)
- tenant._count (conversations/chatbots/users)

## Health
- `GET /health`

## Missing/To confirm
FE cần confirm thêm các endpoints sau (chưa thấy rõ trong phần routes đã đọc):
- Conversations list/detail
- Messages list by conversation
- Tenants list/switch
