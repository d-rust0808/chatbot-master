/**
 * Access Log Service
 * 
 * WHY: Log tất cả HTTP requests để track IP access patterns
 * - Track IP addresses và request patterns
 * - Detect suspicious activity
 * - Support SP-Admin monitoring
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import type { PrismaClient } from '@prisma/client';

// Type assertion để fix TypeScript language server cache issue
const prismaWithAccessLog = prisma as PrismaClient & {
  accessLog: {
    create: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
    groupBy: (args: any) => Promise<any>;
  };
};

/**
 * Access Log Data
 */
export interface AccessLogData {
  ipAddress: string;
  method: string;
  url: string;
  path: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  referer?: string;
  tenantId?: string;
  userId?: string;
  requestBody?: unknown;
  error?: string;
}

/**
 * Access Log Service
 */
export class AccessLogService {
  /**
   * Log HTTP request
   * WHY: Track mọi request để analyze patterns
   * NOTE: Async, non-blocking - không throw errors
   */
  async logRequest(data: AccessLogData): Promise<void> {
    try {
      // Fire and forget - không block request
      setImmediate(async () => {
        try {
          await prismaWithAccessLog.accessLog.create({
            data: {
              ipAddress: data.ipAddress,
              method: data.method,
              url: data.url.length > 2000 ? data.url.substring(0, 2000) : data.url, // Truncate long URLs
              path: data.path.length > 500 ? data.path.substring(0, 500) : data.path, // Truncate long paths
              statusCode: data.statusCode || null,
              responseTime: data.responseTime || null,
              userAgent: data.userAgent ? (data.userAgent.length > 500 ? data.userAgent.substring(0, 500) : data.userAgent) : null,
              referer: data.referer ? (data.referer.length > 500 ? data.referer.substring(0, 500) : data.referer) : null,
              tenantId: data.tenantId || null,
              userId: data.userId || null,
              requestBody: data.requestBody as any,
              error: data.error ? (data.error.length > 1000 ? data.error.substring(0, 1000) : data.error) : null,
            },
          });
        } catch (error) {
          // Log error nhưng không throw - logging không được break request flow
          logger.error('Failed to log access request', {
            error: error instanceof Error ? error.message : String(error),
            ipAddress: data.ipAddress,
            path: data.path,
          });
        }
      });
    } catch (error) {
      // Outer catch - should never happen, but just in case
      logger.error('Failed to schedule access log', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get access logs với filters
   * WHY: SP-Admin xem logs với filters
   */
  async getLogs(options: {
    ipAddress?: string;
    tenantId?: string;
    userId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<{
      id: string;
      ipAddress: string;
      method: string;
      url: string;
      path: string;
      statusCode: number | null;
      responseTime: number | null;
      userAgent: string | null;
      referer: string | null;
      tenantId: string | null;
      userId: string | null;
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

    if (options.ipAddress) {
      where.ipAddress = options.ipAddress;
    }

    if (options.tenantId) {
      where.tenantId = options.tenantId;
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.method) {
      where.method = options.method;
    }

    if (options.path) {
      where.path = { contains: options.path };
    }

    if (options.statusCode) {
      where.statusCode = options.statusCode;
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

    let logs: any[] = [];
    let total = 0;

    try {
      [logs, total] = await Promise.all([
        prismaWithAccessLog.accessLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prismaWithAccessLog.accessLog.count({ where }),
      ]);
    } catch (error: any) {
      // WHY: Graceful degradation - if model/table not available, return empty results
      const errorMessage = (error?.message || '').toLowerCase();
      const errorCode = error?.code || '';
      
      if (
        errorCode === 'P2021' || // Table does not exist
        errorCode === 'P2022' || // Column does not exist
        errorMessage.includes('accesslog') ||
        errorMessage.includes('access_log') ||
        errorMessage.includes('does not exist') ||
        errorMessage.includes('unknown model')
      ) {
        logger.warn('AccessLog model/table not found in getLogs - returning empty results', {
          hint: 'Run: npx prisma generate && npx prisma migrate deploy',
        });
        // Return empty results instead of throwing
        logs = [];
        total = 0;
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    return {
      data: logs.map((log: any) => ({
        id: log.id,
        ipAddress: log.ipAddress,
        method: log.method,
        url: log.url,
        path: log.path,
        statusCode: log.statusCode,
        responseTime: log.responseTime,
        userAgent: log.userAgent,
        referer: log.referer,
        tenantId: log.tenantId,
        userId: log.userId,
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
   * Get IP statistics
   * WHY: Analyze IP access patterns
   */
  async getIPStats(ipAddress: string, options: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalRequests: number;
    successCount: number;
    errorCount: number;
    avgResponseTime: number;
    methods: Record<string, number>;
    statusCodes: Record<string, number>;
    paths: Array<{ path: string; count: number }>;
    lastRequestAt: Date | null;
  }> {
    const startDate = options.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24h
    const endDate = options.endDate || new Date();

    const where = {
      ipAddress,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const [logs, total] = await Promise.all([
      prismaWithAccessLog.accessLog.findMany({
        where,
        select: {
          statusCode: true,
          responseTime: true,
          method: true,
          path: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prismaWithAccessLog.accessLog.count({ where }),
    ]);

    const successCount = logs.filter((log: any) => log.statusCode && log.statusCode >= 200 && log.statusCode < 400).length;
    const errorCount = logs.filter((log: any) => log.statusCode && log.statusCode >= 400).length;
    
    const responseTimes = logs.filter((log: any) => log.responseTime !== null).map((log: any) => log.responseTime);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
      : 0;

    const methods: Record<string, number> = {};
    const statusCodes: Record<string, number> = {};
    const pathCounts: Record<string, number> = {};

    logs.forEach((log: any) => {
      methods[log.method] = (methods[log.method] || 0) + 1;
      if (log.statusCode) {
        statusCodes[log.statusCode.toString()] = (statusCodes[log.statusCode.toString()] || 0) + 1;
      }
      pathCounts[log.path] = (pathCounts[log.path] || 0) + 1;
    });

    const paths = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 paths

    return {
      totalRequests: total,
      successCount,
      errorCount,
      avgResponseTime,
      methods,
      statusCodes,
      paths,
      lastRequestAt: logs.length > 0 ? (logs[0] as any).createdAt : null,
    };
  }
}

// Export singleton instance
export const accessLogService = new AccessLogService();

