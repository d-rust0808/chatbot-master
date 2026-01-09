/**
 * AI Request Log Service
 * 
 * WHY: Track AI API calls để monitor usage và costs
 * - Log mọi request đến AI providers
 * - Track tokens, costs, IP addresses
 * - Hiển thị logs cho SP-Admin
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import type { AIModelConfig } from '../../types/system-config';
import type { PrismaClient } from '@prisma/client';

// Type assertion để fix TypeScript language server cache issue
const prismaWithAIRequestLog = prisma as PrismaClient & {
  aIRequestLog: {
    create: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
    groupBy: (args: any) => Promise<any>;
  };
};

/**
 * AI Request Log Data
 */
export interface AIRequestLogData {
  tenantId?: string;
  userId?: string;
  conversationId?: string;
  chatbotId?: string;
  provider: string;
  model: string;
  requestUrl?: string;
  requestMethod?: string;
  requestBody?: unknown;
  statusCode?: number;
  responseTime?: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  modelConfig?: AIModelConfig;
  ipAddress?: string;
  userAgent?: string;
  metadata?: unknown;
  error?: string;
}

/**
 * AI Request Log Service
 */
export class AIRequestLogService {
  /**
   * Log AI request
   * WHY: Track mọi AI API call
   */
  async logRequest(data: AIRequestLogData): Promise<void> {
    try {
      // Calculate cost nếu có model config và tokens
      let cost: number | undefined;
      let pricingInfo: {
        modelRatio?: number;
        outputRatio?: number;
        cacheRatio?: number;
        cacheCreationRatio?: number;
        groupRatio?: number;
        promptPrice?: number;
        completionPrice?: number;
        cachePrice?: number;
        cacheCreationPrice?: number;
      } = {};

      if (data.modelConfig && data.tokens) {
        const { promptPrice, completionPrice, cachePrice, cacheCreationPrice } = data.modelConfig;
        const { prompt, completion } = data.tokens;

        // Calculate cost
        const promptCost = (prompt / 1_000_000) * promptPrice;
        const completionCost = (completion / 1_000_000) * completionPrice;
        cost = promptCost + completionCost;

        // Add pricing info
        pricingInfo = {
          modelRatio: data.modelConfig.modelRatio,
          outputRatio: data.modelConfig.outputRatio,
          cacheRatio: data.modelConfig.cacheRatio,
          cacheCreationRatio: data.modelConfig.cacheCreationRatio,
          groupRatio: data.modelConfig.groupRatio,
          promptPrice,
          completionPrice,
          cachePrice,
          cacheCreationPrice,
        };
      }

      await prismaWithAIRequestLog.aIRequestLog.create({
        data: {
          tenantId: data.tenantId || null,
          userId: data.userId || null,
          conversationId: data.conversationId || null,
          chatbotId: data.chatbotId || null,
          provider: data.provider,
          model: data.model,
          requestUrl: data.requestUrl || null,
          requestMethod: data.requestMethod || 'POST',
          requestBody: data.requestBody as any,
          statusCode: data.statusCode || null,
          responseTime: data.responseTime || null,
          tokens: data.tokens as any,
          cost: cost ? cost : null,
          modelRatio: pricingInfo.modelRatio ? pricingInfo.modelRatio : null,
          outputRatio: pricingInfo.outputRatio ? pricingInfo.outputRatio : null,
          cacheRatio: pricingInfo.cacheRatio ? pricingInfo.cacheRatio : null,
          cacheCreationRatio: pricingInfo.cacheCreationRatio ? pricingInfo.cacheCreationRatio : null,
          groupRatio: pricingInfo.groupRatio ? pricingInfo.groupRatio : null,
          promptPrice: pricingInfo.promptPrice ? pricingInfo.promptPrice : null,
          completionPrice: pricingInfo.completionPrice ? pricingInfo.completionPrice : null,
          cachePrice: pricingInfo.cachePrice ? pricingInfo.cachePrice : null,
          cacheCreationPrice: pricingInfo.cacheCreationPrice ? pricingInfo.cacheCreationPrice : null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          metadata: data.metadata as any,
          error: data.error || null,
        },
      });
    } catch (error) {
      // Don't throw - logging should not break the main flow
      logger.error('Failed to log AI request', {
        error: error instanceof Error ? error.message : String(error),
        model: data.model,
        provider: data.provider,
      });
    }
  }

  /**
   * Get logs với filters
   * WHY: SP-Admin xem logs với filters
   */
  async getLogs(options: {
    tenantId?: string;
    provider?: string;
    model?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<{
      id: string;
      tenantId: string | null;
      userId: string | null;
      conversationId: string | null;
      chatbotId: string | null;
      provider: string;
      model: string;
      requestUrl: string | null;
      requestMethod: string;
      statusCode: number | null;
      responseTime: number | null;
      tokens: {
        prompt: number;
        completion: number;
        total: number;
      } | null;
      cost: number | null;
      modelRatio: number | null;
      outputRatio: number | null;
      cacheRatio: number | null;
      cacheCreationRatio: number | null;
      groupRatio: number | null;
      promptPrice: number | null;
      completionPrice: number | null;
      cachePrice: number | null;
      cacheCreationPrice: number | null;
      ipAddress: string | null;
      userAgent: string | null;
      error: string | null;
      createdAt: Date;
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

    if (options.tenantId) {
      where.tenantId = options.tenantId;
    }

    if (options.provider) {
      where.provider = options.provider;
    }

    if (options.model) {
      where.model = options.model;
    }

    if (options.ipAddress) {
      where.ipAddress = options.ipAddress;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prismaWithAIRequestLog.aIRequestLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaWithAIRequestLog.aIRequestLog.count({ where }),
    ]);

    return {
      data: logs.map((log: any) => ({
        id: log.id,
        tenantId: log.tenantId,
        userId: log.userId,
        conversationId: log.conversationId,
        chatbotId: log.chatbotId,
        provider: log.provider,
        model: log.model,
        requestUrl: log.requestUrl,
        requestMethod: log.requestMethod,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        tokens: log.tokens as any,
        cost: log.cost ? Number(log.cost) : null,
        modelRatio: log.modelRatio ? Number(log.modelRatio) : null,
        outputRatio: log.outputRatio ? Number(log.outputRatio) : null,
        cacheRatio: log.cacheRatio ? Number(log.cacheRatio) : null,
        cacheCreationRatio: log.cacheCreationRatio ? Number(log.cacheCreationRatio) : null,
        groupRatio: log.groupRatio ? Number(log.groupRatio) : null,
        promptPrice: log.promptPrice ? Number(log.promptPrice) : null,
        completionPrice: log.completionPrice ? Number(log.completionPrice) : null,
        cachePrice: log.cachePrice ? Number(log.cachePrice) : null,
        cacheCreationPrice: log.cacheCreationPrice ? Number(log.cacheCreationPrice) : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        error: log.error,
        createdAt: log.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get suspicious IPs (IPs gọi AI liên tục)
   * WHY: Monitor abuse và rate limiting
   */
  async getSuspiciousIPs(options: {
    threshold?: number; // Requests per minute
    startDate?: Date;
    endDate?: Date;
  }): Promise<
    Array<{
      ipAddress: string;
      requestCount: number;
      totalCost: number;
      lastRequestAt: Date;
    }>
  > {
    const threshold = options.threshold || 100; // Default: 100 requests/minute
    const startDate = options.startDate || new Date(Date.now() - 60 * 60 * 1000); // Last hour
    const endDate = options.endDate || new Date();

    // Get IPs với request count trong time window
    const ipStats = await prismaWithAIRequestLog.aIRequestLog.groupBy({
      by: ['ipAddress'],
      where: {
        ipAddress: { not: null },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        cost: true,
      },
      _max: {
        createdAt: true,
      },
    });

    // Filter IPs vượt threshold
    const suspiciousIPs = ipStats
      .filter((stat: any) => {
        const requestCount = stat._count.id;
        const minutes = (endDate.getTime() - startDate.getTime()) / (60 * 1000);
        const requestsPerMinute = requestCount / minutes;
        return requestsPerMinute >= threshold;
      })
      .map((stat: any) => ({
        ipAddress: stat.ipAddress!,
        requestCount: stat._count.id,
        totalCost: stat._sum.cost ? Number(stat._sum.cost) : 0,
        lastRequestAt: stat._max.createdAt!,
      }))
      .sort((a: any, b: any) => b.requestCount - a.requestCount);

    return suspiciousIPs;
  }
}

// Export singleton instance
export const aiRequestLogService = new AIRequestLogService();

