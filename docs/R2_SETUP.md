# Cloudflare R2 Setup Guide

## 📋 Cấu hình R2 Storage

Thêm các biến môi trường sau vào file `.env`:

```bash
# Cloudflare R2 Storage Configuration
R2_ENABLED=true
R2_ACCOUNT_ID=ac3bd8037c5c8067a4e6bea1a59c682f
R2_ACCESS_KEY=58e1ddd977580436a2b93e325f0d2fbd
R2_SECRET_KEY=e4091b75db598f5d3cf340c5d813ec89cf66e3aa8dde5f1e4d63acfce44b415d
R2_BUCKET_NAME=chatbot-master
R2_PUBLIC_URL=https://pub-6c39afe78de64e179680503262c3c443.r2.dev
```

## 🔑 Giải thích các biến

- **R2_ENABLED**: Bật/tắt R2 storage (`true` hoặc `false`)
- **R2_ACCOUNT_ID**: Cloudflare Account ID
- **R2_ACCESS_KEY**: R2 Access Key ID (S3 API credentials)
- **R2_SECRET_KEY**: R2 Secret Access Key (S3 API credentials)
- **R2_BUCKET_NAME**: Tên bucket trong R2
- **R2_PUBLIC_URL**: Public URL để truy cập file (có thể có custom domain)

## 🔄 Alias Support

Code hỗ trợ cả 2 format tên biến:

**Format 1 (Recommended):**
```bash
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
```

**Format 2 (Alternative):**
```bash
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

Cả 2 format đều hoạt động, code sẽ tự động detect.

## ✅ Kiểm tra cấu hình

Sau khi config và restart backend, kiểm tra logs:

```
[info]: R2 S3 client initialized
```

Nếu thấy log này → R2 đã được config đúng và sẵn sàng sử dụng.

## 📤 Upload Flow

1. User upload ảnh qua API
2. Backend parse multipart form data
3. Upload lên R2 bucket với key: `service-packages/{timestamp}-{random}.{ext}`
4. Trả về public URL: `https://pub-6c39afe78de64e179680503262c3c443.r2.dev/service-packages/...`

## 🔄 Fallback

Nếu `R2_ENABLED=false` hoặc R2 upload fail, hệ thống sẽ tự động fallback về local storage tại:
- `public/uploads/service-packages/`

## 🗑️ Xóa file

Để xóa file từ R2:

```typescript
import { deleteFromR2 } from '../infrastructure/r2-storage';
await deleteFromR2('service-packages/filename.jpg');
```

## 🔍 Debug

Nếu upload fail, kiểm tra logs:
- `[error]: Failed to upload file to R2` → Xem error message
- `[info]: Failed to upload to R2, falling back to local storage` → R2 fail, dùng local

## 📝 Lưu ý

1. **Public URL**: Đảm bảo R2 bucket đã được config public access
2. **CORS**: Nếu cần access từ browser, config CORS trong R2 bucket settings
3. **Custom Domain**: Có thể dùng custom domain thay vì `pub-*.r2.dev`

## 🚀 Next Steps

1. Thêm credentials vào `.env`
2. Restart backend
3. Test upload ảnh qua API
4. Kiểm tra URL trả về có đúng R2 URL không


