# Docker Setup Guide

## Quick Start

### Development

```bash
# Start services (database, redis, qdrant)
docker-compose up -d

# Backend sẽ chạy local với npm run dev
# Services sẽ available tại:
# - Backend: http://localhost:3000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - Qdrant: localhost:6333
```

### Production

```bash
# 1. Generate secrets
./scripts/generate-secrets.sh

# 2. Setup environment
cp .env.production.example .env.production
# Edit .env.production với các giá trị thực tế

# 3. Run setup script
./scripts/docker-setup.sh

# Hoặc manual:
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## File Structure

```
.
├── Dockerfile                    # Multi-stage build cho production
├── docker-compose.yml            # Development setup
├── docker-compose.prod.yml       # Production setup
├── .dockerignore                 # Files to exclude from build
├── .env.production.example       # Production env template
├── scripts/
│   ├── generate-secrets.sh       # Generate secure secrets
│   └── docker-setup.sh           # Automated setup script
└── DEPLOY.md                     # Detailed deployment guide
```

## Environment Variables

### Required for Production

- `JWT_SECRET`: Generate với `openssl rand -base64 32`
- `JWT_REFRESH_SECRET`: Generate với `openssl rand -base64 32`
- `DB_PASSWORD`: Strong password cho database
- `REDIS_PASSWORD`: Strong password cho Redis
- `ADMIN_PASSWORD`: Password cho admin user

### Optional

- `OPENAI_API_KEY`: Nếu dùng OpenAI
- `PROXY_API_KEY`: Nếu dùng proxy API
- `SEPAY_ACCOUNT`, `SEPAY_BANK`: Thông tin Sepay

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart service
docker-compose -f docker-compose.prod.yml restart backend

# Stop all
docker-compose -f docker-compose.prod.yml down

# Update và rebuild
git pull
docker-compose -f docker-compose.prod.yml up -d --build backend

# Database migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Access database
docker-compose -f docker-compose.prod.yml exec postgres psql -U chatbot_user -d chatbot_db
```

## Troubleshooting

### Port already in use

```bash
# Change port in docker-compose.prod.yml
ports:
  - "8080:3000"
```

### Out of memory

```bash
# Add memory limits
docker-compose -f docker-compose.prod.yml up -d --memory=1g backend
```

### Database connection issues

```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec backend node -e "require('./dist/infrastructure/database')"
```

Xem thêm chi tiết trong [DEPLOY.md](./DEPLOY.md)

