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

    return reply.status(201).send({
      data: result,
    });
  } catch (error) {
    logger.error('Failed to add IP to blacklist', {
      error: error instanceof Error ? error.message : String(error),
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
        message: 'Failed to add IP to blacklist',
      },
    });
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

    return reply.status(200).send({
      message: 'IP removed from blacklist',
    });
  } catch (error) {
    logger.error('Failed to remove IP from blacklist', {
      error: error instanceof Error ? error.message : String(error),
      ipAddress: request.params.ipAddress,
    });

    if (error instanceof Error && error.message.includes('not in blacklist')) {
      return reply.status(404).send({
        error: {
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to remove IP from blacklist',
      },
    });
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

    return reply.status(200).send({
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    logger.error('Failed to get blacklist', {
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
        message: 'Failed to get blacklist',
      },
    });
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

    return reply.status(201).send({
      data: result,
    });
  } catch (error) {
    logger.error('Failed to add IP to whitelist', {
      error: error instanceof Error ? error.message : String(error),
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
        message: 'Failed to add IP to whitelist',
      },
    });
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

    return reply.status(200).send({
      message: 'IP removed from whitelist',
    });
  } catch (error) {
    logger.error('Failed to remove IP from whitelist', {
      error: error instanceof Error ? error.message : String(error),
      ipAddress: request.params.ipAddress,
    });

    if (error instanceof Error && error.message.includes('not in whitelist')) {
      return reply.status(404).send({
        error: {
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to remove IP from whitelist',
      },
    });
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

    return reply.status(200).send({
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    logger.error('Failed to get whitelist', {
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
        message: 'Failed to get whitelist',
      },
    });
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

    return reply.status(200).send({
      message: `IP blacklist status ${body.isActive ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    logger.error('Failed to toggle blacklist status', {
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

    if (error instanceof Error && error.message.includes('not in blacklist')) {
      return reply.status(404).send({
        error: {
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to toggle blacklist status',
      },
    });
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

    return reply.status(200).send({
      message: `IP whitelist status ${body.isActive ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    logger.error('Failed to toggle whitelist status', {
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

    if (error instanceof Error && error.message.includes('not in whitelist')) {
      return reply.status(404).send({
        error: {
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: 'Failed to toggle whitelist status',
      },
    });
  }
}

