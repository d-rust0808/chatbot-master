# 🔧 Quick Fix: 500 Error - AccessLog Model Not Available

## ❌ Lỗi hiện tại

```
{
  "error": {
    "message": "Failed to get suspicious IPs",
    "details": "AccessLog model not available. Please run: npx prisma generate && npx prisma migrate deploy"
  }
}
```

## ✅ Giải pháp nhanh (3 bước)

### Trên server, chạy các lệnh sau:

```bash
# 1. Vào thư mục project
cd /path/to/chatbot-master-backend

# 2. Pull code mới (nếu chưa pull)
git pull origin main

# 3. Chạy script tự động (KHUYẾN NGHỊ)
npm run deploy:prepare

# HOẶC chạy manual:
npx prisma generate
npx prisma migrate deploy
pm2 restart chatbot-backend  # hoặc systemctl restart / docker-compose restart
```

## 🔍 Kiểm tra sau khi fix

```bash
# Check Prisma setup
npm run prisma:check

# Test API endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://cchatbot.pro/api/v1/sp-admin/access-logs/suspicious?minRiskScore=30
```

## 📋 Nguyên nhân

1. **Prisma client chưa được generate**: Sau khi thêm model `AccessLog` vào schema, cần chạy `npx prisma generate`
2. **Database chưa có table**: Cần chạy `npx prisma migrate deploy` để tạo table `access_logs`

## 🚀 Deployment Script

Script `scripts/deploy.sh` sẽ tự động:
- ✅ Install dependencies
- ✅ Generate Prisma client
- ✅ Run migrations
- ✅ Verify setup

## 🐳 Docker Deployment

Nếu dùng Docker:

```bash
# Rebuild image
docker build -t chatbot-backend:latest .

# Restart container
docker-compose restart
# hoặc
docker-compose up -d --force-recreate
```

## ⚠️ Lưu ý

- **LUÔN** chạy `npx prisma generate` sau khi pull code có thay đổi Prisma schema
- **LUÔN** chạy `npx prisma migrate deploy` trên production
- **KHÔNG** dùng `prisma migrate dev` trên production (chỉ dùng `migrate deploy`)

## 📞 Cần hỗ trợ?

Nếu vẫn lỗi sau khi chạy các bước trên:
1. Check logs: `pm2 logs chatbot-backend`
2. Check database connection
3. Verify Prisma client: `npm run prisma:check`

