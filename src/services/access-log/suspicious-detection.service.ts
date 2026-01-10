/**
 * Suspicious IP Detection Service
 * 
 * WHY: Detect IPs có dấu hiệu spam/abuse dựa trên access patterns
 * - Analyze request patterns
 * - Calculate risk scores
 * - Provide ban recommendations
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import type { PrismaClient } from '@prisma/client';

// Type assertion để fix TypeScript language server cache issue
const prismaWithAccessLog = prisma as PrismaClient & {
  accessLog: {
    findMany: (args: any) => Promise<any>;
    groupBy: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
};

/**
 * Suspicious IP Detection Config
 */
interface DetectionConfig {
  // Request rate thresholds
  highRequestRate: number; // requests per minute
  veryHighRequestRate: number; // requests per minute
  
  // Error rate thresholds
  highErrorRate: number; // percentage (0-100)
  veryHighErrorRate: number; // percentage (0-100)
  
  // Failed auth threshold
  failedAuthThreshold: number; // count
  
  // Time window for analysis
  timeWindowMinutes: number;
}

const DEFAULT_CONFIG: DetectionConfig = {
  highRequestRate: 60, // 60 requests/minute
  veryHighRequestRate: 120, // 120 requests/minute
  highErrorRate: 30, // 30% errors
  veryHighErrorRate: 50, // 50% errors
  failedAuthThreshold: 5, // 5 failed auth attempts
  timeWindowMinutes: 60, // Last 60 minutes
};

/**
 * Suspicious IP Result
 */
export interface SuspiciousIP {
  ipAddress: string;
  riskScore: number; // 0-100
  requestCount: number;
  requestsPerMinute: number;
  errorRate: number; // percentage
  failedAuthCount: number;
  suspiciousFactors: string[];
  lastRequestAt: Date;
  recommendation: 'ban' | 'monitor' | 'safe';
}

/**
 * Check if AccessLog model is available
 * WHY: Detect if Prisma client has been regenerated after schema changes
 */
function checkAccessLogModelAvailable(): boolean {
  try {
    // Check if accessLog property exists on Prisma client
    // This is a synchronous check - no database call needed
    const prismaAny = prismaWithAccessLog as any;
    
    // Method 1: Check if property exists
    if (!prismaAny.accessLog) {
      return false;
    }
    
    // Method 2: Check if it's a function/object (Prisma model)
    if (typeof prismaAny.accessLog !== 'object' && typeof prismaAny.accessLog !== 'function') {
      return false;
    }
    
    // Method 3: Check if it has Prisma model methods
    if (!prismaAny.accessLog.findFirst && !prismaAny.accessLog.findMany) {
      return false;
    }
    
    return true;
  } catch (error: any) {
    // If any error occurs during check, assume model is not available
    logger.warn('Error checking AccessLog model availability', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Suspicious Detection Service
 */
export class SuspiciousDetectionService {
  /**
   * Detect suspicious IPs
   * WHY: Analyze access logs để tìm IPs có dấu hiệu spam
   */
  async detectSuspiciousIPs(options: {
    config?: Partial<DetectionConfig>;
    startDate?: Date;
    endDate?: Date;
    minRiskScore?: number; // Minimum risk score to include (default: 30)
  }): Promise<SuspiciousIP[]> {
    try {
      // Check if model is available first (synchronous check)
      const modelAvailable = checkAccessLogModelAvailable();
      if (!modelAvailable) {
        // WHY: Graceful degradation - return empty array instead of error
        // This allows API to work even if Prisma client not regenerated
        // Admin will see empty list and can check logs for warning
        logger.warn('AccessLog model not found in Prisma client - returning empty results', {
          hint: 'Run: npx prisma generate && npx prisma migrate deploy',
          action: 'Returning empty suspicious IPs list',
        });
        return [];
      }

      const config = { ...DEFAULT_CONFIG, ...options.config };
      const minRiskScore = options.minRiskScore || 30;
      
      const endDate = options.endDate || new Date();
      const startDate = options.startDate || new Date(endDate.getTime() - config.timeWindowMinutes * 60 * 1000);

      // Get IP statistics
      let ipStats: any[];
      try {
        ipStats = await prismaWithAccessLog.accessLog.groupBy({
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
          _max: {
            createdAt: true,
          },
        });
      } catch (error: any) {
        // Check if error is about missing model or table
        const errorMessage = (error?.message || '').toLowerCase();
        const errorCode = error?.code || '';
        
        // Prisma error codes and messages indicating missing model/table
        if (
          errorCode === 'P2001' || // Record not found (but could also mean table doesn't exist)
          errorCode === 'P2021' || // Table does not exist
          errorCode === 'P2022' || // Column does not exist
          errorMessage.includes('accesslog') ||
          errorMessage.includes('access_log') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('unknown model') ||
          errorMessage.includes('model') && errorMessage.includes('not found') ||
          errorMessage.includes('table') && errorMessage.includes('does not exist')
        ) {
          // WHY: Graceful degradation - return empty array instead of error
          logger.warn('AccessLog model/table not found - returning empty results', {
            error: error.message,
            errorCode: error.code,
            hint: 'Run: npx prisma generate && npx prisma migrate deploy',
            action: 'Returning empty suspicious IPs list',
          });
          return [];
        }
        
        // Re-throw other errors (database connection, etc.)
        logger.error('Unexpected error in detectSuspiciousIPs groupBy', {
          error: error.message,
          errorCode: error.code,
          stack: error.stack,
        });
        throw error;
      }

      // Analyze each IP
      const suspiciousIPs: SuspiciousIP[] = [];

      for (const stat of ipStats as any[]) {
        const ipAddress = stat.ipAddress!;
        const requestCount = stat._count.id;
        const minutes = (endDate.getTime() - startDate.getTime()) / (60 * 1000);
        const requestsPerMinute = requestCount / minutes;

        // Get detailed stats for this IP
        const details = await this.getIPDetails(ipAddress, { startDate, endDate });

        // Calculate risk score
        const riskScore = this.calculateRiskScore(details, config);

        // Skip if risk score too low
        if (riskScore < minRiskScore) {
          continue;
        }

        // Identify suspicious factors
        const suspiciousFactors = this.identifySuspiciousFactors(details, config);

        // Determine recommendation
        const recommendation = this.getRecommendation(riskScore, suspiciousFactors);

        suspiciousIPs.push({
          ipAddress,
          riskScore,
          requestCount,
          requestsPerMinute,
          errorRate: details.errorRate,
          failedAuthCount: details.failedAuthCount,
          suspiciousFactors,
          lastRequestAt: stat._max.createdAt!,
          recommendation,
        });
      }

      // Sort by risk score (highest first)
      return suspiciousIPs.sort((a, b) => b.riskScore - a.riskScore);
    } catch (error) {
      logger.error('Error in detectSuspiciousIPs', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        options,
      });
      throw error;
    }
  }

  /**
   * Get IP details for analysis
   */
  private async getIPDetails(
    ipAddress: string,
    options: { startDate: Date; endDate: Date }
  ): Promise<{
    totalRequests: number;
    successCount: number;
    errorCount: number;
    errorRate: number;
    failedAuthCount: number;
    methods: Record<string, number>;
    statusCodes: Record<string, number>;
    paths: string[];
  }> {
    // Check if model is available (synchronous check)
    const modelAvailable = checkAccessLogModelAvailable();
    if (!modelAvailable) {
      // WHY: Return default values instead of throwing
      // This allows the flow to continue even if model not available
      logger.warn('AccessLog model not available in getIPDetails - returning defaults', {
        ipAddress,
        hint: 'Run: npx prisma generate && npx prisma migrate deploy',
      });
      return {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        errorRate: 0,
        failedAuthCount: 0,
        methods: {},
        statusCodes: {},
        paths: [],
      };
    }

    const logs = await prismaWithAccessLog.accessLog.findMany({
      where: {
        ipAddress,
        createdAt: {
          gte: options.startDate,
          lte: options.endDate,
        },
      },
      select: {
        statusCode: true,
        method: true,
        path: true,
      },
    });

    const totalRequests = logs.length;
    const successCount = logs.filter((log: any) => log.statusCode && log.statusCode >= 200 && log.statusCode < 400).length;
    const errorCount = logs.filter((log: any) => log.statusCode && log.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // Count failed auth attempts (401, 403)
    const failedAuthCount = logs.filter((log: any) => 
      log.statusCode === 401 || log.statusCode === 403
    ).length;

    const methods: Record<string, number> = {};
    const statusCodes: Record<string, number> = {};
    const paths: string[] = [];

    logs.forEach((log: any) => {
      methods[log.method] = (methods[log.method] || 0) + 1;
      if (log.statusCode) {
        statusCodes[log.statusCode.toString()] = (statusCodes[log.statusCode.toString()] || 0) + 1;
      }
      paths.push(log.path);
    });

    return {
      totalRequests,
      successCount,
      errorCount,
      errorRate,
      failedAuthCount,
      methods,
      statusCodes,
      paths: [...new Set(paths)], // Unique paths
    };
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(
    details: Awaited<ReturnType<typeof this.getIPDetails>>,
    config: DetectionConfig
  ): number {
    let score = 0;

    // Factor 1: Request rate (40% weight)
    const requestsPerMinute = details.totalRequests / (config.timeWindowMinutes || 1);
    if (requestsPerMinute >= config.veryHighRequestRate) {
      score += 40; // Very high rate
    } else if (requestsPerMinute >= config.highRequestRate) {
      score += 25; // High rate
    } else if (requestsPerMinute >= config.highRequestRate * 0.5) {
      score += 10; // Moderate rate
    }

    // Factor 2: Error rate (30% weight)
    if (details.errorRate >= config.veryHighErrorRate) {
      score += 30; // Very high error rate
    } else if (details.errorRate >= config.highErrorRate) {
      score += 20; // High error rate
    } else if (details.errorRate >= config.highErrorRate * 0.5) {
      score += 10; // Moderate error rate
    }

    // Factor 3: Failed auth attempts (20% weight)
    if (details.failedAuthCount >= config.failedAuthThreshold * 2) {
      score += 20; // Many failed auth attempts
    } else if (details.failedAuthCount >= config.failedAuthThreshold) {
      score += 15; // Some failed auth attempts
    } else if (details.failedAuthCount > 0) {
      score += 5; // Few failed auth attempts
    }

    // Factor 4: Unusual patterns (10% weight)
    // Check for bot-like patterns
    const hasUnusualPatterns = this.hasUnusualPatterns(details);
    if (hasUnusualPatterns) {
      score += 10;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Check for unusual patterns
   */
  private hasUnusualPatterns(details: Awaited<ReturnType<typeof this.getIPDetails>>): boolean {
    // Check for many different paths (scanning behavior)
    if (details.paths.length > 20) {
      return true;
    }

    // Check for many 404s (probing)
    const notFoundCount = details.statusCodes['404'] || 0;
    if (notFoundCount > details.totalRequests * 0.5) {
      return true;
    }

    return false;
  }

  /**
   * Identify suspicious factors
   */
  private identifySuspiciousFactors(
    details: Awaited<ReturnType<typeof this.getIPDetails>>,
    config: DetectionConfig
  ): string[] {
    const factors: string[] = [];
    const requestsPerMinute = details.totalRequests / (config.timeWindowMinutes || 1);

    if (requestsPerMinute >= config.veryHighRequestRate) {
      factors.push('Very high request rate');
    } else if (requestsPerMinute >= config.highRequestRate) {
      factors.push('High request rate');
    }

    if (details.errorRate >= config.veryHighErrorRate) {
      factors.push('Very high error rate');
    } else if (details.errorRate >= config.highErrorRate) {
      factors.push('High error rate');
    }

    if (details.failedAuthCount >= config.failedAuthThreshold) {
      factors.push('Multiple failed auth attempts');
    }

    if (details.paths.length > 20) {
      factors.push('Scanning behavior (many paths)');
    }

    const notFoundCount = details.statusCodes['404'] || 0;
    if (notFoundCount > details.totalRequests * 0.5) {
      factors.push('High 404 rate (probing)');
    }

    return factors;
  }

  /**
   * Get recommendation based on risk score
   */
  private getRecommendation(
    riskScore: number,
    factors: string[]
  ): 'ban' | 'monitor' | 'safe' {
    if (riskScore >= 70 || factors.includes('Very high request rate') || factors.includes('Multiple failed auth attempts')) {
      return 'ban';
    }
    if (riskScore >= 50) {
      return 'monitor';
    }
    return 'safe';
  }
}

// Export singleton instance
export const suspiciousDetectionService = new SuspiciousDetectionService();

