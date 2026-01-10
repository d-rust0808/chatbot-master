# Deployment Troubleshooting Guide

## Lỗi 500: "Failed to get suspicious IPs"

### Nguyên nhân có thể:

1. **Prisma Client chưa được generate với AccessLog model**
   - Sau khi thêm model mới, cần generate lại Prisma client

2. **Database chưa có table `access_logs`**
   - Migration chưa được chạy trên server

3. **Prisma Client cache issue**
   - TypeScript language server cache

### Giải pháp:

#### Trên Server:

```bash
# 1. Generate Prisma Client với models mới
npx prisma generate

# 2. Chạy migrations (nếu chưa chạy)
npx prisma migrate deploy

# 3. Restart application
pm2 restart chatbot-backend
# hoặc
systemctl restart chatbot-backend
```

#### Kiểm tra:

```bash
# Check xem table có tồn tại không
psql -h <host> -U <user> -d <database> -c "\dt access_logs"

# Check Prisma client
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); console.log('accessLog' in p);"
```

### Logs để debug:

Check server logs để xem error message chi tiết:
- Nếu thấy "AccessLog model not available" → Cần chạy `npx prisma generate`
- Nếu thấy "relation does not exist" → Cần chạy `npx prisma migrate deploy`

---

## Lỗi khác

### OPTIONS request 404
- Đã fix trong commit `63211d4`
- Đảm bảo code mới nhất được deploy

### Missing imports
- Đã fix trong commit `05301a8`
- Đảm bảo code mới nhất được deploy

---

## Checklist trước khi deploy:

- [ ] Chạy `npx prisma generate` để generate Prisma client
- [ ] Chạy `npx prisma migrate deploy` để apply migrations
- [ ] Build TypeScript: `npm run build`
- [ ] Test build: `npm start` (local)
- [ ] Restart application trên server

