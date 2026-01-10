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
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

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

    const formattedResponse = formatSuccessResponse(
      result.data,
      200,
      'Access logs retrieved successfully',
      result.meta
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to list access logs', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to list access logs',
        500
      )
    );
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

    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'Suspicious IPs retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get suspicious IPs', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: request.query,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get suspicious IPs',
        500,
        error instanceof Error ? error.message : String(error)
      )
    );
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

    const formattedResponse = formatSuccessResponse(
      {
        ipAddress,
        ...stats,
        isBlacklisted,
        isWhitelisted,
      },
      200,
      'IP details retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get IP details', {
      error: error instanceof Error ? error.message : String(error),
      ipAddress: request.params.ipAddress,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get IP details',
        500
      )
    );
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

    const formattedResponse = formatSuccessResponse(
      result,
      201,
      'IP banned successfully'
    );
    return reply.status(201).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to ban IP from suspicious list', {
      error: error instanceof Error ? error.message : String(error),
      ipAddress: request.params.ipAddress,
    });

    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid request body',
          400,
          error.errors
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to ban IP',
        500
      )
    );
  }
}

