/**
 * System Config Service
 * 
 * WHY: Service để quản lý System Config
 * - CRUD operations cho configs
 * - Cache trong Redis để performance
 * - Validate config values
 * - Track changes (audit trail)
 */

import { prisma } from '../../infrastructure/database';
import { redis } from '../../infrastructure/redis';
import { logger } from '../../infrastructure/logger';
import type { SystemConfigCategory, SystemConfigType } from '../../types/system-config';
import { NotFoundError } from '../../utils/resilience/errors';
import type { PrismaClient } from '@prisma/client';

// Type assertion để fix TypeScript language server cache issue
// WHY: Prisma client đã có systemConfig sau khi migrate, nhưng TS server chưa nhận
const prismaWithSystemConfig = prisma as PrismaClient & {
  systemConfig: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
};

/**
 * Cache key prefix
 */
const CACHE_KEY_PREFIX = 'system_config:';
const CACHE_TTL = 3600; // 1 hour

/**
 * Get cache key
 */
function getCacheKey(category: string, key: string): string {
  return `${CACHE_KEY_PREFIX}${category}:${key}`;
}

/**
 * System Config Service
 */
export class SystemConfigService {
  /**
   * Get config by category and key
   * WHY: Lấy config với cache
   */
  async getConfig(
    category: SystemConfigCategory,
    key: string
  ): Promise<{ value: unknown; type: SystemConfigType } | null> {
    try {
      // Check cache first
      const cacheKey = getCacheKey(category, key);
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          value: parsed.value,
          type: parsed.type,
        };
      }
      
      // Get from database
      const config = await prismaWithSystemConfig.systemConfig.findUnique({
        where: {
          category_key: {
            category,
            key,
          },
        },
      });
      
      if (!config) {
        return null;
      }
      
      // Cache result
      await redis.setex(
        cacheKey,
        CACHE_TTL,
        JSON.stringify({
          value: config.value,
          type: config.type,
        })
      );
      
      return {
        value: config.value,
        type: config.type as SystemConfigType,
      };
    } catch (error) {
      logger.error('Failed to get system config', {
        category,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  
  /**
   * Get config value (typed)
   * WHY: Helper để lấy giá trị với type casting
   */
  async getConfigValue<T = unknown>(
    category: SystemConfigCategory,
    key: string,
    defaultValue?: T
  ): Promise<T> {
    const config = await this.getConfig(category, key);
    
    if (!config) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new NotFoundError(`System config not found: ${category}.${key}`);
    }
    
    return config.value as T;
  }
  
  /**
   * List configs
   * WHY: List configs với pagination và filter
   */
  async listConfigs(options: {
    category?: SystemConfigCategory;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    data: Array<{
      id: string;
      category: string;
      key: string;
      value: unknown;
      type: string;
      description: string | null;
      isEditable: boolean;
      updatedBy: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 100);
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (options.category) {
      where.category = options.category;
    }
    
    if (options.search) {
      where.OR = [
        { key: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    
    const [configs, total] = await Promise.all([
      prismaWithSystemConfig.systemConfig.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { category: 'asc' },
          { key: 'asc' },
        ],
      }),
      prismaWithSystemConfig.systemConfig.count({ where }),
    ]);
    
    return {
      data: configs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Create config
   * WHY: Tạo config mới (chỉ SP-Admin)
   */
  async createConfig(
    category: SystemConfigCategory,
    key: string,
    value: unknown,
    type: SystemConfigType,
    description?: string,
    isEditable: boolean = true,
    updatedBy?: string
  ): Promise<{
    id: string;
    category: string;
    key: string;
    value: unknown;
    type: string;
    description: string | null;
    isEditable: boolean;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    try {
      // Validate value type
      this.validateValueType(value, type);
      
      const config = await prismaWithSystemConfig.systemConfig.create({
        data: {
          category,
          key,
          value: value as any, // Prisma Json type
          type,
          description: description || null,
          isEditable,
          updatedBy: updatedBy || null,
        },
      });
      
      // Invalidate cache
      await this.invalidateCache(category, key);
      
      logger.info('System config created', {
        category,
        key,
        updatedBy,
      });
      
      return config;
    } catch (error) {
      logger.error('Failed to create system config', {
        category,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  
  /**
   * Update config
   * WHY: Update config value (chỉ SP-Admin)
   */
  async updateConfig(
    category: SystemConfigCategory,
    key: string,
    updates: {
      value?: unknown;
      description?: string;
      isEditable?: boolean;
    },
    updatedBy?: string
  ): Promise<{
    id: string;
    category: string;
    key: string;
    value: unknown;
    type: string;
    description: string | null;
    isEditable: boolean;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    try {
      // Get existing config
      const existing = await prismaWithSystemConfig.systemConfig.findUnique({
        where: {
          category_key: {
            category,
            key,
          },
        },
      });
      
      // Auto-create config if doesn't exist (upsert behavior for AI config)
      if (!existing) {
        // Infer type from value if not provided
        let type: SystemConfigType = 'string';
        if (updates.value !== undefined) {
          if (typeof updates.value === 'string') type = 'string';
          else if (typeof updates.value === 'number') type = 'number';
          else if (typeof updates.value === 'boolean') type = 'boolean';
          else if (Array.isArray(updates.value)) type = 'array';
          else if (typeof updates.value === 'object' && updates.value !== null) type = 'object';
        }
        
        const config = await prismaWithSystemConfig.systemConfig.create({
          data: {
            category,
            key,
            value: (updates.value !== undefined ? updates.value : null) as any,
            type,
            description: updates.description || null,
            isEditable: updates.isEditable !== undefined ? updates.isEditable : true,
            updatedBy: updatedBy || null,
          },
        });
        
        logger.info('System config auto-created', {
          category,
          key,
          updatedBy,
        });
        
        return config;
      }
      
      if (!existing.isEditable) {
        throw new Error(`System config is not editable: ${category}.${key}`);
      }
      
      // Validate value type if provided
      if (updates.value !== undefined) {
        this.validateValueType(updates.value, existing.type as SystemConfigType);
      }
      
      const config = await prismaWithSystemConfig.systemConfig.update({
        where: {
          category_key: {
            category,
            key,
          },
        },
        data: {
          ...(updates.value !== undefined && { value: updates.value as any }),
          ...(updates.description !== undefined && { description: updates.description || null }),
          ...(updates.isEditable !== undefined && { isEditable: updates.isEditable }),
          updatedBy: updatedBy || null,
        },
      });
      
      // Invalidate cache
      await this.invalidateCache(category, key);
      
      logger.info('System config updated', {
        category,
        key,
        updatedBy,
      });
      
      return config;
    } catch (error) {
      logger.error('Failed to update system config', {
        category,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  
  /**
   * Delete config
   * WHY: Xóa config (chỉ SP-Admin)
   */
  async deleteConfig(
    category: SystemConfigCategory,
    key: string
  ): Promise<void> {
    try {
      const existing = await prismaWithSystemConfig.systemConfig.findUnique({
        where: {
          category_key: {
            category,
            key,
          },
        },
      });
      
      if (!existing) {
        throw new NotFoundError(`System config not found: ${category}.${key}`);
      }
      
      if (!existing.isEditable) {
        throw new Error(`System config is not editable: ${category}.${key}`);
      }
      
      await prismaWithSystemConfig.systemConfig.delete({
        where: {
          category_key: {
            category,
            key,
          },
        },
      });
      
      // Invalidate cache
      await this.invalidateCache(category, key);
      
      logger.info('System config deleted', {
        category,
        key,
      });
    } catch (error) {
      logger.error('Failed to delete system config', {
        category,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
  
  /**
   * Initialize default configs
   * WHY: Tạo default configs khi setup system
   */
  async initializeDefaultConfigs(): Promise<void> {
    const { DEFAULT_SYSTEM_CONFIGS } = await import('../../types/system-config');
    
    for (const defaultConfig of DEFAULT_SYSTEM_CONFIGS) {
      try {
        // Check if exists
        const existing = await prismaWithSystemConfig.systemConfig.findUnique({
          where: {
            category_key: {
              category: defaultConfig.category,
              key: defaultConfig.key,
            },
          },
        });
        
        if (!existing) {
          // Create if not exists
          await prismaWithSystemConfig.systemConfig.create({
            data: {
              category: defaultConfig.category,
              key: defaultConfig.key,
              value: defaultConfig.value as any,
              type: defaultConfig.type,
              description: defaultConfig.description,
              isEditable: defaultConfig.isEditable,
            },
          });
          
          logger.info('Default system config created', {
            category: defaultConfig.category,
            key: defaultConfig.key,
          });
        }
      } catch (error) {
        logger.error('Failed to initialize default config', {
          category: defaultConfig.category,
          key: defaultConfig.key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  
  /**
   * Validate value type
   * WHY: Ensure value matches declared type
   */
  private validateValueType(value: unknown, type: SystemConfigType): void {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Value must be string, got ${typeof value}`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error(`Value must be number, got ${typeof value}`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Value must be boolean, got ${typeof value}`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new Error(`Value must be object, got ${typeof value}`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Value must be array, got ${typeof value}`);
        }
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }
  
  /**
   * Invalidate cache
   * WHY: Clear cache khi config thay đổi
   */
  private async invalidateCache(category: string, key: string): Promise<void> {
    const cacheKey = getCacheKey(category, key);
    await redis.del(cacheKey);
  }
  
  /**
   * Invalidate all cache
   * WHY: Clear tất cả cache (khi cần)
   */
  async invalidateAllCache(): Promise<void> {
    const keys = await redis.keys(`${CACHE_KEY_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const systemConfigService = new SystemConfigService();

