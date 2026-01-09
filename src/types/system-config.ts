/**
 * System Config Types
 * 
 * WHY: Type definitions cho System Config
 * - Type-safe config access
 * - Validation schemas
 * - Default values
 */

import { z } from 'zod';

/**
 * System Config Categories
 */
export type SystemConfigCategory =
  | 'platform'
  | 'ai'
  | 'security'
  | 'billing'
  | 'features'
  | 'maintenance'
  | 'safeguards'
  | 'monitoring';

/**
 * System Config Value Types
 */
export type SystemConfigType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/**
 * System Config Model
 */
export interface SystemConfig {
  id: string;
  category: SystemConfigCategory;
  key: string;
  value: unknown; // JSON value
  type: SystemConfigType;
  description: string | null;
  isEditable: boolean;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AI Model Definition (stored in System Config)
 */
export interface AIModelConfig {
  name: string;
  displayName: string;
  description: string;
  provider: 'openai' | 'gemini' | 'deepseek';
  category: 'budget' | 'balanced' | 'premium';
  recommended: boolean;
  modelRatio: number;
  outputRatio: number;
  cacheRatio: number;
  cacheCreationRatio: number;
  groupRatio: number;
  promptPrice: number; // $ per 1M tokens
  completionPrice: number; // $ per 1M tokens
  cachePrice: number; // $ per 1M tokens
  cacheCreationPrice: number; // $ per 1M tokens
  aliases?: string[];
}

/**
 * Platform Config Keys
 */
export const PLATFORM_CONFIG_KEYS = {
  // Rate Limits
  RATE_LIMIT_WHATSAPP_MESSAGES_PER_MINUTE: 'rate_limit.whatsapp.messages_per_minute',
  RATE_LIMIT_FACEBOOK_MESSAGES_PER_MINUTE: 'rate_limit.facebook.messages_per_minute',
  RATE_LIMIT_INSTAGRAM_MESSAGES_PER_MINUTE: 'rate_limit.instagram.messages_per_minute',
  RATE_LIMIT_TIKTOK_MESSAGES_PER_MINUTE: 'rate_limit.tiktok.messages_per_minute',
  RATE_LIMIT_ZALO_MESSAGES_PER_MINUTE: 'rate_limit.zalo.messages_per_minute',
  RATE_LIMIT_SHOPEE_MESSAGES_PER_MINUTE: 'rate_limit.shopee.messages_per_minute',
  RATE_LIMIT_LAZADA_MESSAGES_PER_MINUTE: 'rate_limit.lazada.messages_per_minute',
  
  // Platform Features
  PLATFORM_WHATSAPP_ENABLED: 'platform.whatsapp.enabled',
  PLATFORM_FACEBOOK_ENABLED: 'platform.facebook.enabled',
  PLATFORM_INSTAGRAM_ENABLED: 'platform.instagram.enabled',
  PLATFORM_TIKTOK_ENABLED: 'platform.tiktok.enabled',
  PLATFORM_ZALO_ENABLED: 'platform.zalo.enabled',
  PLATFORM_SHOPEE_ENABLED: 'platform.shopee.enabled',
  PLATFORM_LAZADA_ENABLED: 'platform.lazada.enabled',
  
  // Connection Limits
  MAX_CONNECTIONS_PER_TENANT: 'platform.max_connections_per_tenant',
  MAX_CONNECTIONS_PER_PLATFORM: 'platform.max_connections_per_platform',
} as const;

/**
 * AI Config Keys
 */
export const AI_CONFIG_KEYS = {
  // API Keys
  API_KEY_OPENAI: 'ai.api_keys.openai',
  API_KEY_GEMINI: 'ai.api_keys.gemini',
  API_KEY_DEEPSEEK: 'ai.api_keys.deepseek',
  API_KEY_PROXY: 'ai.api_keys.proxy_api_key',
  PROXY_API_BASE: 'ai.api_keys.proxy_api_base',
  
  // Models List
  AI_MODELS_LIST: 'ai.models.list',
  
  // Default Models
  DEFAULT_AI_MODEL: 'ai.default_model',
  DEFAULT_TEMPERATURE: 'ai.default_temperature',
  DEFAULT_MAX_TOKENS: 'ai.default_max_tokens',
  
  // Provider Settings (old keys for backward compatibility)
  OPENAI_ENABLED: 'ai.providers.openai.enabled',
  GEMINI_ENABLED: 'ai.providers.gemini.enabled',
  DEEPSEEK_ENABLED: 'ai.providers.deepseek.enabled',
  
  // Model Settings (new keys matching doc)
  MODEL_OPENAI_ENABLED: 'ai.models.openai.enabled',
  MODEL_GEMINI_ENABLED: 'ai.models.gemini.enabled',
  MODEL_DEEPSEEK_ENABLED: 'ai.models.deepseek.enabled',
  MODEL_DEFAULT: 'ai.models.default',
  
  // Cost Settings
  OPENAI_COST_PER_1K_TOKENS: 'ai.costs.openai.per_1k_tokens',
  GEMINI_COST_PER_1K_TOKENS: 'ai.costs.gemini.per_1k_tokens',
  DEEPSEEK_COST_PER_1K_TOKENS: 'ai.costs.deepseek.per_1k_tokens',
  
  // Model Costs (new keys matching doc)
  MODEL_OPENAI_COST_PER_1K_TOKENS: 'ai.models.openai.cost_per_1k_tokens',
  MODEL_GEMINI_COST_PER_1K_TOKENS: 'ai.models.gemini.cost_per_1k_tokens',
  MODEL_DEEPSEEK_COST_PER_1K_TOKENS: 'ai.models.deepseek.cost_per_1k_tokens',
  
  // Limits
  MAX_TOKENS_PER_REQUEST: 'ai.limits.max_tokens_per_request',
  MAX_REQUESTS_PER_MINUTE: 'ai.limits.max_requests_per_minute',
  MAX_CONTEXT_MESSAGES: 'ai.limits.max_context_messages',
} as const;

/**
 * Security Config Keys
 */
export const SECURITY_CONFIG_KEYS = {
  // Password Policy
  PASSWORD_MIN_LENGTH: 'security.password.min_length',
  PASSWORD_REQUIRE_UPPERCASE: 'security.password.require_uppercase',
  PASSWORD_REQUIRE_LOWERCASE: 'security.password.require_lowercase',
  PASSWORD_REQUIRE_NUMBERS: 'security.password.require_numbers',
  PASSWORD_REQUIRE_SPECIAL: 'security.password.require_special',
  
  // Session
  SESSION_TIMEOUT_MINUTES: 'security.session.timeout_minutes',
  REFRESH_TOKEN_EXPIRY_DAYS: 'security.session.refresh_token_expiry_days',
  
  // Rate Limits
  AUTH_RATE_LIMIT_ATTEMPTS: 'security.rate_limit.auth.attempts',
  AUTH_RATE_LIMIT_WINDOW_MINUTES: 'security.rate_limit.auth.window_minutes',
  
  // IP Whitelist
  IP_WHITELIST_ENABLED: 'security.ip_whitelist.enabled',
  IP_WHITELIST: 'security.ip_whitelist.addresses',
  
  // IP Blacklist
  IP_BLACKLIST_ENABLED: 'security.ip_blacklist.enabled',
  IP_BLACKLIST: 'security.ip_blacklist.addresses',
  
  // Domain Blacklist
  DOMAIN_BLACKLIST: 'security.domain_blacklist',
  
  // Banned IPs
  BANNED_IPS: 'security.banned_ips',
  BAN_DURATION_MINUTES: 'security.ban_duration_minutes',
} as const;

/**
 * Billing Config Keys
 */
export const BILLING_CONFIG_KEYS = {
  // Credit Conversion
  CREDIT_TO_VND_RATE: 'billing.credit_to_vnd_rate',
  VND_TO_CREDIT_RATE: 'billing.vnd_to_credit_rate',
  
  // Pricing
  CREDIT_PACKAGE_BASE_PRICE: 'billing.credit_package.base_price',
  CREDIT_PACKAGE_BONUS_RATE: 'billing.credit_package.bonus_rate',
  
  // Credit Packages
  CREDIT_PACKAGES: 'billing.credit_packages',
  
  // Limits
  MIN_TOPUP_AMOUNT: 'billing.limits.min_topup_amount',
  MAX_TOPUP_AMOUNT: 'billing.limits.max_topup_amount',
} as const;

/**
 * Feature Flags
 */
export const FEATURE_CONFIG_KEYS = {
  // Features
  FEATURE_KNOWLEDGE_BASE_ENABLED: 'features.knowledge_base.enabled',
  FEATURE_RAG_ENABLED: 'features.rag.enabled',
  FEATURE_WORKFLOW_ENABLED: 'features.workflow.enabled',
  FEATURE_ANALYTICS_ENABLED: 'features.analytics.enabled',
  FEATURE_CATALOG_ENABLED: 'features.catalog.enabled',
  FEATURE_PAYMENT_ENABLED: 'features.payment.enabled',
  
  // Beta Features
  FEATURE_BETA_MULTI_LANGUAGE: 'features.beta.multi_language',
  FEATURE_BETA_VOICE_MESSAGES: 'features.beta.voice_messages',
} as const;

/**
 * Maintenance Config Keys
 */
export const MAINTENANCE_CONFIG_KEYS = {
  MAINTENANCE_MODE_ENABLED: 'maintenance.mode.enabled',
  MAINTENANCE_MESSAGE: 'maintenance.message',
  MAINTENANCE_START_TIME: 'maintenance.start_time',
  MAINTENANCE_END_TIME: 'maintenance.end_time',
} as const;

/**
 * Safeguards Config Keys
 */
export const SAFEGUARDS_CONFIG_KEYS = {
  // Max Limits
  MAX_TENANTS: 'safeguards.max_tenants',
  MAX_USERS_PER_TENANT: 'safeguards.max_users_per_tenant',
  MAX_CHATBOTS_PER_TENANT: 'safeguards.max_chatbots_per_tenant',
  MAX_CONVERSATIONS_PER_TENANT: 'safeguards.max_conversations_per_tenant',
  MAX_MESSAGES_PER_CONVERSATION: 'safeguards.max_messages_per_conversation',
  
  // Abuse Prevention
  ABUSE_DETECTION_ENABLED: 'safeguards.abuse_detection.enabled',
  ABUSE_THRESHOLD_MESSAGES_PER_MINUTE: 'safeguards.abuse_detection.threshold_messages_per_minute',
  ABUSE_BLOCK_DURATION_MINUTES: 'safeguards.abuse_detection.block_duration_minutes',
} as const;

/**
 * Monitoring Config Keys
 */
export const MONITORING_CONFIG_KEYS = {
  AI_REQUEST_THRESHOLD_PER_MINUTE: 'monitoring.ai_request_threshold_per_minute',
  SUSPICIOUS_IPS: 'monitoring.suspicious_ips',
} as const;

/**
 * Validation Schemas
 */
export const createSystemConfigSchema = z.object({
  category: z.enum(['platform', 'ai', 'security', 'billing', 'features', 'maintenance', 'safeguards', 'monitoring']),
  key: z.string().min(1).max(255),
  value: z.unknown(), // JSON value
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string().max(1000).optional(),
  isEditable: z.boolean().default(true),
});

export const updateSystemConfigSchema = z.object({
  value: z.unknown().optional(),
  description: z.string().max(1000).optional(),
  isEditable: z.boolean().optional(),
});

export const listSystemConfigsSchema = z.object({
  category: z.enum(['platform', 'ai', 'security', 'billing', 'features', 'maintenance', 'safeguards', 'monitoring']).optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  search: z.string().optional(),
});

/**
 * Default System Config Values
 * WHY: Initial values khi setup system
 */
export const DEFAULT_SYSTEM_CONFIGS: Array<{
  category: SystemConfigCategory;
  key: string;
  value: unknown;
  type: SystemConfigType;
  description: string;
  isEditable: boolean;
}> = [
  // Platform - Rate Limits
  {
    category: 'platform',
    key: PLATFORM_CONFIG_KEYS.RATE_LIMIT_WHATSAPP_MESSAGES_PER_MINUTE,
    value: 20,
    type: 'number',
    description: 'Maximum WhatsApp messages per minute per tenant',
    isEditable: true,
  },
  {
    category: 'platform',
    key: PLATFORM_CONFIG_KEYS.RATE_LIMIT_FACEBOOK_MESSAGES_PER_MINUTE,
    value: 10,
    type: 'number',
    description: 'Maximum Facebook messages per minute per tenant',
    isEditable: true,
  },
  {
    category: 'platform',
    key: PLATFORM_CONFIG_KEYS.MAX_CONNECTIONS_PER_TENANT,
    value: 10,
    type: 'number',
    description: 'Maximum platform connections per tenant',
    isEditable: true,
  },
  
  // Platform - Features
  {
    category: 'platform',
    key: PLATFORM_CONFIG_KEYS.PLATFORM_WHATSAPP_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable WhatsApp platform',
    isEditable: true,
  },
  {
    category: 'platform',
    key: PLATFORM_CONFIG_KEYS.PLATFORM_FACEBOOK_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable Facebook platform',
    isEditable: true,
  },
  
  // AI - API Keys
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.API_KEY_OPENAI,
    value: '',
    type: 'string',
    description: 'OpenAI API Key',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.API_KEY_GEMINI,
    value: '',
    type: 'string',
    description: 'Google Gemini API Key',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.API_KEY_DEEPSEEK,
    value: '',
    type: 'string',
    description: 'DeepSeek API Key',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.API_KEY_PROXY,
    value: '',
    type: 'string',
    description: 'Proxy API Key (v98store)',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.PROXY_API_BASE,
    value: 'https://v98store.com/v1',
    type: 'string',
    description: 'Proxy API Base URL (v98store)',
    isEditable: true,
  },
  
  // AI - Models List
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.AI_MODELS_LIST,
    value: [
      {
        name: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        description: 'Rẻ nhất, phù hợp cho chatbot cơ bản',
        provider: 'openai',
        category: 'budget',
        recommended: true,
        modelRatio: 0.075,
        outputRatio: 4,
        cacheRatio: 0.5,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 0.15,
        completionPrice: 0.6,
        cachePrice: 0.075,
        cacheCreationPrice: 0.15,
      },
      {
        name: 'gpt-4o',
        displayName: 'GPT-4o',
        description: 'Cân bằng giữa chất lượng và giá',
        provider: 'openai',
        category: 'balanced',
        recommended: true,
        modelRatio: 1.25,
        outputRatio: 4,
        cacheRatio: 0.5,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 2.5,
        completionPrice: 10,
        cachePrice: 1.25,
        cacheCreationPrice: 2.5,
      },
      {
        name: 'gpt-4.1-2025-04-14',
        displayName: 'GPT-4.1',
        description: 'Phiên bản mới nhất, chất lượng cao',
        provider: 'openai',
        category: 'premium',
        recommended: false,
        aliases: ['gpt-4.1', '4.1'],
        modelRatio: 1,
        outputRatio: 4,
        cacheRatio: 0.25,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 2,
        completionPrice: 8,
        cachePrice: 0.5,
        cacheCreationPrice: 2,
      },
      {
        name: 'gpt-4',
        displayName: 'GPT-4',
        description: 'Model cổ điển, chất lượng tốt',
        provider: 'openai',
        category: 'premium',
        recommended: false,
        modelRatio: 15,
        outputRatio: 2,
        cacheRatio: 0.5,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 30,
        completionPrice: 60,
        cachePrice: 15,
        cacheCreationPrice: 30,
      },
      {
        name: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        description: 'Nhanh, rẻ, phù hợp chatbot',
        provider: 'gemini',
        category: 'budget',
        recommended: true,
        modelRatio: 0.15,
        outputRatio: 8.34,
        cacheRatio: 1,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 0.3,
        completionPrice: 2.502,
        cachePrice: 0.3,
        cacheCreationPrice: 0.3,
      },
      {
        name: 'gemini-3-flash-preview',
        displayName: 'Gemini 3 Flash Preview',
        description: 'Phiên bản preview mới nhất, nhanh',
        provider: 'gemini',
        category: 'budget',
        recommended: false,
        modelRatio: 0.25,
        outputRatio: 6,
        cacheRatio: 1,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 0.5,
        completionPrice: 3,
        cachePrice: 0.5,
        cacheCreationPrice: 0.5,
      },
      {
        name: 'deepseek-chat',
        displayName: 'DeepSeek Chat',
        description: 'Rất rẻ, chất lượng tốt',
        provider: 'deepseek',
        category: 'budget',
        recommended: true,
        modelRatio: 1,
        outputRatio: 4,
        cacheRatio: 0.25,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 2,
        completionPrice: 8,
        cachePrice: 0.5,
        cacheCreationPrice: 2,
      },
      {
        name: 'deepseek-v3',
        displayName: 'DeepSeek V3',
        description: 'Phiên bản V3, chất lượng tốt hơn',
        provider: 'deepseek',
        category: 'balanced',
        recommended: false,
        modelRatio: 1,
        outputRatio: 4,
        cacheRatio: 1,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 2,
        completionPrice: 8,
        cachePrice: 2,
        cacheCreationPrice: 2,
      },
      {
        name: 'deepseek-v3.1',
        displayName: 'DeepSeek V3.1',
        description: 'Phiên bản V3.1, cải tiến từ V3',
        provider: 'deepseek',
        category: 'balanced',
        recommended: false,
        modelRatio: 2,
        outputRatio: 3,
        cacheRatio: 1,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 4,
        completionPrice: 12,
        cachePrice: 4,
        cacheCreationPrice: 4,
      },
      {
        name: 'deepseek-v3.2',
        displayName: 'DeepSeek V3.2',
        description: 'Phiên bản V3.2 mới nhất',
        provider: 'deepseek',
        category: 'balanced',
        recommended: false,
        modelRatio: 1,
        outputRatio: 1.5,
        cacheRatio: 1,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 2,
        completionPrice: 3,
        cachePrice: 2,
        cacheCreationPrice: 2,
      },
      {
        name: 'deepseek-r1',
        displayName: 'DeepSeek R1',
        description: 'Model reasoning, phù hợp logic phức tạp',
        provider: 'deepseek',
        category: 'premium',
        recommended: false,
        modelRatio: 2,
        outputRatio: 4,
        cacheRatio: 1,
        cacheCreationRatio: 1,
        groupRatio: 1,
        promptPrice: 4,
        completionPrice: 16,
        cachePrice: 4,
        cacheCreationPrice: 4,
      },
    ],
    type: 'array',
    description: 'Danh sách AI models với pricing info (có thể thêm/sửa/xóa qua API)',
    isEditable: true,
  },
  
  // AI - Defaults
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.DEFAULT_AI_MODEL,
    value: 'gpt-3.5-turbo',
    type: 'string',
    description: 'Default AI model for new chatbots',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.MODEL_DEFAULT,
    value: 'gpt-3.5-turbo',
    type: 'string',
    description: 'Default AI model',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.DEFAULT_TEMPERATURE,
    value: 0.7,
    type: 'number',
    description: 'Default temperature for AI responses',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.DEFAULT_MAX_TOKENS,
    value: 1000,
    type: 'number',
    description: 'Default max tokens for AI responses',
    isEditable: true,
  },
  
  // AI - Provider Settings (old keys for backward compatibility)
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.OPENAI_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable OpenAI provider',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.GEMINI_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable Gemini provider',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.DEEPSEEK_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable DeepSeek provider',
    isEditable: true,
  },
  
  // AI - Model Settings (new keys matching doc)
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.MODEL_OPENAI_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Bật/tắt OpenAI model',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.MODEL_GEMINI_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Bật/tắt Gemini model',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.MODEL_DEEPSEEK_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Bật/tắt DeepSeek model',
    isEditable: true,
  },
  
  // AI - Costs (per 1k tokens) - old keys
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.OPENAI_COST_PER_1K_TOKENS,
    value: 0.002,
    type: 'number',
    description: 'OpenAI cost per 1k tokens (USD)',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.GEMINI_COST_PER_1K_TOKENS,
    value: 0.001,
    type: 'number',
    description: 'Gemini cost per 1k tokens (USD)',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.DEEPSEEK_COST_PER_1K_TOKENS,
    value: 0.0007,
    type: 'number',
    description: 'DeepSeek cost per 1k tokens (USD)',
    isEditable: true,
  },
  
  // AI - Model Costs (new keys matching doc)
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.MODEL_OPENAI_COST_PER_1K_TOKENS,
    value: 0.002,
    type: 'number',
    description: 'Giá OpenAI (USD/1k tokens)',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.MODEL_GEMINI_COST_PER_1K_TOKENS,
    value: 0.001,
    type: 'number',
    description: 'Giá Gemini (USD/1k tokens)',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.MODEL_DEEPSEEK_COST_PER_1K_TOKENS,
    value: 0.0007,
    type: 'number',
    description: 'Giá DeepSeek (USD/1k tokens)',
    isEditable: true,
  },
  
  // AI - Limits
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.MAX_TOKENS_PER_REQUEST,
    value: 4000,
    type: 'number',
    description: 'Maximum tokens per AI request',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.MAX_REQUESTS_PER_MINUTE,
    value: 60,
    type: 'number',
    description: 'Maximum AI requests per minute per tenant',
    isEditable: true,
  },
  {
    category: 'ai',
    key: AI_CONFIG_KEYS.MAX_CONTEXT_MESSAGES,
    value: 50,
    type: 'number',
    description: 'Maximum messages in conversation context',
    isEditable: true,
  },
  
  // Security - Password Policy
  {
    category: 'security',
    key: SECURITY_CONFIG_KEYS.PASSWORD_MIN_LENGTH,
    value: 8,
    type: 'number',
    description: 'Minimum password length',
    isEditable: true,
  },
  {
    category: 'security',
    key: SECURITY_CONFIG_KEYS.PASSWORD_REQUIRE_UPPERCASE,
    value: false,
    type: 'boolean',
    description: 'Require uppercase letters in password',
    isEditable: true,
  },
  {
    category: 'security',
    key: SECURITY_CONFIG_KEYS.PASSWORD_REQUIRE_LOWERCASE,
    value: true,
    type: 'boolean',
    description: 'Require lowercase letters in password',
    isEditable: true,
  },
  {
    category: 'security',
    key: SECURITY_CONFIG_KEYS.PASSWORD_REQUIRE_NUMBERS,
    value: true,
    type: 'boolean',
    description: 'Require numbers in password',
    isEditable: true,
  },
  {
    category: 'security',
    key: SECURITY_CONFIG_KEYS.PASSWORD_REQUIRE_SPECIAL,
    value: false,
    type: 'boolean',
    description: 'Require special characters in password',
    isEditable: true,
  },
  
  // Security - Session
  {
    category: 'security',
    key: SECURITY_CONFIG_KEYS.SESSION_TIMEOUT_MINUTES,
    value: 30,
    type: 'number',
    description: 'Session timeout in minutes',
    isEditable: true,
  },
  {
    category: 'security',
    key: SECURITY_CONFIG_KEYS.REFRESH_TOKEN_EXPIRY_DAYS,
    value: 7,
    type: 'number',
    description: 'Refresh token expiry in days',
    isEditable: true,
  },
  
  // Security - Rate Limits
  {
    category: 'security',
    key: SECURITY_CONFIG_KEYS.AUTH_RATE_LIMIT_ATTEMPTS,
    value: 5,
    type: 'number',
    description: 'Maximum authentication attempts per window',
    isEditable: true,
  },
  {
    category: 'security',
    key: SECURITY_CONFIG_KEYS.AUTH_RATE_LIMIT_WINDOW_MINUTES,
    value: 15,
    type: 'number',
    description: 'Authentication rate limit window in minutes',
    isEditable: true,
  },
  
  // Billing - Credit Conversion
  {
    category: 'billing',
    key: BILLING_CONFIG_KEYS.CREDIT_TO_VND_RATE,
    value: 1000,
    type: 'number',
    description: 'Credit to VND conversion rate (1 credit = X VND)',
    isEditable: true,
  },
  {
    category: 'billing',
    key: BILLING_CONFIG_KEYS.VND_TO_CREDIT_RATE,
    value: 0.001,
    type: 'number',
    description: 'VND to Credit conversion rate (1 VND = X credit)',
    isEditable: true,
  },
  
  // Billing - Credit Packages
  {
    category: 'billing',
    key: BILLING_CONFIG_KEYS.CREDIT_PACKAGES,
    value: [],
    type: 'array',
    description: 'Danh sách các gói credit AI',
    isEditable: true,
  },
  
  // Billing - Limits
  {
    category: 'billing',
    key: BILLING_CONFIG_KEYS.MIN_TOPUP_AMOUNT,
    value: 10000,
    type: 'number',
    description: 'Minimum top-up amount (VND)',
    isEditable: true,
  },
  {
    category: 'billing',
    key: BILLING_CONFIG_KEYS.MAX_TOPUP_AMOUNT,
    value: 10000000,
    type: 'number',
    description: 'Maximum top-up amount (VND)',
    isEditable: true,
  },
  
  // Features
  {
    category: 'features',
    key: FEATURE_CONFIG_KEYS.FEATURE_KNOWLEDGE_BASE_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable Knowledge Base feature',
    isEditable: true,
  },
  {
    category: 'features',
    key: FEATURE_CONFIG_KEYS.FEATURE_RAG_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable RAG feature',
    isEditable: true,
  },
  {
    category: 'features',
    key: FEATURE_CONFIG_KEYS.FEATURE_WORKFLOW_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable Workflow feature',
    isEditable: true,
  },
  {
    category: 'features',
    key: FEATURE_CONFIG_KEYS.FEATURE_ANALYTICS_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable Analytics feature',
    isEditable: true,
  },
  {
    category: 'features',
    key: FEATURE_CONFIG_KEYS.FEATURE_CATALOG_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable Catalog feature',
    isEditable: true,
  },
  {
    category: 'features',
    key: FEATURE_CONFIG_KEYS.FEATURE_PAYMENT_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable Payment feature',
    isEditable: true,
  },
  
  // Maintenance
  {
    category: 'maintenance',
    key: MAINTENANCE_CONFIG_KEYS.MAINTENANCE_MODE_ENABLED,
    value: false,
    type: 'boolean',
    description: 'Enable/disable maintenance mode',
    isEditable: true,
  },
  {
    category: 'maintenance',
    key: MAINTENANCE_CONFIG_KEYS.MAINTENANCE_MESSAGE,
    value: 'System is under maintenance. Please try again later.',
    type: 'string',
    description: 'Maintenance mode message',
    isEditable: true,
  },
  
  // Safeguards - Max Limits
  {
    category: 'safeguards',
    key: SAFEGUARDS_CONFIG_KEYS.MAX_TENANTS,
    value: 1000,
    type: 'number',
    description: 'Maximum number of tenants (0 = unlimited)',
    isEditable: true,
  },
  {
    category: 'safeguards',
    key: SAFEGUARDS_CONFIG_KEYS.MAX_USERS_PER_TENANT,
    value: 50,
    type: 'number',
    description: 'Maximum users per tenant (0 = unlimited)',
    isEditable: true,
  },
  {
    category: 'safeguards',
    key: SAFEGUARDS_CONFIG_KEYS.MAX_CHATBOTS_PER_TENANT,
    value: 10,
    type: 'number',
    description: 'Maximum chatbots per tenant (0 = unlimited)',
    isEditable: true,
  },
  {
    category: 'safeguards',
    key: SAFEGUARDS_CONFIG_KEYS.MAX_MESSAGES_PER_CONVERSATION,
    value: 1000,
    type: 'number',
    description: 'Maximum messages per conversation (0 = unlimited)',
    isEditable: true,
  },
  
  // Safeguards - Abuse Prevention
  {
    category: 'safeguards',
    key: SAFEGUARDS_CONFIG_KEYS.ABUSE_DETECTION_ENABLED,
    value: true,
    type: 'boolean',
    description: 'Enable/disable abuse detection',
    isEditable: true,
  },
  {
    category: 'safeguards',
    key: SAFEGUARDS_CONFIG_KEYS.ABUSE_THRESHOLD_MESSAGES_PER_MINUTE,
    value: 100,
    type: 'number',
    description: 'Abuse detection threshold (messages per minute)',
    isEditable: true,
  },
  {
    category: 'safeguards',
    key: SAFEGUARDS_CONFIG_KEYS.ABUSE_BLOCK_DURATION_MINUTES,
    value: 60,
    type: 'number',
    description: 'Abuse block duration in minutes',
    isEditable: true,
  },
  
  // Monitoring - AI Request Monitoring
  {
    category: 'monitoring',
    key: MONITORING_CONFIG_KEYS.AI_REQUEST_THRESHOLD_PER_MINUTE,
    value: 100,
    type: 'number',
    description: 'Ngưỡng cảnh báo requests/phút',
    isEditable: true,
  },
  {
    category: 'monitoring',
    key: MONITORING_CONFIG_KEYS.SUSPICIOUS_IPS,
    value: [],
    type: 'array',
    description: 'Danh sách IP đang nghi ngờ (gọi AI liên tục)',
    isEditable: true,
  },
];

