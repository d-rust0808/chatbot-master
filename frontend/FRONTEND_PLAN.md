# Frontend Plan (SaaS Multi-tenant)

## Mục tiêu
Xây dựng giao diện quản trị cho hệ thống Chatbot SaaS multi-tenant dựa trên backend Fastify (repo này).

- Tenant là **bắt buộc** cho hầu hết nghiệp vụ (chatbots/platforms/conversations/ai).
- Tenant context hiện lấy qua header `x-tenant-slug` (khuyến nghị dùng thống nhất trên FE).

## Tech stack đề xuất
- Next.js 14 (App Router) + TypeScript
- TailwindCSS + shadcn/ui
- TanStack Query (React Query) cho cache, pagination, retry, invalidation
- Zod + React Hook Form cho form validation

## Assumptions (giả định)
- FE gọi backend qua REST (không dùng WebSocket cho MVP).
- Tenant context được truyền qua header `x-tenant-slug`.
- Auth dùng JWT access token (tạm lưu client-side cho MVP) + refresh token.
- Role/RBAC có trong schema nhưng backend có thể chưa enforce đầy đủ → FE vẫn nên chuẩn bị UI states (disable/hide actions) theo role khi API trả về.

## Non-goals (không làm trong MVP)
- Billing/plan management.
- Full audit log UI.
- RAG/KnowledgeBase UI.
- Realtime inbox (WebSocket) (để phase sau).

## Điều kiện backend để FE làm “đúng SaaS”
Backend hiện đã có middleware tenant (extract theo `x-tenant-slug` hoặc subdomain) và auth JWT.

Tuy nhiên để FE SaaS “đúng chuẩn”, cần (ưu tiên):
- Endpoint **list tenants của user** (để user chọn tenant thay vì nhập tay)
- Endpoint **get current user** (optional)
- (Sau) RBAC/role enforcement theo `TenantUser.role`

Trong lúc chưa có, FE có thể:
- Cho user nhập `tenantSlug` thủ công trong UI để test

## IA / Navigation (MVP)

### Public
- `/login`
- `/register`

### App (Auth required)
- `/app` (redirect)
- `/app/select-tenant` (tạm thởi: nhập tenantSlug)
- `/app/admin` (admin area - system-wide)
  - `/app/admin` (stats)
  - `/app/admin/users`
  - `/app/admin/tenants`
  - `/app/admin/tenants/[tenantId]`
- `/app/[tenantSlug]/dashboard`
- `/app/[tenantSlug]/chatbots`
  - `/app/[tenantSlug]/chatbots/new`
  - `/app/[tenantSlug]/chatbots/[chatbotId]`
- `/app/[tenantSlug]/platforms`
- `/app/[tenantSlug]/conversations`
  - `/app/[tenantSlug]/conversations/[conversationId]`
- `/app/[tenantSlug]/settings`

## Màn hình chi tiết (MVP)

### 1) Auth
- Login
- Register
- Logout
- Refresh token handling (silent)

### 2) Tenant selection
- Tenant switcher ở topbar
- MVP: manual input `tenantSlug`

### 3) Chatbots
- List chatbots (pagination)
- Create chatbot
- Update chatbot (prompt/model/temperature/maxTokens/isActive)
- Get available models:
  - `GET /api/v1/chatbots/models`
  - Test models (optional tool): `GET /api/v1/chatbots/models/test`

### 4) Platforms
- List connections
- Connect platform (platform + credentials/options)
- Disconnect platform
- Send message (sync/queue)

### 5) Conversations
- List conversations (filter theo chatbot/platform)
- Conversation detail
- Message timeline (incoming/outgoing)

> Lưu ý: hiện chưa thấy route conversations/messages trong phần đã đọc, nên FE cần confirm endpoint thực tế hoặc backend bổ sung.

### 6) Admin (system-wide)
- System stats dashboard
- User list + search + pagination
- Tenant list + search + pagination
- Tenant detail (members + chatbots + counts)

> Lưu ý: backend hiện TODO role check, tức là *mọi user đã login có thể gọi admin API*. FE nên:
> - Ẩn menu Admin theo config/env hoặc theo role khi backend bổ sung
> - Nhưng vẫn build UI để sẵn sàng bật lên khi role check hoàn thiện

## Data flow

### Auth token
- Lưu `accessToken` client-side (sessionStorage/localStorage) theo MVP.
- Gọi API với header:
  - `Authorization: Bearer <accessToken>`
  - `x-tenant-slug: <tenantSlug>` (cho tenant-scoped endpoints)

### Refresh token
Backend có `POST /api/v1/auth/refresh`.
- Khi nhận 401: thử refresh, sau đó retry request.

### Error/loading
- Toaster cho lỗi
- Skeleton cho list
- Empty states

## Component breakdown (shadcn)
- `AppShell`: sidebar + topbar
- `TenantSwitcher`
- `ChatbotForm`
- `ConnectPlatformForm` (JSON editor cơ bản)
- `StatusBadge`
- `DataTable` + pagination
- `ConfirmDialog` cho actions nguy hiểm

## Roadmap triển khai

### Sprint 1 (1–2 ngày)
- Setup Next.js + shadcn + layout
- Auth pages + token storage
- Tenant selection basic

### Sprint 2 (2–4 ngày)
- Chatbots CRUD
- Models list + validate model availability

### Sprint 3 (2–4 ngày)
- Platforms: connect/disconnect/list/send message

### Sprint 4 (2–5 ngày)
- Conversations/messages UI

### Sprint 5 (optional) — Admin area
- Admin stats dashboard
- Admin users list + search
- Admin tenants list + tenant detail

## Done criteria (MVP)
- User login được
- Chọn tenantSlug
- Tạo chatbot + cấu hình prompt/model
- Connect 1 platform + gửi message test
- Xem conversation/messages (nếu backend đã có)
- UI hoạt động end-to-end với `/api/v1/admin/*` (nếu làm admin area)

---

# Chi tiết triển khai (Spec)

## 1) User journeys (luồng người dùng)

### Journey A: Onboarding tenant (MVP)
- **Login/Register**
- **Chọn tenant** (MVP: nhập `tenantSlug`)
- Vào **Dashboard**
- Tạo **Chatbot** đầu tiên
- Connect **Platform** cho chatbot
- (Optional) Gửi test message từ Platforms page

### Journey B: Vận hành hằng ngày
- Vào tenant
- Xem **Connections** đang connected/errored
- Xem **Conversations** + mở detail để đọc message history
- Chỉnh prompt/model nếu cần

## 2) App routing & layout rules
- Tất cả route dưới `/app/**` yêu cầu auth.
- Tất cả route tenant-scoped phải có `tenantSlug` trong URL.
- Quy ước URL:
  - `/app/[tenantSlug]/...` là “workspace context” của tenant.
  - `/app/select-tenant` là nơi set tenant.

## 3) Auth & tenant handling (chi tiết)

### Token storage
MVP:
- `accessToken`: `sessionStorage` (khuyến nghị) hoặc `localStorage`.
- `refreshToken`: `sessionStorage/localStorage` (tạm), hoặc cookie (phase sau).

### API client rule
Mọi request đi qua 1 lớp `apiClient`:
- Tự động gắn `Authorization` nếu có `accessToken`.
- Nếu URL chứa `[tenantSlug]` → gắn `x-tenant-slug`.
- Nếu 401:
  - gọi refresh
  - update token
  - retry 1 lần
  - nếu vẫn 401 → logout + redirect `/login`

### Tenant persistence
- Lưu `tenantSlug` đang chọn vào storage (vd: `lastTenantSlug`).
- Khi mở app:
  - nếu có `lastTenantSlug` → redirect `/app/<slug>/dashboard`
  - nếu không → `/app/select-tenant`

## 4) Screen specs (mô tả từng màn)

### 4.1 `/login`
**Mục tiêu**: user lấy `accessToken` + `refreshToken`.

- **Form fields**:
  - email
  - password
- **API**: `POST /api/v1/auth/login`
- **States**:
  - loading
  - error: invalid credentials (401)
- **Success**:
  - store tokens
  - redirect `/app` (app sẽ tự chọn tenant)

### 4.2 `/register`
- **API**: `POST /api/v1/auth/register`
- Success: store tokens và redirect `/app`

### 4.3 `/app/select-tenant` (MVP)
**Mục tiêu**: chọn tenant context để vào workspace.

- **UI**:
  - Input `tenantSlug`
  - Button “Continue”
- **Validation**:
  - non-empty
  - (optional) slug format `[a-z0-9-]`
- **Success**:
  - store `lastTenantSlug`
  - redirect `/app/<tenantSlug>/dashboard`

> Phase sau: thay input bằng tenant dropdown từ API list tenants.

### 4.4 `/app/[tenantSlug]/dashboard`
**Mục tiêu**: quick overview.

MVP widgets:
- Chatbots count
- Platform connections count + status summary
- (Optional) AI proxy balance indicator

API sources (nếu có):
- `GET /api/v1/chatbots` (lấy `_count`/length)
- `GET /api/v1/platforms/connections`

### 4.5 `/app/[tenantSlug]/chatbots` (list)
**Mục tiêu**: quản trị chatbots.

- **Table columns**:
  - name
  - model
  - isActive
  - createdAt
  - conversations count (nếu backend trả `_count`)
- **Actions**:
  - Create
  - View detail
- **API**:
  - `GET /api/v1/chatbots?page=&limit=`
- **Empty state**:
  - CTA “Create your first chatbot”

### 4.6 `/app/[tenantSlug]/chatbots/new` (create)
**Fields**:
- name (required)
- description (optional)
- systemPrompt (optional)
- aiModel (required)
- temperature (0..2)
- maxTokens (1..4000)

**API**:
- preload models: `GET /api/v1/chatbots/models`
- create: `POST /api/v1/chatbots`

**UX**:
- Model dropdown: ưu tiên recommended models.
- Nếu model không available → disable submit + hiển thị warning.

### 4.7 `/app/[tenantSlug]/chatbots/[chatbotId]` (detail/edit)
- **API**:
  - `GET /api/v1/chatbots/:chatbotId`
  - `PATCH /api/v1/chatbots/:chatbotId`
- **Sections**:
  - Chatbot settings (form)
  - Platforms connected (read-only list + link sang Platforms)
  - Conversations count
- **Actions**:
  - Save
  - Toggle active

### 4.8 `/app/[tenantSlug]/platforms`
**Mục tiêu**: quản lý kết nối các kênh.

- **Connections list** (table):
  - platform
  - chatbot name
  - status (connected/disconnected/error)
  - lastSyncAt
- **Actions**:
  - Connect (open dialog)
  - Disconnect
  - Send test message

- **API**:
  - `GET /api/v1/platforms/connections`
  - `POST /api/v1/platforms/connect`
  - `DELETE /api/v1/platforms/:connectionId/disconnect`
  - `POST /api/v1/platforms/send-message`

**Connect dialog**:
- Select chatbotId
- Select platform
- Credentials JSON (textarea hoặc JSON editor)
- Options JSON

### 4.9 `/app/[tenantSlug]/conversations`
**Mục tiêu**: inbox/history.

- Filter:
  - chatbot
  - platform
  - status (active/closed)
- List item:
  - chatId
  - platform
  - updatedAt
  - last message preview (nếu backend trả)

> Hiện backend routes conversations/messages chưa được confirm. Nếu backend chưa có, FE chỉ dựng UI skeleton + mock data, chờ API.

### 4.10 `/app/[tenantSlug]/conversations/[conversationId]`
- Message timeline:
  - incoming/outgoing bubble
  - timestamp
- (Optional) “Generate reply” button nếu muốn test AI endpoint.

### 4.11 `/app/admin` (system stats)
**Mục tiêu**: quan sát tổng quan hệ thống (SaaS owner/admin).

- **API**: `GET /api/v1/admin/stats`
- **Widgets**:
  - total users
  - total tenants
  - total chatbots
  - total conversations
  - total messages
  - active platform connections
- **Notes**:
  - Route này **không cần** `x-tenant-slug`
  - Nếu backend trả 403 sau này → FE show "You don't have permission"

### 4.12 `/app/admin/users` (users management)
**Mục tiêu**: list/search users.

- **API**: `GET /api/v1/admin/users?page=&limit=&search=`
- **Table columns**:
  - email
  - name
  - createdAt
  - tenants count (`_count.tenants`)
- **UX**:
  - search box (debounce)
  - pagination

### 4.13 `/app/admin/tenants` (tenants management)
**Mục tiêu**: list/search tenants.

- **API**: `GET /api/v1/admin/tenants?page=&limit=&search=`
- **Table columns**:
  - name
  - slug
  - createdAt
  - users/chatbots/conversations counts (`_count.*`)
- **Action**:
  - click row → tenant detail

### 4.14 `/app/admin/tenants/[tenantId]` (tenant detail)
**Mục tiêu**: xem chi tiết 1 tenant.

- **API**: `GET /api/v1/admin/tenants/:tenantId`
- **Sections**:
  - Tenant info (name/slug/createdAt)
  - Members list (email/name/role)
  - Chatbots list (name/isActive/createdAt)
  - Counts summary (`_count`)

## 5) Components & contracts (định nghĩa input/output)

### `TenantSwitcher`
- Props:
  - `tenantSlug: string`
  - `onChangeTenant(slug: string): void`
- Behavior:
  - Update storage + navigate.

### `ChatbotForm`
- Props:
  - `mode: 'create' | 'edit'`
  - `defaultValues`
  - `models` (recommended + all)
  - `onSubmit(values)`
- Validation:
  - same constraints với backend Zod.

### `ConnectPlatformForm`
- Props:
  - `chatbots[]`
  - `onSubmit({chatbotId, platform, credentials, options})`
- UX:
  - validate JSON; show inline error.

## 6) Frontend project structure (đề xuất)
Nếu tạo repo frontend riêng:
- `app/` routes theo Next.js
- `components/` shared UI
- `features/` theo domain (auth, chatbots, platforms, conversations)
- `lib/api/` api client + typed endpoints
- `lib/auth/` token storage + refresh logic
- `lib/tenant/` tenant helpers
- `types/` shared types (hoặc generate từ OpenAPI nếu có)

## 7) Sprint backlog (chi tiết hơn)

### Sprint 1 — Foundation/Auth/Tenant
- Setup Next.js + shadcn + AppShell layout
- Auth pages + token storage
- API client + refresh-on-401
- Tenant select (manual)

**Acceptance**:
- Login OK, refresh OK, logout OK.
- Có thể vào `/app/<tenantSlug>/dashboard` và gọi được API tenant-scoped với header.

### Sprint 2 — Chatbots
- Chatbots list page + pagination
- Create chatbot page
- Edit chatbot page
- Models dropdown (recommended)

**Acceptance**:
- CRUD chatbot hoạt động end-to-end với backend.

### Sprint 3 — Platforms
- Connections list
- Connect dialog
- Disconnect
- Send test message

**Acceptance**:
- Connect/disconnect chạy ổn; lỗi hiển thị rõ.

### Sprint 4 — Conversations
- Conversations list + filters
- Conversation detail + timeline

**Acceptance**:
- Xem được history (khi backend có endpoint).

### Sprint 5 (optional) — Admin area
- Admin stats dashboard
- Admin users list + search
- Admin tenants list + tenant detail

**Acceptance**:
- UI hoạt động end-to-end với `/api/v1/admin/*`.
- Nếu backend sau này enforce role → FE hiển thị đúng trạng thái 403/permission denied.
