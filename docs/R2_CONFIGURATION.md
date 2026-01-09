# Cloudflare R2 Storage Configuration

## 📋 Tổng quan

Backend hỗ trợ upload ảnh lên Cloudflare R2 (S3-compatible storage). Nếu R2 không được config, hệ thống sẽ fallback về local storage.

## 🔧 Cấu hình

Thêm các biến môi trường sau vào `.env`:

```bash
# Cloudflare R2 Storage Configuration
R2_ACCOUNT_ID=ac3bd8037c5c8067a4e6bea1a59c682f
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://pub-60565d4b4a4b454f8510a46788120b62.r2.dev
R2_ENDPOINT=https://ac3bd8037c5c8067a4e6bea1a59c682f.r2.cloudflarestorage.com
```

## 📝 Giải thích các biến

- **R2_ACCOUNT_ID**: Account ID của Cloudflare (đã có: `ac3bd8037c5c8067a4e6bea1a59c682f`)
- **R2_ACCESS_KEY_ID**: Access Key ID từ R2 API Token
- **R2_SECRET_ACCESS_KEY**: Secret Access Key từ R2 API Token
- **R2_BUCKET_NAME**: Tên bucket trong R2
- **R2_PUBLIC_URL**: Public URL của bucket (đã có: `https://pub-60565d4b4a4b454f8510a46788120b62.r2.dev`)
- **R2_ENDPOINT**: S3 API endpoint (đã có: `https://ac3bd8037c5c8067a4e6bea1a59c682f.r2.cloudflarestorage.com`)

## 🔑 Tạo R2 API Token

1. Vào Cloudflare Dashboard > R2
2. Chọn bucket của bạn
3. Vào Settings > Manage R2 API Tokens
4. Tạo API Token mới với quyền:
   - **Object Read & Write** (để upload/delete)
5. Copy **Access Key ID** và **Secret Access Key**

## ✅ Kiểm tra cấu hình

Sau khi config, restart backend và kiểm tra logs:

```
[info]: R2 S3 client initialized
```

Nếu thấy log này → R2 đã được config đúng.

## 🔄 Fallback

Nếu R2 không được config hoặc upload fail, hệ thống sẽ tự động fallback về local storage tại:
- `public/uploads/service-packages/`

## 📤 Upload Flow

1. Request upload ảnh → Controller nhận multipart file
2. Parse file → Đọc buffer
3. Upload to R2 → Gọi `uploadToR2()`
4. Return public URL → Trả về URL từ R2

## 🗑️ Delete Flow

Để xóa file từ R2, gọi:
```typescript
import { deleteFromR2 } from '../infrastructure/r2-storage';
await deleteFromR2('service-packages/filename.jpg');
```

## 🔍 Debug

Nếu upload fail, kiểm tra logs:
- `[error]: Failed to upload file to R2` → Xem error message
- `[info]: Failed to upload to R2, falling back to local storage` → R2 fail, dùng local

## 📚 Tham khảo

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-examples.html)

