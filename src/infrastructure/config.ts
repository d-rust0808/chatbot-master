/**
 * Configuration management
 * 
 * WHY: Centralized config với validation
 * - Type-safe environment variables
 * - Default values cho development
 * - Validation với Zod
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Schema validation cho environment variables
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  
  // Database - Support cả DATABASE_URL hoặc DB_* variables
  DATABASE_URL: z.string().url('Invalid DATABASE_URL').optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().transform(Number).optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_SSL_MODE: z.enum(['disable', 'require', 'verify-ca', 'verify-full']).default('disable'),
  DB_MAX_OPEN_CONNS: z.string().transform(Number).default('100'),
  DB_MAX_IDLE_CONNS: z.string().transform(Number).default('10'),
  DB_CONN_MAX_LIFETIME: z.string().transform(Number).default('3600'),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),
  REDIS_POOL_SIZE: z.string().transform(Number).default('10'),
  
  // JWT
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required').optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // OpenAI (for Phase 3)
  OPENAI_API_KEY: z.string().optional(),
  
  // v98store Proxy API (alternative to direct OpenAI)
  PROXY_API_KEY: z.string().optional(),
  PROXY_API_BASE: z.string().url().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  
  // Qdrant (for Phase 3)
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

/**
 * Build DATABASE_URL từ DB_* variables
 * WHY: Support cả DATABASE_URL và DB_* variables cho flexibility
 */
function buildDatabaseUrl(env: z.infer<typeof envSchema>): string {
  // Nếu có DATABASE_URL, dùng luôn
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  // Build từ DB_* variables
  if (!env.DB_HOST || !env.DB_USER || !env.DB_PASSWORD || !env.DB_NAME) {
    throw new Error(
      'Either DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME must be set'
    );
  }

  const port = env.DB_PORT || 5432;
  const sslMode = env.DB_SSL_MODE || 'disable';

  // Build PostgreSQL connection string
  const url = `postgresql://${encodeURIComponent(env.DB_USER)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${port}/${env.DB_NAME}?sslmode=${sslMode}`;

  return url;
}

// Parse and validate environment variables
const parseEnv = () => {
  try {
    const parsed = envSchema.parse(process.env);
    
    // Build DATABASE_URL nếu chưa có
    if (!parsed.DATABASE_URL) {
      parsed.DATABASE_URL = buildDatabaseUrl(parsed);
    }
    
    // Set JWT_REFRESH_SECRET = JWT_SECRET nếu chưa có
    if (!parsed.JWT_REFRESH_SECRET) {
      parsed.JWT_REFRESH_SECRET = parsed.JWT_SECRET;
    }
    
    return parsed;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      // eslint-disable-next-line no-console
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        // eslint-disable-next-line no-console
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

const env = parseEnv();

// Export typed config object
export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  host: env.HOST,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  database: {
    url: env.DATABASE_URL!,
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    name: env.DB_NAME,
    sslMode: env.DB_SSL_MODE,
    maxOpenConns: env.DB_MAX_OPEN_CONNS,
    maxIdleConns: env.DB_MAX_IDLE_CONNS,
    connMaxLifetime: env.DB_CONN_MAX_LIFETIME,
  },
  
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    poolSize: env.REDIS_POOL_SIZE,
  },
  
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET!,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  
  openai: {
    apiKey: env.OPENAI_API_KEY,
  },
  
  proxy: {
    apiKey: env.PROXY_API_KEY,
    apiBase: env.PROXY_API_BASE,
    model: env.OPENAI_MODEL,
  },
  
  qdrant: {
    url: env.QDRANT_URL,
  },
  
  logging: {
    level: env.LOG_LEVEL,
  },
} as const;

