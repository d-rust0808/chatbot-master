# Message Flow Documentation

**Date**: 2025-01-06

## Message Flow: User → Database → Bot → Response

### Current Flow (Đã Implement)

```
1. User nhắn tin trên platform (WhatsApp, Facebook, etc.)
   ↓
2. Platform Adapter nhận message
   - WhatsApp: whatsapp-web.js event listener
   - Facebook: Puppeteer polling
   - Other platforms: Similar mechanism
   ↓
3. Platform Manager xử lý message
   - Get or create conversation
   - Save incoming message to database
   ↓
4. Database (PostgreSQL)
   - Message saved với:
     * conversationId
     * direction: 'incoming'
     * content, contentType, metadata
     * timestamp
   ↓
5. AI Service generate response
   - Load conversation history từ database
   - Build context với conversation memory
   - Call AI provider (OpenAI/DeepSeek/Gemini)
   - Generate response
   ↓
6. Save response to database
   - Message saved với:
     * conversationId
     * direction: 'outgoing'
     * content: AI response
   ↓
7. Send response via Platform Adapter
   - adapter.sendMessage(chatId, response)
   ↓
8. WebSocket emit events (real-time updates)
   - Emit message:new event
   - Dashboard có thể update real-time
```

### Code Locations

#### 1. Message Reception
**File**: `src/services/platform-manager.service.ts`
```typescript
// Line ~120-180
adapter.on('message', async (message) => {
  // 1. Get or create conversation
  const conversation = await this.getOrCreateConversation(...);
  
  // 2. Save incoming message to database
  const savedMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'incoming',
      content: message.content,
      // ...
    },
  });
  
  // 3. Generate AI response
  const aiResponse = await aiService.generateResponse(...);
  
  // 4. Save and send response
  // ...
});
```

#### 2. Database Storage
**Schema**: `prisma/schema.prisma`
```prisma
model Message {
  id             String   @id @default(cuid())
  conversationId String
  platform       String
  messageId      String   // Platform-specific message ID
  direction      String   // 'incoming' or 'outgoing'
  content        String
  contentType    String   @default("text")
  metadata       Json?
  createdAt      DateTime @default(now())
  
  conversation Conversation @relation(...)
}
```

#### 3. AI Response Generation
**File**: `src/services/ai/ai.service.ts`
- Loads conversation history từ database
- Builds context với conversation memory
- Generates response via AI provider
- Saves response to database

#### 4. Message Viewing APIs
**File**: `src/controllers/conversation.controller.ts`

**Endpoints**:
- `GET /api/v1/conversations` - List conversations
- `GET /api/v1/conversations/:id` - Get conversation với messages
- `GET /api/v1/conversations/:id/export` - Export conversation

**Response Format**:
```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conv_123",
      "chatbotId": "bot_123",
      "platform": "whatsapp",
      "status": "active"
    },
    "messages": [
      {
        "id": "msg_123",
        "direction": "incoming",
        "content": "Hello",
        "createdAt": "2025-01-06T00:00:00Z"
      },
      {
        "id": "msg_124",
        "direction": "outgoing",
        "content": "Hi! How can I help you?",
        "createdAt": "2025-01-06T00:00:01Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 50,
      "totalMessages": 2,
      "totalPages": 1
    }
  }
}
```

## Admin APIs

### Admin Endpoints

**File**: `src/controllers/admin.controller.ts`
**Routes**: `src/routes/admin.routes.ts`

**Endpoints**:
- `GET /api/v1/admin/stats` - System statistics
- `GET /api/v1/admin/users` - List all users
- `GET /api/v1/admin/tenants` - List all tenants
- `GET /api/v1/admin/tenants/:tenantId` - Get tenant details

**Response Example**:
```json
{
  "success": true,
  "data": {
    "users": { "total": 100 },
    "tenants": { "total": 50 },
    "chatbots": { "total": 200 },
    "conversations": { "total": 1000 },
    "messages": { "total": 5000 },
    "platformConnections": { "active": 150 }
  }
}
```

## Dashboard APIs (Cho Khách Hàng)

### Conversation Management
- ✅ `GET /api/v1/conversations` - List conversations với filter
- ✅ `GET /api/v1/conversations/:id` - Get conversation details với messages
- ✅ `GET /api/v1/conversations/:id/export` - Export conversation (JSON/CSV/TXT)

### Analytics
- ✅ `GET /api/v1/analytics/messages` - Message statistics
- ✅ `GET /api/v1/analytics/conversations` - Conversation statistics
- ✅ `GET /api/v1/analytics/response-time` - Response time metrics

### Chatbot Management
- ✅ `GET /api/v1/chatbots` - List chatbots
- ✅ `GET /api/v1/chatbots/:id` - Get chatbot details
- ✅ `POST /api/v1/chatbots` - Create chatbot
- ✅ `PUT /api/v1/chatbots/:id` - Update chatbot

### Platform Management
- ✅ `GET /api/v1/platforms/connections` - List platform connections
- ✅ `POST /api/v1/platforms/connect` - Connect platform
- ✅ `DELETE /api/v1/platforms/:connectionId/disconnect` - Disconnect

## Real-time Updates (WebSocket)

**File**: `src/infrastructure/websocket.ts`

**Events**:
- `message:new` - New message received/sent
- `conversation:update` - Conversation updated
- `platform:status` - Platform connection status changed

**Client Subscription**:
```javascript
socket.emit('subscribe:conversation', conversationId);
socket.on('message:new', (data) => {
  // data: { conversationId, message }
});
```

## Database Schema

### Messages Table
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  message_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'incoming' or 'outgoing'
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Conversations Table
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  chatbot_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  summary TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Flow Verification

### ✅ Đã Implement
1. ✅ User nhắn tin → Platform adapter nhận
2. ✅ Lưu vào database (incoming message)
3. ✅ Bot đọc từ database (conversation history)
4. ✅ Generate response
5. ✅ Lưu response vào database (outgoing message)
6. ✅ Gửi response về platform
7. ✅ WebSocket events cho real-time updates
8. ✅ APIs để xem lại conversations và messages

### Flow Diagram

```
┌─────────────┐
│   Platform  │ (WhatsApp, Facebook, etc.)
│    User     │
└──────┬──────┘
       │ 1. User sends message
       ↓
┌──────────────────┐
│ Platform Adapter │ (whatsapp-web.js, Puppeteer)
└──────┬───────────┘
       │ 2. Message event
       ↓
┌──────────────────┐
│ Platform Manager │
└──────┬───────────┘
       │ 3. Process message
       ↓
┌──────────────────┐
│   PostgreSQL     │ ← 4. Save incoming message
│   Database       │
└──────┬───────────┘
       │ 5. Load conversation history
       ↓
┌──────────────────┐
│   AI Service     │
│  (OpenAI/etc.)   │
└──────┬───────────┘
       │ 6. Generate response
       ↓
┌──────────────────┐
│   PostgreSQL     │ ← 7. Save outgoing message
│   Database       │
└──────┬───────────┘
       │ 8. Send response
       ↓
┌──────────────────┐
│ Platform Adapter │
└──────┬───────────┘
       │ 9. Deliver to user
       ↓
┌─────────────┐
│   Platform  │
│    User     │
└─────────────┘

Parallel:
┌──────────────────┐
│  WebSocket Server │ ← Real-time updates
└──────────────────┘
       │
       ↓
┌──────────────────┐
│   Dashboard      │ (Frontend)
└──────────────────┘
```

## API Examples

### 1. View Conversation Messages
```bash
GET /api/v1/conversations/conv_123?page=1&limit=50
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "conversation": { ... },
    "messages": [
      {
        "id": "msg_1",
        "direction": "incoming",
        "content": "Hello",
        "createdAt": "2025-01-06T00:00:00Z"
      },
      {
        "id": "msg_2",
        "direction": "outgoing",
        "content": "Hi! How can I help?",
        "createdAt": "2025-01-06T00:00:01Z"
      }
    ],
    "meta": { ... }
  }
}
```

### 2. Export Conversation
```bash
GET /api/v1/conversations/conv_123/export?format=json
Authorization: Bearer <token>
```

### 3. Admin - System Stats
```bash
GET /api/v1/admin/stats
Authorization: Bearer <admin_token>
```

## Summary

✅ **Flow đã hoàn chỉnh**:
- User nhắn tin → Lưu database → Bot đọc từ database → Trả về
- Tất cả messages được lưu trong database
- APIs để xem lại conversations và messages
- Admin APIs để quản trị hệ thống
- Real-time updates qua WebSocket

✅ **APIs đã có**:
- Conversation viewing APIs
- Message history APIs
- Export functionality
- Admin management APIs
- Analytics APIs

