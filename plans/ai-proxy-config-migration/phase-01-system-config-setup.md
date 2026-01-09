# Phase 1: System Config Setup

## Context
- Date: 2025-01-09
- Priority: High
- Status: In Progress

## Overview
Thêm System Config keys cho:
- PROXY_API_KEY (thay vì hardcode trong .env)
- PROXY_API_BASE (thay vì hardcode trong .env)
- AI Models (array với đầy đủ thông tin pricing)

## Key Insights
- Hiện tại PROXY_API_KEY và PROXY_API_BASE được hardcode trong `src/infrastructure/config.ts`
- Models được hardcode trong `src/services/ai/model.service.ts` (RECOMMENDED_MODELS array)
- Cần migrate sang System Config để SP-Admin có thể quản lý qua API

## Requirements
1. Thêm config keys:
   - `ai.api_keys.proxy_api_key` (string)
   - `ai.api_keys.proxy_api_base` (string)
   - `ai.models.list` (array of model objects)

2. Model object structure:
   ```typescript
   {
     name: string;                    // e.g., "gpt-4o-mini"
     displayName: string;              // e.g., "GPT-4o Mini"
     description: string;               // e.g., "Rẻ nhất, phù hợp cho chatbot cơ bản"
     provider: 'openai' | 'gemini' | 'deepseek';
     category: 'budget' | 'balanced' | 'premium';
     recommended: boolean;
     // Pricing info từ v98store log
     modelRatio: number;               // e.g., 0.075
     outputRatio: number;              // e.g., 4
     cacheRatio: number;               // e.g., 0.5
     cacheCreationRatio: number;       // e.g., 1
     groupRatio: number;                // e.g., 1
     promptPrice: number;              // $ per 1M tokens (calculated)
     completionPrice: number;          // $ per 1M tokens (calculated)
     cachePrice: number;                // $ per 1M tokens (calculated)
     cacheCreationPrice: number;       // $ per 1M tokens (calculated)
     aliases?: string[];               // Optional aliases
   }
   ```

## Architecture
- Thêm keys vào `AI_CONFIG_KEYS` trong `src/types/system-config.ts`
- Thêm default values vào `DEFAULT_SYSTEM_CONFIGS`
- Models sẽ được lưu dưới dạng array trong System Config

## Related Code Files
- `src/types/system-config.ts` - Thêm config keys
- `src/services/system-config/system-config.service.ts` - Service đã có sẵn
- `src/controllers/admin/system-config.controller.ts` - Controller đã có sẵn

## Implementation Steps
1. Thêm `PROXY_API_BASE` key vào `AI_CONFIG_KEYS`
2. Thêm default config cho `PROXY_API_KEY` và `PROXY_API_BASE`
3. Thêm `AI_MODELS_LIST` key vào `AI_CONFIG_KEYS`
4. Tạo default models array với đầy đủ pricing info từ v98store log
5. Thêm vào `DEFAULT_SYSTEM_CONFIGS`

## Todo List
- [ ] Thêm `PROXY_API_BASE` key
- [ ] Thêm default config cho proxy keys
- [ ] Thêm `AI_MODELS_LIST` key
- [ ] Tạo default models array với pricing info
- [ ] Test config initialization

## Success Criteria
- Config keys được thêm vào System Config
- Default values được set đúng
- Config có thể được đọc qua System Config Service

## Risk Assessment
- Low risk: Chỉ thêm config keys, không thay đổi logic hiện tại

## Security Considerations
- PROXY_API_KEY là sensitive data, cần được encrypt khi lưu
- Chỉ SP-Admin có quyền thay đổi

## Next Steps
Sau khi hoàn thành Phase 1, chuyển sang Phase 2: Model Management API

