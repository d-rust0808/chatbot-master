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
  | 'safeguards';

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
  // Default Models
  DEFAULT_AI_MODEL: 'ai.default_model',
  DEFAULT_TEMPERATURE: 'ai.default_temperature',
  DEFAULT_MAX_TOKENS: 'ai.default_max_tokens',
  
  // Provider Settings
  OPENAI_ENABLED: 'ai.providers.openai.enabled',
  GEMINI_ENABLED: 'ai.providers.gemini.enabled',
  DEEPSEEK_ENABLED: 'ai.providers.deepseek.enabled',
  
  // Cost Settings
  OPENAI_COST_PER_1K_TOKENS: 'ai.costs.openai.per_1k_tokens',
  GEMINI_COST_PER_1K_TOKENS: 'ai.costs.gemini.per_1k_tokens',
  DEEPSEEK_COST_PER_1K_TOKENS: 'ai.costs.deepseek.per_1k_tokens',
  
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
 * Validation Schemas
 */
export const createSystemConfigSchema = z.object({
  category: z.enum(['platform', 'ai', 'security', 'billing', 'features', 'maintenance', 'safeguards']),
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
  category: z.enum(['platform', 'ai', 'security', 'billing', 'features', 'maintenance', 'safeguards']).optional(),
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
  
  // AI - Provider Settings
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
  
  // AI - Costs (per 1k tokens)
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
];

