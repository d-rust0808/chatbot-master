/**
 * Access Log Controller (SP-Admin only)
 * 
 * WHY: API handlers cho access logs và suspicious IP detection
 * - View access logs
 * - View suspicious IPs
 * - Get IP details
 * - Ban IP from suspicious list
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { accessLogService } from '../../services/access-log/access-log.service';
import { suspiciousDetectionService } from '../../services/access-log/suspicious-detection.service';
import { ipManagementService } from '../../services/ip-management/ip-management.service';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest } from '../../types/auth';

/**
 * Get access logs query schema
 */
const getAccessLogsSchema = z.object({
  ipAddress: z.string().optional(),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
  statusCode: z.string().transform(Number).pipe(z.number().int()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('50'),
});

/**
 * Get suspicious IPs query schema
 */
const getSuspiciousIPsSchema = z.object({
  minRiskScore: z.string().transform(Number).pipe(z.number().int().min(0).max(100)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * List access logs
 * GET /sp-admin/access-logs
 */
export async function listAccessLogsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getAccessLogsSchema.parse(request.query);

    const result = await accessLogService.getLogs({
      ipAddress: query.ipAddress,
      tenantId: query.tenantId,
      userId: query.userId,
      method: query.method,
      path: query.path,
      statusCode: query.statusCode,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });

    return reply.status(200).send({
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    logger.error('Failed to list access logs', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to list access logs',
      },
    });
  }
}

/**
 * Get suspicious IPs
 * GET /sp-admin/access-logs/suspicious
 */
export async function getSuspiciousIPsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getSuspiciousIPsSchema.parse(request.query);

    const result = await suspiciousDetectionService.detectSuspiciousIPs({
      minRiskScore: query.minRiskScore,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    return reply.status(200).send({
      data: result,
    });
  } catch (error) {
    logger.error('Failed to get suspicious IPs', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to get suspicious IPs',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

/**
 * Get IP details
 * GET /sp-admin/access-logs/ip/:ipAddress
 */
export async function getIPDetailsHandler(
  request: FastifyRequest<{ Params: { ipAddress: string } }>,
  reply: FastifyReply
) {
  try {
    const { ipAddress } = request.params;
    const query = z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }).parse(request.query);

    const stats = await accessLogService.getIPStats(ipAddress, {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    // Check if IP is blacklisted/whitelisted
    const isBlacklisted = await ipManagementService.isIPBlacklisted(ipAddress);
    const isWhitelisted = await ipManagementService.isIPWhitelisted(ipAddress);

    return reply.status(200).send({
      data: {
        ipAddress,
        ...stats,
        isBlacklisted,
        isWhitelisted,
      },
    });
  } catch (error) {
    logger.error('Failed to get IP details', {
      error: error instanceof Error ? error.message : String(error),
      ipAddress: request.params.ipAddress,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to get IP details',
      },
    });
  }
}

/**
 * Ban IP from suspicious list
 * POST /sp-admin/access-logs/ip/:ipAddress/ban
 */
export async function banIPFromSuspiciousHandler(
  request: FastifyRequest<{ Params: { ipAddress: string } }>,
  reply: FastifyReply
) {
  try {
    const { ipAddress } = request.params;
    const body = z.object({
      reason: z.string().optional(),
      expiresAt: z.string().datetime().optional(),
    }).parse(request.body);

    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;

    // Get suspicious IP details để có reason mặc định
    const suspiciousIPs = await suspiciousDetectionService.detectSuspiciousIPs({
      minRiskScore: 30,
    });
    const suspiciousIP = suspiciousIPs.find((ip) => ip.ipAddress === ipAddress);

    const reason = body.reason || 
      (suspiciousIP 
        ? `Suspicious activity detected: ${suspiciousIP.suspiciousFactors.join(', ')}`
        : 'Banned from suspicious IPs list');

    const result = await ipManagementService.banIP({
      ipAddress,
      reason,
      bannedBy: userId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    return reply.status(201).send({
      data: result,
      message: 'IP banned successfully',
    });
  } catch (error) {
    logger.error('Failed to ban IP from suspicious list', {
      error: error instanceof Error ? error.message : String(error),
      ipAddress: request.params.ipAddress,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid request body',
          details: error.errors,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to ban IP',
      },
    });
  }
}

