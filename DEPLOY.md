# Deployment Guide - Production Docker Setup

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB+ RAM available
- 10GB+ disk space

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd chatbot-master-backend
```

### 2. Configure Environment Variables

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit .env.production với các giá trị thực tế
nano .env.production
```

**IMPORTANT:** Cập nhật các giá trị sau:
- `DB_PASSWORD`: Mật khẩu database mạnh
- `REDIS_PASSWORD`: Mật khẩu Redis mạnh
- `JWT_SECRET`: Generate bằng `openssl rand -base64 32`
- `JWT_REFRESH_SECRET`: Generate bằng `openssl rand -base64 32`
- `ADMIN_PASSWORD`: Mật khẩu admin mạnh
- `SEPAY_ACCOUNT`, `SEPAY_BANK`: Thông tin Sepay của bạn

### 3. Build và Start Services

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 4. Run Database Migrations

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Generate Prisma Client (if needed)
docker-compose -f docker-compose.prod.yml exec backend npx prisma generate
```

### 5. Verify Deployment

```bash
# Check health
curl http://localhost:3000/health

# Check services status
docker-compose -f docker-compose.prod.yml ps
```

## Production Checklist

### Security

- [ ] Đã thay đổi tất cả default passwords
- [ ] JWT secrets đã được generate ngẫu nhiên
- [ ] Database không expose port ra ngoài
- [ ] Redis không expose port ra ngoài
- [ ] SSL/TLS đã được cấu hình (reverse proxy)
- [ ] Firewall rules đã được thiết lập
- [ ] `.env.production` không được commit vào git

### Database

- [ ] Database backups đã được cấu hình
- [ ] Connection pooling đã được tối ưu
- [ ] Migrations đã được chạy

### Monitoring

- [ ] Logs đã được cấu hình
- [ ] Health checks đang hoạt động
- [ ] Monitoring tools đã được setup (optional)

### Performance

- [ ] Resource limits đã được set
- [ ] Redis caching đã được enable
- [ ] CDN đã được cấu hình (nếu cần)

## Docker Commands

### Start Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Stop Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Restart Service

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

### Execute Commands in Container

```bash
# Run Prisma migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Access database
docker-compose -f docker-compose.prod.yml exec postgres psql -U chatbot_user -d chatbot_db

# Access Redis CLI
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a YOUR_REDIS_PASSWORD
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild và restart
docker-compose -f docker-compose.prod.yml up -d --build backend

# Run migrations (if needed)
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## Reverse Proxy Setup (Nginx)

### Nginx Configuration Example

```nginx
upstream backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/chatbot-api-access.log;
    error_log /var/log/nginx/chatbot-api-error.log;

    # Proxy settings
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
}
```

## Backup & Restore

### Database Backup

```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U chatbot_user chatbot_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U chatbot_user chatbot_db < backup.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v chatbot-postgres-prod_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
docker run --rm -v chatbot-postgres-prod_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_backup.tar.gz /data
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats
```

### Database Connection Issues

```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec backend node -e "require('./dist/infrastructure/database').prisma.\$connect().then(() => console.log('Connected')).catch(e => console.error(e))"

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

### Port Already in Use

```bash
# Change port in docker-compose.prod.yml
ports:
  - "8080:3000"  # Use port 8080 instead of 3000
```

### Out of Memory

```bash
# Add memory limits in docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

## Monitoring

### Health Checks

```bash
# Check all services health
docker-compose -f docker-compose.prod.yml ps

# Manual health check
curl http://localhost:3000/health
```

### Logs

```bash
# Follow logs
docker-compose -f docker-compose.prod.yml logs -f

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

## Scaling

### Horizontal Scaling

Để scale backend service:

```bash
# Scale to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

**Lưu ý:** Cần cấu hình load balancer (Nginx/HAProxy) để distribute traffic.

## Maintenance

### Update Dependencies

```bash
# Update npm packages
docker-compose -f docker-compose.prod.yml exec backend npm update

# Rebuild image
docker-compose -f docker-compose.prod.yml build backend
docker-compose -f docker-compose.prod.yml up -d backend
```

### Database Migrations

```bash
# Create new migration
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate dev --name migration_name

# Apply migrations in production
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## Support

Nếu gặp vấn đề:
1. Kiểm tra logs: `docker-compose -f docker-compose.prod.yml logs`
2. Kiểm tra health: `curl http://localhost:3000/health`
3. Kiểm tra resource usage: `docker stats`
4. Xem troubleshooting section ở trên

