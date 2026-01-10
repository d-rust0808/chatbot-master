/**
 * IP Management Controller (SP-Admin only)
 * 
 * WHY: API handlers cho IP blacklist/whitelist management
 * - Ban/unban IPs
 * - Whitelist IPs
 * - View blacklist/whitelist
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ipManagementService } from '../../services/ip-management/ip-management.service';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest } from '../../types/auth';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

/**
 * Add to blacklist schema
 */
const addToBlacklistSchema = z.object({
  ipAddress: z.string().min(1, 'IP address is required'),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * Add to whitelist schema
 */
const addToWhitelistSchema = z.object({
  ipAddress: z.string().min(1, 'IP address is required'),
  reason: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * Get blacklist query schema
 */
const getBlacklistSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('50'),
  isActive: z.string().transform((val) => val === 'true').optional(),
});

/**
 * Get whitelist query schema
 */
const getWhitelistSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('50'),
  isActive: z.string().transform((val) => val === 'true').optional(),
});

/**
 * Toggle status schema
 */
const toggleStatusSchema = z.object({
  isActive: z.boolean(),
});

/**
 * Add IP to blacklist
 * POST /sp-admin/ip-management/blacklist
 */
export async function addToBlacklistHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = addToBlacklistSchema.parse(request.body);
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;

    const result = await ipManagementService.addToBlacklist({
      ipAddress: body.ipAddress,
      reason: body.reason,
      bannedBy: userId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    const formattedResponse = formatSuccessResponse(
      result,
      201,
      'IP added to blacklist successfully'
    );
    return reply.status(201).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to add IP to blacklist', {
      error: error instanceof Error ? error.message : String(error),
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
        'Failed to add IP to blacklist',
        500
      )
    );
  }
}

/**
 * Remove IP from blacklist
 * DELETE /sp-admin/ip-management/blacklist/:ipAddress
 */
export async function removeFromBlacklistHandler(
  request: FastifyRequest<{ Params: { ipAddress: string } }>,
  reply: FastifyReply
) {
  try {
    const { ipAddress } = request.params;

    await ipManagementService.removeFromBlacklist(ipAddress);

    const formattedResponse = formatSuccessResponse(
      null,
      200,
      'IP removed from blacklist successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to remove IP from blacklist', {
      error: error instanceof Error ? error.message : String(error),
      ipAddress: request.params.ipAddress,
    });

    if (error instanceof Error && error.message.includes('not in blacklist')) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          error.message,
          404
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to remove IP from blacklist',
        500
      )
    );
  }
}

/**
 * Get blacklist
 * GET /sp-admin/ip-management/blacklist
 */
export async function getBlacklistHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getBlacklistSchema.parse(request.query);

    const result = await ipManagementService.getBlacklist({
      page: query.page,
      limit: query.limit,
      isActive: query.isActive,
    });

    const formattedResponse = formatSuccessResponse(
      result.data,
      200,
      'Blacklist retrieved successfully',
      result.meta
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get blacklist', {
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
        'Failed to get blacklist',
        500
      )
    );
  }
}

/**
 * Add IP to whitelist
 * POST /sp-admin/ip-management/whitelist
 */
export async function addToWhitelistHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = addToWhitelistSchema.parse(request.body);
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;

    const result = await ipManagementService.addToWhitelist({
      ipAddress: body.ipAddress,
      reason: body.reason,
      addedBy: userId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    const formattedResponse = formatSuccessResponse(
      result,
      201,
      'IP added to whitelist successfully'
    );
    return reply.status(201).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to add IP to whitelist', {
      error: error instanceof Error ? error.message : String(error),
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
        'Failed to add IP to whitelist',
        500
      )
    );
  }
}

/**
 * Remove IP from whitelist
 * DELETE /sp-admin/ip-management/whitelist/:ipAddress
 */
export async function removeFromWhitelistHandler(
  request: FastifyRequest<{ Params: { ipAddress: string } }>,
  reply: FastifyReply
) {
  try {
    const { ipAddress } = request.params;

    await ipManagementService.removeFromWhitelist(ipAddress);

    const formattedResponse = formatSuccessResponse(
      null,
      200,
      'IP removed from whitelist successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to remove IP from whitelist', {
      error: error instanceof Error ? error.message : String(error),
      ipAddress: request.params.ipAddress,
    });

    if (error instanceof Error && error.message.includes('not in whitelist')) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          error.message,
          404
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to remove IP from whitelist',
        500
      )
    );
  }
}

/**
 * Get whitelist
 * GET /sp-admin/ip-management/whitelist
 */
export async function getWhitelistHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = getWhitelistSchema.parse(request.query);

    const result = await ipManagementService.getWhitelist({
      page: query.page,
      limit: query.limit,
      isActive: query.isActive,
    });

    const formattedResponse = formatSuccessResponse(
      result.data,
      200,
      'Whitelist retrieved successfully',
      result.meta
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get whitelist', {
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
        'Failed to get whitelist',
        500
      )
    );
  }
}

/**
 * Ban IP (alias for addToBlacklist)
 * POST /sp-admin/ip-management/ban
 */
export async function banIPHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  return addToBlacklistHandler(request, reply);
}

/**
 * Unban IP (alias for removeFromBlacklist)
 * DELETE /sp-admin/ip-management/ban/:ipAddress
 */
export async function unbanIPHandler(
  request: FastifyRequest<{ Params: { ipAddress: string } }>,
  reply: FastifyReply
) {
  return removeFromBlacklistHandler(request, reply);
}

/**
 * Toggle blacklist status
 * PATCH /sp-admin/ip-management/blacklist/:ipAddress/toggle
 */
export async function toggleBlacklistStatusHandler(
  request: FastifyRequest<{ Params: { ipAddress: string } }>,
  reply: FastifyReply
) {
  try {
    const { ipAddress } = request.params;
    const body = toggleStatusSchema.parse(request.body);

    await ipManagementService.toggleBlacklistStatus(ipAddress, body.isActive);

    const formattedResponse = formatSuccessResponse(
      null,
      200,
      `IP blacklist status ${body.isActive ? 'enabled' : 'disabled'} successfully`
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to toggle blacklist status', {
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

    if (error instanceof Error && error.message.includes('not in blacklist')) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          error.message,
          404
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to toggle blacklist status',
        500
      )
    );
  }
}

/**
 * Toggle whitelist status
 * PATCH /sp-admin/ip-management/whitelist/:ipAddress/toggle
 */
export async function toggleWhitelistStatusHandler(
  request: FastifyRequest<{ Params: { ipAddress: string } }>,
  reply: FastifyReply
) {
  try {
    const { ipAddress } = request.params;
    const body = toggleStatusSchema.parse(request.body);

    await ipManagementService.toggleWhitelistStatus(ipAddress, body.isActive);

    const formattedResponse = formatSuccessResponse(
      null,
      200,
      `IP whitelist status ${body.isActive ? 'enabled' : 'disabled'} successfully`
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to toggle whitelist status', {
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

    if (error instanceof Error && error.message.includes('not in whitelist')) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          error.message,
          404
        )
      );
    }

    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to toggle whitelist status',
        500
      )
    );
  }
}

