/**
 * Health Check Service
 * 
 * WHY: Monitor application health
 * - Database connectivity
 * - Redis connectivity
 * - External service status
 */

import { prisma } from './database';
import { redis } from './redis';
import { logger } from './logger';

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      usage: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
      };
      percentage: number;
    };
  };
}

/**
 * Perform health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const checks: HealthCheckResult['checks'] = {
    database: { status: 'unhealthy' },
    redis: { status: 'unhealthy' },
    memory: {
      status: 'unhealthy',
      usage: { heapUsed: 0, heapTotal: 0, rss: 0 },
      percentage: 0,
    },
  };

  // Check database
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Database health check failed:', error);
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    await redis.ping();
    checks.redis = {
      status: 'healthy',
      responseTime: Date.now() - redisStart,
    };
  } catch (error) {
    checks.redis = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Redis health check failed:', error);
  }

  // Check memory
  try {
    const memUsage = process.memoryUsage();
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const isHealthy = memPercentage < 90; // Alert if > 90% memory used

    checks.memory = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      usage: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
      },
      percentage: Math.round(memPercentage * 100) / 100,
    };

    if (!isHealthy) {
      logger.warn('High memory usage detected', {
        percentage: memPercentage,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
      });
    }
  } catch (error) {
    logger.error('Memory health check failed:', error);
  }

  // Determine overall status
  const allHealthy = Object.values(checks).every((check) => check.status === 'healthy');
  const anyUnhealthy = Object.values(checks).some((check) => check.status === 'unhealthy');

  const status: HealthCheckResult['status'] = allHealthy
    ? 'healthy'
    : anyUnhealthy
    ? 'unhealthy'
    : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    checks,
  };
}

