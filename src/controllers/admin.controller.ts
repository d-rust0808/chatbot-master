/**
 * Admin Controller
 * 
 * WHY: Admin APIs cho quản trị hệ thống
 * - User management
 * - Tenant management
 * - System statistics
 * - Platform connection management
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../infrastructure/database';
import { logger } from '../infrastructure/logger';

// Validation schemas
const listUsersSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  search: z.string().optional(),
});

const listTenantsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  search: z.string().optional(),
});

/**
 * Get system statistics (Admin only)
 */
export async function getSystemStatsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // TODO: Add admin role check
    // For now, any authenticated user can access (should restrict later)

    const [
      totalUsers,
      totalTenants,
      totalChatbots,
      totalConversations,
      totalMessages,
      activePlatformConnections,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.tenant.count(),
      prisma.chatbot.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.platformConnection.count({
        where: { status: 'connected' },
      }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        users: {
          total: totalUsers,
        },
        tenants: {
          total: totalTenants,
        },
        chatbots: {
          total: totalChatbots,
        },
        conversations: {
          total: totalConversations,
        },
        messages: {
          total: totalMessages,
        },
        platformConnections: {
          active: activePlatformConnections,
        },
      },
    });
  } catch (error) {
    logger.error('Get system stats error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * List all users (Admin only)
 */
export async function listUsersHandler(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    // TODO: Add admin role check
    const validated = listUsersSchema.parse(request.query);

    const page = validated.page || 1;
    const limit = Math.min(validated.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (validated.search) {
      where.OR = [
        { email: { contains: validated.search, mode: 'insensitive' } },
        { name: { contains: validated.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              tenants: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Validation error',
          statusCode: 400,
          details: error.errors,
        },
      });
    }

    logger.error('List users error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * List all tenants (Admin only)
 */
export async function listTenantsHandler(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    // TODO: Add admin role check
    const validated = listTenantsSchema.parse(request.query);

    const page = validated.page || 1;
    const limit = Math.min(validated.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (validated.search) {
      where.OR = [
        { name: { contains: validated.search, mode: 'insensitive' } },
        { slug: { contains: validated.search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              chatbots: true,
              conversations: true,
              users: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: tenants,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Validation error',
          statusCode: 400,
          details: error.errors,
        },
      });
    }

    logger.error('List tenants error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get tenant details (Admin only)
 */
export async function getTenantHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
  }>,
  reply: FastifyReply
) {
  try {
    // TODO: Add admin role check
    const { tenantId } = request.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        chatbots: {
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            conversations: true,
            chatbots: true,
            users: true,
          },
        },
      },
    });

    if (!tenant) {
      return reply.status(404).send({
        error: {
          message: 'Tenant not found',
          statusCode: 404,
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: tenant,
    });
  } catch (error) {
    logger.error('Get tenant error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

