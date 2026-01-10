/**
 * Analytics Service
 * 
 * WHY: SP-Admin analytics - system-wide metrics và insights
 * - Revenue analytics
 * - AI usage analytics
 * - Platform distribution
 * - Growth trends
 * - System health
 * - Top lists
 */

import { prisma } from '../../infrastructure/database';
import type { PrismaClient } from '@prisma/client';

// Type assertion để fix TypeScript language server cache issue
const prismaWithAnalytics = prisma as PrismaClient & {
  aIRequestLog: {
    findMany: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
    groupBy: (args: any) => Promise<any>;
    aggregate: (args: any) => Promise<any>;
  };
  accessLog: {
    findMany: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
};

/**
 * Calculate percentage change
 */
function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get date range for period
 */
function getPeriodDateRange(
  period: 'day' | 'week' | 'month',
  endDate: Date = new Date()
): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (period) {
    case 'day':
      start = new Date(end);
      start.setHours(0, 0, 0, 0);
      previousEnd = new Date(start);
      previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      previousEnd = new Date(start);
      previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - 6);
      previousStart.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(end);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      previousEnd = new Date(start);
      previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setDate(1);
      previousStart.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end, previousStart, previousEnd };
}

/**
 * Analytics Service
 */
export class AnalyticsService {
  /**
   * Get overview metrics
   * WHY: Dashboard overview cards với key metrics
   */
  async getOverview(options: {
    startDate?: Date;
    endDate?: Date;
    period?: 'day' | 'week' | 'month';
    compareWithPrevious?: boolean;
  }) {
    const period = options.period || 'month';
    const compareWithPrevious = options.compareWithPrevious ?? true;

    const { start, end, previousStart, previousEnd } = options.startDate && options.endDate
      ? {
          start: options.startDate,
          end: options.endDate,
          previousStart: new Date(options.startDate.getTime() - (options.endDate.getTime() - options.startDate.getTime())),
          previousEnd: new Date(options.startDate.getTime() - 1),
        }
      : getPeriodDateRange(period);

    // Revenue (from Payment model - completed payments)
    const [currentRevenue, previousRevenue] = await Promise.all([
      prismaWithAnalytics.payment.aggregate({
        where: {
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      compareWithPrevious
        ? prismaWithAnalytics.payment.aggregate({
            where: {
              status: 'completed',
              createdAt: { gte: previousStart, lte: previousEnd },
            },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: null } }),
    ]);

    // Credit Spent (from CreditTransaction - negative amounts = debit)
    const [currentCreditSpent, previousCreditSpent] = await Promise.all([
      prismaWithAnalytics.creditTransaction.aggregate({
        where: {
          amount: { lt: 0 }, // Negative amounts are debits
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      compareWithPrevious
        ? prismaWithAnalytics.creditTransaction.aggregate({
            where: {
              amount: { lt: 0 },
              createdAt: { gte: previousStart, lte: previousEnd },
            },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: null } }),
    ]);

    // Tenants
    const [totalTenants, activeTenants, newTenants, previousNewTenants] = await Promise.all([
      prismaWithAnalytics.tenant.count(),
      prismaWithAnalytics.tenant.count({
        where: { isActive: true },
      }),
      prismaWithAnalytics.tenant.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      compareWithPrevious
        ? prismaWithAnalytics.tenant.count({
            where: { createdAt: { gte: previousStart, lte: previousEnd } },
          })
        : Promise.resolve(0),
    ]);

    // AI Requests
    const [currentAIRequests, previousAIRequests] = await Promise.all([
      prismaWithAnalytics.aIRequestLog.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      compareWithPrevious
        ? prismaWithAnalytics.aIRequestLog.count({
            where: { createdAt: { gte: previousStart, lte: previousEnd } },
          })
        : Promise.resolve(0),
    ]);

    // Tokens
    const [currentTokens, previousTokens] = await Promise.all([
      prismaWithAnalytics.aIRequestLog.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          tokens: { not: null },
        },
        select: { tokens: true },
      }),
      compareWithPrevious
        ? prismaWithAnalytics.aIRequestLog.findMany({
            where: {
              createdAt: { gte: previousStart, lte: previousEnd },
              tokens: { not: null },
            },
            select: { tokens: true },
          })
        : Promise.resolve([]),
    ]);

    const currentTokenStats = currentTokens.reduce(
      (acc: { prompt: number; completion: number; total: number }, log: any) => {
        const tokens = log.tokens as any;
        if (tokens) {
          acc.prompt += tokens.prompt || 0;
          acc.completion += tokens.completion || 0;
          acc.total += tokens.total || 0;
        }
        return acc;
      },
      { prompt: 0, completion: 0, total: 0 }
    );

    const previousTokenStats = previousTokens.reduce(
      (acc: { prompt: number; completion: number; total: number }, log: any) => {
        const tokens = log.tokens as any;
        if (tokens) {
          acc.prompt += tokens.prompt || 0;
          acc.completion += tokens.completion || 0;
          acc.total += tokens.total || 0;
        }
        return acc;
      },
      { prompt: 0, completion: 0, total: 0 }
    );

    // Performance metrics (from AIRequestLog responseTime)
    const performanceLogs = await prismaWithAnalytics.aIRequestLog.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        responseTime: { not: null },
      },
      select: { responseTime: true, statusCode: true },
    });

    const responseTimes = performanceLogs
      .map((log: any) => log.responseTime!)
      .filter((rt: number) => rt > 0)
      .sort((a: number, b: number) => a - b);

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
      : 0;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;

    const errorCount = performanceLogs.filter((log: any) => log.statusCode && log.statusCode >= 400).length;
    const successCount = performanceLogs.filter((log: any) => log.statusCode && log.statusCode >= 200 && log.statusCode < 400).length;
    const totalRequests = performanceLogs.length;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;
    const successRate = totalRequests > 0 ? successCount / totalRequests : 0;

    // System health (simplified - can be enhanced with actual metrics)
    const apiRequestRate = await prismaWithAnalytics.accessLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 1000) }, // Last minute
      },
    });

    const revenueTotal = currentRevenue._sum.amount || 0;
    const previousRevenueTotal = previousRevenue._sum.amount || 0;
    const creditSpentTotal = Math.abs(currentCreditSpent._sum?.amount || 0); // Use absolute value for debit
    const previousCreditSpentTotal = Math.abs(previousCreditSpent._sum?.amount || 0);

    return {
      revenue: {
        total: revenueTotal,
        ...(compareWithPrevious && {
          previousPeriod: previousRevenueTotal,
          changePercent: calculateChangePercent(revenueTotal, previousRevenueTotal),
        }),
      },
      creditSpent: {
        total: creditSpentTotal,
        ...(compareWithPrevious && {
          previousPeriod: previousCreditSpentTotal,
          changePercent: calculateChangePercent(creditSpentTotal, previousCreditSpentTotal),
        }),
      },
      tenants: {
        total: totalTenants,
        active: activeTenants,
        new: newTenants,
        ...(compareWithPrevious && {
          previousPeriod: previousNewTenants,
          changePercent: calculateChangePercent(newTenants, previousNewTenants),
        }),
      },
      aiRequests: {
        total: currentAIRequests,
        ...(compareWithPrevious && {
          previousPeriod: previousAIRequests,
          changePercent: calculateChangePercent(currentAIRequests, previousAIRequests),
        }),
      },
      tokens: {
        total: currentTokenStats.total,
        prompt: currentTokenStats.prompt,
        completion: currentTokenStats.completion,
        ...(compareWithPrevious && {
          previousPeriod: previousTokenStats.total,
          changePercent: calculateChangePercent(currentTokenStats.total, previousTokenStats.total),
        }),
      },
      performance: {
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime,
        p99ResponseTime,
        errorRate,
        successRate,
      },
      systemHealth: {
        uptime: 100, // TODO: Calculate actual uptime
        apiRequestRate,
        cacheHitRate: 0, // TODO: Get from cache service
      },
    };
  }

  /**
   * Get growth trends
   * WHY: Time-series data cho growth charts
   */
  async getGrowth(options: {
    startDate: Date;
    endDate: Date;
    metric: 'users' | 'tenants' | 'revenue' | 'ai_requests' | 'tokens';
    interval: 'hour' | 'day' | 'week' | 'month';
  }) {
    const { startDate, endDate, metric, interval } = options;

    // Calculate interval in milliseconds
    const intervalMs: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const intervalDuration = intervalMs[interval] || intervalMs.day;
    const data: Array<{ date: string; value: number }> = [];

    let current = new Date(startDate);

    while (current <= endDate) {
      const intervalStart = new Date(current);
      const intervalEnd = new Date(Math.min(current.getTime() + intervalDuration, endDate.getTime()));

      let value = 0;

      switch (metric) {
        case 'users':
          value = await prismaWithAnalytics.user.count({
            where: { createdAt: { gte: intervalStart, lte: intervalEnd } },
          });
          break;
        case 'tenants':
          value = await prismaWithAnalytics.tenant.count({
            where: { createdAt: { gte: intervalStart, lte: intervalEnd } },
          });
          break;
        case 'revenue':
          const revenueResult = await prismaWithAnalytics.payment.aggregate({
            where: {
              status: 'completed',
              createdAt: { gte: intervalStart, lte: intervalEnd },
            },
            _sum: { amount: true },
          });
          value = revenueResult._sum.amount || 0;
          break;
        case 'ai_requests':
          value = await prismaWithAnalytics.aIRequestLog.count({
            where: { createdAt: { gte: intervalStart, lte: intervalEnd } },
          });
          break;
        case 'tokens':
          const tokenLogs = await prismaWithAnalytics.aIRequestLog.findMany({
            where: {
              createdAt: { gte: intervalStart, lte: intervalEnd },
              tokens: { not: null },
            },
            select: { tokens: true },
          });
          value = tokenLogs.reduce((sum: number, log: any) => {
            const tokens = log.tokens as any;
            return sum + (tokens?.total || 0);
          }, 0);
          break;
      }

      data.push({
        date: intervalStart.toISOString(),
        value,
      });

      current = new Date(intervalEnd.getTime() + 1);
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const average = data.length > 0 ? total / data.length : 0;
    const firstValue = data[0]?.value || 0;
    const lastValue = data[data.length - 1]?.value || 0;
    const growth = firstValue > 0 ? calculateChangePercent(lastValue, firstValue) : 0;

    return {
      data,
      summary: {
        total,
        average: Math.round(average),
        growth,
      },
    };
  }

  /**
   * Get revenue analytics
   * WHY: Revenue breakdown by period, tenant, payment method
   */
  async getRevenue(options: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'day' | 'week' | 'month' | 'tenant';
    limit?: number;
  }) {
    const { startDate, endDate, groupBy = 'day', limit = 10 } = options;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Total revenue
    const totalResult = await prismaWithAnalytics.payment.aggregate({
      where: {
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const timeline: Array<{ period: string; revenue: number; transactions: number }> = [];
    const byTenant: Array<{ tenantId: string; tenantName: string; revenue: number; transactions: number }> = [];
    const byPaymentMethod: Array<{ method: string; revenue: number; count: number }> = [];

    if (groupBy === 'tenant') {
      // Group by tenant
      const tenantPayments = await prismaWithAnalytics.payment.groupBy({
        by: ['tenantId'],
        where: {
          status: 'completed',
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: limit,
      });

      const tenantIds = tenantPayments.map((tp) => tp.tenantId);
      const tenants = await prismaWithAnalytics.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true },
      });

      const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

      for (const tp of tenantPayments) {
        byTenant.push({
          tenantId: tp.tenantId,
          tenantName: tenantMap.get(tp.tenantId) || 'Unknown',
          revenue: tp._sum.amount || 0,
          transactions: tp._count.id,
        });
      }
    } else {
      // Group by time period
      const intervalMs: Record<string, number> = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };

      const intervalDuration = intervalMs[groupBy] || intervalMs.day;
      let current = new Date(start);

      while (current <= end) {
        const intervalStart = new Date(current);
        const intervalEnd = new Date(Math.min(current.getTime() + intervalDuration, end.getTime()));

        const periodResult = await prismaWithAnalytics.payment.aggregate({
          where: {
            status: 'completed',
            createdAt: { gte: intervalStart, lte: intervalEnd },
          },
          _sum: { amount: true },
          _count: { id: true },
        });

        timeline.push({
          period: intervalStart.toISOString().split('T')[0],
          revenue: periodResult._sum.amount || 0,
          transactions: periodResult._count.id,
        });

        current = new Date(intervalEnd.getTime() + 1);
      }
    }

    // For now, all payments are via Sepay (can be enhanced with PaymentRecord)
    byPaymentMethod.push({
      method: 'sepay',
      revenue: totalResult._sum.amount || 0,
      count: totalResult._count.id,
    });

    return {
      timeline,
      ...(groupBy === 'tenant' && byTenant.length > 0 && { byTenant }),
      byPaymentMethod,
      total: {
        revenue: totalResult._sum.amount || 0,
        transactions: totalResult._count.id,
      },
    };
  }

  /**
   * Get AI usage analytics
   * WHY: AI usage breakdown by provider, model, hour
   */
  async getAIUsage(options: {
    startDate?: Date;
    endDate?: Date;
    groupBy?: 'provider' | 'model' | 'hour' | 'day';
    tenantId?: string;
  }) {
    const { startDate, endDate, groupBy = 'provider', tenantId } = options;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const where: any = {
      createdAt: { gte: start, lte: end },
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Get all logs for aggregation
    const logs = await prismaWithAnalytics.aIRequestLog.findMany({
      where,
      select: {
        provider: true,
        model: true,
        tokens: true,
        cost: true,
        responseTime: true,
        createdAt: true,
      },
    });

    // Aggregate by provider
    const byProviderMap = new Map<string, {
      requests: number;
      tokens: { prompt: number; completion: number; total: number };
      cost: number;
    }>();

    // Aggregate by model
    const byModelMap = new Map<string, {
      provider: string;
      requests: number;
      tokens: { prompt: number; completion: number; total: number };
      cost: number;
    }>();

    // Aggregate by hour
    const byHourMap = new Map<number, { requests: number; responseTimes: number[] }>();

    for (const log of logs) {
      const tokens = log.tokens as any;
      const prompt = tokens?.prompt || 0;
      const completion = tokens?.completion || 0;
      const total = tokens?.total || 0;
      const cost = log.cost ? Number(log.cost) : 0;

      // By provider
      const providerData = byProviderMap.get(log.provider) || {
        requests: 0,
        tokens: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
      };
      providerData.requests++;
      providerData.tokens.prompt += prompt;
      providerData.tokens.completion += completion;
      providerData.tokens.total += total;
      providerData.cost += cost;
      byProviderMap.set(log.provider, providerData);

      // By model
      const modelKey = `${log.provider}:${log.model}`;
      const modelData = byModelMap.get(modelKey) || {
        provider: log.provider,
        requests: 0,
        tokens: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
      };
      modelData.requests++;
      modelData.tokens.prompt += prompt;
      modelData.tokens.completion += completion;
      modelData.tokens.total += total;
      modelData.cost += cost;
      byModelMap.set(modelKey, modelData);

      // By hour
      const hour = new Date(log.createdAt).getHours();
      const hourData = byHourMap.get(hour) || { requests: 0, responseTimes: [] };
      hourData.requests++;
      if (log.responseTime) {
        hourData.responseTimes.push(log.responseTime);
      }
      byHourMap.set(hour, hourData);
    }

    const byProvider = Array.from(byProviderMap.entries()).map(([provider, data]) => ({
      provider,
      ...data,
    }));

    const byModel = Array.from(byModelMap.entries()).map(([modelKey, data]) => ({
      model: modelKey.split(':')[1],
      ...data,
    }));

    const byHour = Array.from(byHourMap.entries())
      .map(([hour, data]) => ({
        hour,
        requests: data.requests,
        avgResponseTime: data.responseTimes.length > 0
          ? Math.round(data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length)
          : 0,
      }))
      .sort((a, b) => a.hour - b.hour);

    const totalRequests = logs.length;
    const totalTokens = logs.reduce((sum: number, log: any) => {
      const tokens = log.tokens as any;
      return sum + (tokens?.total || 0);
    }, 0);
    const totalCost = logs.reduce((sum: number, log: any) => sum + (log.cost ? Number(log.cost) : 0), 0);
    const responseTimes = logs.filter((log: any) => log.responseTime).map((log: any) => log.responseTime!);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
      : 0;

    return {
      byProvider,
      byModel,
      ...(groupBy === 'hour' && { byHour }),
      summary: {
        totalRequests,
        totalTokens,
        totalCost,
        avgResponseTime,
      },
    };
  }

  /**
   * Get platform distribution
   * WHY: Platform usage analytics
   */
  async getPlatforms(options: {
    startDate?: Date;
    endDate?: Date;
    metric?: 'conversations' | 'messages' | 'active_users';
  }) {
    const { startDate, endDate } = options;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Get conversations grouped by platform
    const conversationsByPlatform = await prismaWithAnalytics.conversation.groupBy({
      by: ['platform'],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: { id: true },
    });

    // Get messages grouped by platform (via conversation)
    const conversations = await prismaWithAnalytics.conversation.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: { id: true, platform: true },
    });

    const conversationIds = conversations.map((c) => c.id);
    const platformMap = new Map(conversations.map((c) => [c.id, c.platform]));

    const messages = await prismaWithAnalytics.message.findMany({
      where: {
        conversationId: { in: conversationIds },
      },
      select: { conversationId: true },
    });

    const messagesByPlatform = new Map<string, number>();
    for (const message of messages) {
      const platform = platformMap.get(message.conversationId) || 'unknown';
      messagesByPlatform.set(platform, (messagesByPlatform.get(platform) || 0) + 1);
    }

    // Active users (unique chatIds per platform - representing unique customers)
    // Note: We count distinct chatIds, but Prisma groupBy doesn't support distinct count directly
    // So we'll count all conversations with chatId
    const activeUsersByPlatform = await prismaWithAnalytics.conversation.groupBy({
      by: ['platform'],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: { id: true }, // Count conversations as proxy for active users
    });

    const totalConversations = conversationsByPlatform.reduce((sum, item) => sum + item._count.id, 0);
    const totalMessages = Array.from(messagesByPlatform.values()).reduce((sum, count) => sum + count, 0);
    const totalActiveUsers = activeUsersByPlatform.reduce((sum: number, item: any) => sum + (item._count?.id || 0), 0);

    const distribution = conversationsByPlatform.map((item: any) => {
      const platform = item.platform || 'unknown';
      const conversations = item._count.id;
      const messages = messagesByPlatform.get(platform) || 0;
      const activeUsers = activeUsersByPlatform.find((p: any) => p.platform === platform)?._count?.id || 0;

      return {
        platform,
        conversations,
        messages,
        activeUsers,
        percentage: totalConversations > 0 ? (conversations / totalConversations) * 100 : 0,
      };
    });

    return {
      distribution,
      total: {
        conversations: totalConversations,
        messages: totalMessages,
        activeUsers: totalActiveUsers,
      },
    };
  }

  /**
   * Get top lists
   * WHY: Top tenants, users, chatbots by various metrics
   */
  async getTop(options: {
    type: 'tenants' | 'users' | 'chatbots';
    metric: 'revenue' | 'ai_requests' | 'conversations' | 'messages' | 'credit_spent';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const { type, metric, startDate, endDate, limit = 10 } = options;

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const items: Array<{
      id: string;
      name: string;
      value: number;
      change?: number;
      metadata?: Record<string, unknown>;
    }> = [];

    switch (type) {
      case 'tenants':
        if (metric === 'revenue') {
          const tenantPayments = await prismaWithAnalytics.payment.groupBy({
            by: ['tenantId'],
            where: {
              status: 'completed',
              createdAt: { gte: start, lte: end },
            },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: limit,
          });

          const tenantIds = tenantPayments.map((tp) => tp.tenantId);
          const tenants = await prismaWithAnalytics.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          });

          const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

          for (const tp of tenantPayments) {
            items.push({
              id: tp.tenantId,
              name: tenantMap.get(tp.tenantId) || 'Unknown',
              value: tp._sum.amount || 0,
            });
          }
        } else if (metric === 'ai_requests') {
          const tenantRequests = await prismaWithAnalytics.aIRequestLog.groupBy({
            by: ['tenantId'],
            where: {
              createdAt: { gte: start, lte: end },
              tenantId: { not: null },
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: limit,
          });

          const tenantIds = tenantRequests.map((tr: any) => tr.tenantId!).filter(Boolean);
          const tenants = await prismaWithAnalytics.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          });

          const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

          for (const tr of tenantRequests) {
            if (tr.tenantId) {
              items.push({
                id: tr.tenantId,
                name: tenantMap.get(tr.tenantId) || 'Unknown',
                value: tr._count.id,
              });
            }
          }
        } else if (metric === 'conversations') {
          const tenantConversations = await prismaWithAnalytics.conversation.groupBy({
            by: ['tenantId'],
            where: {
              createdAt: { gte: start, lte: end },
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: limit,
          });

          const tenantIds = tenantConversations.map((tc) => tc.tenantId);
          const tenants = await prismaWithAnalytics.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          });

          const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));

          for (const tc of tenantConversations) {
            items.push({
              id: tc.tenantId,
              name: tenantMap.get(tc.tenantId) || 'Unknown',
              value: tc._count.id,
            });
          }
        } else if (metric === 'credit_spent') {
          const tenantCredits = await prismaWithAnalytics.creditTransaction.groupBy({
            by: ['walletId'],
            where: {
              amount: { lt: 0 }, // Negative amounts are debits
              createdAt: { gte: start, lte: end },
            },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'asc' } }, // Ascending because amounts are negative
            take: limit,
          });

          const walletIds = tenantCredits.map((tc) => tc.walletId);
          const wallets = await prismaWithAnalytics.creditWallet.findMany({
            where: { id: { in: walletIds } },
            select: { id: true, tenantId: true },
          });

          const tenantIds = wallets.map((w) => w.tenantId);
          const tenants = await prismaWithAnalytics.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          });

          const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));
          const walletToTenant = new Map(wallets.map((w) => [w.id, w.tenantId]));

          for (const tc of tenantCredits) {
            const tenantId = walletToTenant.get(tc.walletId);
            if (tenantId) {
              items.push({
                id: tenantId,
                name: tenantMap.get(tenantId) || 'Unknown',
                value: Math.abs(tc._sum?.amount || 0), // Use absolute value for debit
              });
            }
          }
        }
        break;

      case 'users':
        if (metric === 'ai_requests') {
          const userRequests = await prismaWithAnalytics.aIRequestLog.groupBy({
            by: ['userId'],
            where: {
              createdAt: { gte: start, lte: end },
              userId: { not: null },
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: limit,
          });

          const userIds = userRequests.map((ur: any) => ur.userId!).filter(Boolean);
          const users = await prismaWithAnalytics.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
          });

          const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

          for (const ur of userRequests) {
            if (ur.userId) {
              items.push({
                id: ur.userId,
                name: userMap.get(ur.userId) || 'Unknown',
                value: ur._count.id,
              });
            }
          }
        } else if (metric === 'credit_spent') {
          // Users don't directly have credit transactions, skip for now
          // Can be enhanced if needed
        }
        break;

      case 'chatbots':
        if (metric === 'conversations') {
          const chatbotConversations = await prismaWithAnalytics.conversation.groupBy({
            by: ['chatbotId'],
            where: {
              createdAt: { gte: start, lte: end },
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: limit,
          });

          const chatbotIds = chatbotConversations.map((cc: any) => cc.chatbotId!).filter(Boolean);
          const chatbots = await prismaWithAnalytics.chatbot.findMany({
            where: { id: { in: chatbotIds } },
            select: { id: true, name: true },
          });

          const chatbotMap = new Map(chatbots.map((c) => [c.id, c.name]));

          for (const cc of chatbotConversations) {
            if (cc.chatbotId) {
              const count = (cc._count as any)?.id || 0;
              items.push({
                id: cc.chatbotId,
                name: chatbotMap.get(cc.chatbotId) || 'Unknown',
                value: count,
              });
            }
          }
        } else if (metric === 'messages') {
          const conversations = await prismaWithAnalytics.conversation.findMany({
            where: {
              createdAt: { gte: start, lte: end },
            },
            select: { id: true, chatbotId: true },
          });

          const chatbotMessageCounts = new Map<string, number>();
          const conversationIds = conversations.map((c) => c.id);
          const conversationToChatbot = new Map(conversations.map((c) => [c.id, c.chatbotId!]));

          const messages = await prismaWithAnalytics.message.findMany({
            where: { conversationId: { in: conversationIds } },
            select: { conversationId: true },
          });

          for (const message of messages) {
            const chatbotId = conversationToChatbot.get(message.conversationId);
            if (chatbotId) {
              chatbotMessageCounts.set(chatbotId, (chatbotMessageCounts.get(chatbotId) || 0) + 1);
            }
          }

          const chatbotIds = Array.from(chatbotMessageCounts.keys());
          const chatbots = await prismaWithAnalytics.chatbot.findMany({
            where: { id: { in: chatbotIds } },
            select: { id: true, name: true },
          });

          const chatbotMap = new Map(chatbots.map((c) => [c.id, c.name]));

          const sortedChatbots = Array.from(chatbotMessageCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);

          for (const [chatbotId, count] of sortedChatbots) {
            items.push({
              id: chatbotId,
              name: chatbotMap.get(chatbotId) || 'Unknown',
              value: count,
            });
          }
        } else if (metric === 'ai_requests') {
          const chatbotRequests = await prismaWithAnalytics.aIRequestLog.groupBy({
            by: ['chatbotId'],
            where: {
              createdAt: { gte: start, lte: end },
              chatbotId: { not: null },
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: limit,
          });

          const chatbotIds = chatbotRequests.map((cr: any) => cr.chatbotId!).filter(Boolean);
          const chatbots = await prismaWithAnalytics.chatbot.findMany({
            where: { id: { in: chatbotIds } },
            select: { id: true, name: true },
          });

          const chatbotMap = new Map(chatbots.map((c) => [c.id, c.name]));

          for (const cr of chatbotRequests) {
            if (cr.chatbotId) {
              items.push({
                id: cr.chatbotId,
                name: chatbotMap.get(cr.chatbotId) || 'Unknown',
                value: cr._count.id,
              });
            }
          }
        }
        break;
    }

    return { items };
  }

  /**
   * Get system health
   * WHY: System performance và infrastructure metrics
   */
  async getHealth(options: {
    startDate?: Date;
    endDate?: Date;
    interval?: 'hour' | 'day';
  }) {
    const { startDate, endDate, interval = 'hour' } = options;

    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const intervalMs: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    };

    const intervalDuration = intervalMs[interval] || intervalMs.hour;
    const performance: Array<{
      timestamp: string;
      avgResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      errorRate: number;
      successRate: number;
    }> = [];

    let current = new Date(start);

    while (current <= end) {
      const intervalStart = new Date(current);
      const intervalEnd = new Date(Math.min(current.getTime() + intervalDuration, end.getTime()));

      const logs = await prismaWithAnalytics.aIRequestLog.findMany({
        where: {
          createdAt: { gte: intervalStart, lte: intervalEnd },
        },
        select: { responseTime: true, statusCode: true },
      });

      const responseTimes = logs
        .map((log: any) => log.responseTime!)
        .filter((rt: number) => rt && rt > 0)
        .sort((a: number, b: number) => a - b);

      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
        : 0;

      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);
      const p95ResponseTime = responseTimes[p95Index] || 0;
      const p99ResponseTime = responseTimes[p99Index] || 0;

      const errorCount = logs.filter((log: any) => log.statusCode && log.statusCode >= 400).length;
      const successCount = logs.filter((log: any) => log.statusCode && log.statusCode >= 200 && log.statusCode < 400).length;
      const total = logs.length;
      const errorRate = total > 0 ? errorCount / total : 0;
      const successRate = total > 0 ? successCount / total : 0;

      performance.push({
        timestamp: intervalStart.toISOString(),
        avgResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        errorRate,
        successRate,
      });

      current = new Date(intervalEnd.getTime() + 1);
    }

    // Infrastructure metrics
    const recentAccessLogs = await prismaWithAnalytics.accessLog.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      select: { createdAt: true },
    });

    const apiRequestRate = recentAccessLogs.length; // requests per minute

    // Errors (from access logs)
    const errorLogs = await prismaWithAnalytics.accessLog.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        statusCode: { gte: 400 },
      },
      select: { statusCode: true, error: true, createdAt: true },
    });

    const errorTypes = new Map<string, { count: number; lastOccurred: Date }>();
    for (const log of errorLogs) {
      const type = log.statusCode?.toString() || 'unknown';
      const existing = errorTypes.get(type) || { count: 0, lastOccurred: log.createdAt };
      existing.count++;
      if (log.createdAt > existing.lastOccurred) {
        existing.lastOccurred = log.createdAt;
      }
      errorTypes.set(type, existing);
    }

    const errors = Array.from(errorTypes.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      lastOccurred: data.lastOccurred.toISOString(),
    }));

    return {
      performance,
      infrastructure: {
        apiRequestRate,
        databaseQueryTime: 0, // TODO: Get from actual query metrics
        cacheHitRate: 0, // TODO: Get from cache service
        proxyBalance: {
          remain: 0, // TODO: Get from proxy balance service
          used: 0,
          percentage: 0,
        },
      },
      errors,
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

