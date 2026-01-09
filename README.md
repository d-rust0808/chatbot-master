# 🤖 Chatbot SaaS - Multi-Platform Backend

Hệ thống Chatbot SaaS đa nền tảng sử dụng AI Model + Database, triển khai chatbot cho các nền tảng mạng xã hội và thương mại điện tử.

## 📚 Tài Liệu Dự Án

### 0. [API Routes Migration Guide](./docs/API_ROUTES_MIGRATION.md) ⚠️ **QUAN TRỌNG**
**Hướng dẫn migration API routes cho Frontend:**
- Mapping tất cả routes cũ → mới
- Phân loại routes theo role (sp-admin, admin, public)
- Checklist migration cho frontend developers
- Chi tiết thay đổi và breaking changes

### 0.1. [Admin Balance Logs API](./docs/API_ADMIN_BALANCE_LOGS.md) 📊
**Tài liệu API Balance Logs:**
- `GET /sp-admin/users/:adminId/balance-logs` - Xem logs của 1 admin
- `GET /sp-admin/balance-logs` - Xem logs của tất cả admins
- Request/Response examples
- Frontend implementation guide
- Use cases và testing
**Hướng dẫn migration API routes cho Frontend:**
- Mapping tất cả routes cũ → mới
- Phân loại routes theo role (sp-admin, admin, public)
- Checklist migration cho frontend developers
- Chi tiết thay đổi và breaking changes

### 1. [plan/PROJECT_PLAN.md](./plan/PROJECT_PLAN.md)
**Kế hoạch dự án chi tiết** với đầy đủ:
- Tổng quan dự án (mục tiêu, đối tượng, USP, rủi ro)
- 7 Phases chi tiết, mỗi phase bao gồm:
  - AI & Market Research
  - GitHub & Open-Source Research
  - Kết luận & Đánh giá
  - Implementation Plan
  - Output & Deliverables
- Customer Onboarding via Prompt
- Timeline & Cost Estimation
- Risk Mitigation

### 2. [plan/CHATBOT_SAAS_MASTER_PLAN.md](./plan/CHATBOT_SAAS_MASTER_PLAN.md)
**Master Checklist** - File quản lý tiến độ:
- Tổng hợp TOÀN BỘ tasks của tất cả phases
- Checklist format (✅/❌) để track progress
- Có thể dùng để:
  - Quản lý tiến độ dự án
  - Onboard khách hàng mới
  - Giao việc cho team
  - Track completion

### 3. [plan/PHASE1_SUMMARY.md](./plan/PHASE1_SUMMARY.md)
**Phase 1 Summary** - Tóm tắt deliverables đã hoàn thành:
- Chi tiết tất cả deliverables của Phase 1
- Kiến trúc và design patterns
- Security features
- Code quality metrics
- Next steps cho Phase 2

## 🎯 Nền Tảng Hỗ Trợ

- ✅ Facebook Messenger
- ✅ WhatsApp
- ✅ Instagram
- ✅ TikTok
- ✅ Zalo
- ✅ Shopee
- ✅ Lazada

## 🏗️ Kiến Trúc

- **Browser Automation**: Puppeteer + Stealth Plugins
- **AI Stack**: OpenAI GPT-3.5-turbo + LangChain + RAG
- **Vector DB**: Qdrant (self-hosted)
- **Backend**: Node.js + Fastify
- **Database**: PostgreSQL (multi-tenant) + Redis
- **Frontend**: Next.js 14 + Shadcn UI

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (LTS)
- Docker & Docker Compose
- npm hoặc yarn

### Setup Instructions

#### 1. Clone và Install Dependencies
```bash
cd chatbot-master-backend
npm install
```

#### 2. Setup Environment Variables
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env và cập nhật các giá trị:
# - JWT_SECRET: Generate với: openssl rand -base64 32
# - JWT_REFRESH_SECRET: Generate với: openssl rand -base64 32
# - DATABASE_URL: Sẽ được set tự động khi chạy Docker
```

#### 3. Start Infrastructure (Docker)
```bash
# Start PostgreSQL, Redis, Qdrant
docker-compose up -d

# Kiểm tra containers đang chạy
docker-compose ps
```

#### 4. Setup Database
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio để xem database
npm run prisma:studio
```

#### 5. Start Development Server
```bash
# Development mode với hot reload
npm run dev

# Server sẽ chạy tại http://localhost:30001
```

#### 6. Test API
```bash
# Health check
curl http://localhost:30001/health

# Register user
curl -X POST http://localhost:30001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:30001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 📚 Tài Liệu Dự Án

1. **[plan/PROJECT_PLAN.md](./plan/PROJECT_PLAN.md)** - Kế hoạch dự án chi tiết với 7 phases
2. **[plan/CHATBOT_SAAS_MASTER_PLAN.md](./plan/CHATBOT_SAAS_MASTER_PLAN.md)** - Master checklist

### 🏗️ Cấu Trúc Code

```
src/
├── domain/           # Domain logic (entities, types)
├── services/         # Business logic
├── controllers/      # Request handlers
├── routes/          # API routes
├── middleware/      # Custom middleware (auth, tenant)
├── infrastructure/  # External services (DB, Redis, Logger)
├── utils/          # Helpers
└── types/          # TypeScript types
```

## 📋 Cấu Trúc Dự Án

```
chatbot-master-backend/
├── src/                         # Source code
│   ├── controllers/            # Request handlers
│   ├── services/               # Business logic
│   ├── routes/                 # API routes
│   ├── middleware/             # Auth, tenant middleware
│   ├── infrastructure/         # DB, Redis, Logger, Config
│   ├── types/                  # TypeScript types
│   └── utils/                  # Helpers
├── prisma/                      # Prisma schema & migrations
├── plan/                        # Project documentation
│   ├── PROJECT_PLAN.md         # Kế hoạch dự án chi tiết
│   ├── CHATBOT_SAAS_MASTER_PLAN.md  # Master checklist
│   └── PHASE1_SUMMARY.md        # Phase 1 deliverables summary
├── docker-compose.yml           # Docker services
├── .env.example                # Environment variables template
└── README.md                    # File này
```

## 🔑 Đặc Điểm Chính

1. **Không cần API chính thống**: Sử dụng browser automation
2. **Triển khai nhanh**: Onboarding qua prompt
3. **Đa nền tảng**: Một hệ thống quản lý nhiều kênh
4. **AI thông minh**: RAG + LLM, học từ dữ liệu khách hàng
5. **Multi-tenant**: Mỗi khách hàng có workspace riêng

## 📞 Liên Hệ

Để biết thêm chi tiết, xem [plan/PROJECT_PLAN.md](./plan/PROJECT_PLAN.md)

---

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server với hot reload
- `npm run build` - Build production
- `npm run start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run format` - Format code với Prettier

### API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (requires auth)

#### Health Check
- `GET /health` - Health check endpoint

### Phase 1 Status: ✅ COMPLETED

**Deliverables**:
- ✅ Database schema (Prisma)
- ✅ Authentication system (JWT + Refresh tokens)
- ✅ Multi-tenant middleware
- ✅ Basic API structure (Fastify)
- ✅ Docker setup (PostgreSQL, Redis, Qdrant)
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Logger service (Winston)
- ✅ Error handling
- ✅ Type-safe configuration

**Next Steps**: Phase 2 - Browser Automation & Platform Integration

---

**Status**: ✅ Phase 1 Complete - Foundation & Core Infrastructure
**Last Updated**: 2024