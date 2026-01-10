# Deployment Fix Guide

## Vấn đề: Lỗi 500 - AccessLog model not available

### Nguyên nhân
Khi deploy code mới có thêm model `AccessLog` vào Prisma schema, Prisma client trên server chưa được generate lại, dẫn đến lỗi:
```
AccessLog model not available. Please run: npx prisma generate
```

### Giải pháp

#### Cách 1: Sử dụng deployment script (Khuyến nghị)

```bash
# Trên server
cd /path/to/chatbot-master-backend
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Script này sẽ tự động:
1. Install dependencies
2. Generate Prisma client
3. Run migrations
4. Verify Prisma client

#### Cách 2: Manual deployment

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies (nếu có package mới)
npm ci

# 3. Generate Prisma client (QUAN TRỌNG!)
npx prisma generate

# 4. Apply migrations
npx prisma migrate deploy

# 5. Restart application
pm2 restart chatbot-backend
# hoặc
systemctl restart chatbot-backend
# hoặc (nếu dùng Docker)
docker-compose restart
```

#### Cách 3: Docker deployment

```bash
# 1. Rebuild image với Prisma client mới
docker build -t chatbot-backend:latest .

# 2. Restart container
docker-compose restart
# hoặc
docker-compose up -d --force-recreate
```

### Kiểm tra sau khi deploy

1. **Check Prisma client:**
```bash
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); console.log('✅ Prisma client OK');"
```

2. **Check API endpoint:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://cchatbot.pro/api/v1/sp-admin/access-logs/suspicious?minRiskScore=30
```

3. **Check application logs:**
```bash
pm2 logs chatbot-backend
# hoặc
journalctl -u chatbot-backend -f
# hoặc
docker-compose logs -f
```

### Lưu ý quan trọng

⚠️ **LUÔN chạy `npx prisma generate` sau khi:**
- Pull code mới có thay đổi Prisma schema
- Deploy lên server mới
- Update Prisma version

⚠️ **LUÔN chạy `npx prisma migrate deploy` sau khi:**
- Có migration mới
- Deploy lên production

### Troubleshooting

#### Lỗi: "Cannot find module '@prisma/client'"
```bash
npm install @prisma/client
npx prisma generate
```

#### Lỗi: "Migration not found"
```bash
# Check migrations folder
ls prisma/migrations/

# Apply migrations manually
npx prisma migrate deploy
```

#### Lỗi: "Table does not exist"
```bash
# Check if migration was applied
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy
```

### Best Practices

1. **Luôn test trên staging trước khi deploy production**
2. **Backup database trước khi chạy migrations**
3. **Monitor logs sau khi deploy**
4. **Có rollback plan sẵn sàng**

### CI/CD Integration

Nếu dùng CI/CD, đảm bảo deployment pipeline bao gồm:

```yaml
# Example GitHub Actions
- name: Install dependencies
  run: npm ci

- name: Generate Prisma Client
  run: npx prisma generate

- name: Run migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Deploy
  run: |
    pm2 restart chatbot-backend
    # hoặc docker-compose restart
```

