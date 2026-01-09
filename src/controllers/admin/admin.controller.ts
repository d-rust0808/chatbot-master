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
import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import bcrypt from 'bcrypt';
import { creditService } from '../../services/wallet/credit.service';
import { vndWalletService } from '../../services/wallet/vnd-wallet.service';
import type { AuthenticatedRequest } from '../../types/auth';

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

const createCustomerSchema = z.object({
  tenant: z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(255),
  }),
  adminUser: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(255),
  }),
});

const listTenantAdminsQuerySchema = z.object({
  tenantId: z.string().min(1),
});

const createTenantAdminSchema = z.object({
  tenantId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255),
  role: z.enum(['owner', 'admin']).default('admin'),
});

const updateTenantAdminSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['owner', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

const topUpUserBalanceSchema = z.object({
  vndAmount: z.number().int().nonnegative().optional(),
  creditAmount: z.number().int().nonnegative().optional(),
  reason: z.string().min(1).max(500).optional().default('Manual top-up by admin'),
});

const getAdminBalanceLogsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  startDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  endDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  type: z.enum(['vnd', 'credit', 'all']).optional().default('all'),
});

const getAllAdminBalanceLogsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  startDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  endDate: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
  type: z.enum(['vnd', 'credit', 'all']).optional().default('all'),
  adminId: z.string().optional(), // Optional filter by adminId
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
          tenants: {
            select: {
              tenantId: true,
              tenant: {
                select: {
                  id: true,
                },
              },
            },
            take: 1, // Lấy tenant đầu tiên để lấy balance/credit
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Enrich users với balance và credit từ tenant đầu tiên
    const usersWithBalance = await Promise.all(
      users.map(async (user) => {
        let balance = 0;
        let credit = 0;

        // Lấy tenant đầu tiên của user
        const firstTenant = user.tenants[0];
        if (firstTenant?.tenantId) {
          try {
            // Lấy balance và credit từ tenant
            balance = await vndWalletService.getBalance(firstTenant.tenantId);
            credit = await creditService.getBalance(firstTenant.tenantId);
          } catch (error) {
            logger.warn('Failed to get balance/credit for user', {
              userId: user.id,
              tenantId: firstTenant.tenantId,
              error: error instanceof Error ? error.message : error,
            });
            // Nếu lỗi, giữ balance = 0, credit = 0
          }
        }

        // Return user data without tenants field
        const { tenants, ...userData } = user;
        return {
          ...userData,
          balance,
          credit,
        };
      })
    );

    return reply.status(200).send({
      success: true,
      data: usersWithBalance,
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
 * WHY: SP-admin tạo mới 1 khách hàng: tenant + admin user trong 1 API
 */
export async function createCustomerHandler(
  request: FastifyRequest<{
    Body: z.infer<typeof createCustomerSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const { tenant, adminUser } = createCustomerSchema.parse(request.body);

    const [existingTenant, existingUser] = await Promise.all([
      prisma.tenant.findUnique({ where: { slug: tenant.slug } }),
      prisma.user.findUnique({ where: { email: adminUser.email } }),
    ]);

    if (existingTenant) {
      return reply.status(409).send({
        error: {
          message: 'Tenant slug already exists',
          statusCode: 409,
        },
      });
    }

    if (existingUser) {
      return reply.status(409).send({
        error: {
          message: 'Admin email already exists',
          statusCode: 409,
        },
      });
    }

    const hashedPassword = await bcrypt.hash(adminUser.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          name: tenant.name,
          slug: tenant.slug,
        },
      });

      const user = await tx.user.create({
        data: {
          email: adminUser.email,
          password: hashedPassword,
          name: adminUser.name,
          // systemRole dùng default trong schema (\"admin\")
        },
      });

      await tx.tenantUser.create({
        data: {
          tenantId: createdTenant.id,
          userId: user.id,
          role: 'owner',
        },
      });

      return { tenant: createdTenant, adminUser: user };
    });

    return reply.status(201).send({
      success: true,
      message: 'Tạo khách hàng mới thành công',
      data: {
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
        },
        adminUser: {
          id: result.adminUser.id,
          email: result.adminUser.email,
          name: result.adminUser.name,
          // systemRole không được expose trong type trả về → dùng hằng 'admin'
          role: 'admin',
        },
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

    logger.error('Create customer error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * WHY: SP-admin xem danh sách admin/owner của một tenant
 */
export async function listTenantAdminsHandler(
  request: FastifyRequest<{
    Querystring: {
      tenantId: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const validated = listTenantAdminsQuerySchema.parse(request.query);

    const tenantUsers = await prisma.tenantUser.findMany({
      where: {
        tenantId: validated.tenantId,
        role: { in: ['owner', 'admin'] },
      },
      include: {
        user: true,
      },
    });

    return reply.status(200).send({
      success: true,
      data: tenantUsers.map((tu) => ({
        userId: tu.userId,
        role: tu.role,
        createdAt: tu.createdAt,
        user: tu.user,
      })),
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

    logger.error('List tenant admins error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * WHY: SP-admin tạo admin/owner mới cho tenant
 */
export async function createTenantAdminHandler(
  request: FastifyRequest<{
    Body: z.infer<typeof createTenantAdminSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const body = createTenantAdminSchema.parse(request.body);

    const [tenant, existingUser] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: body.tenantId } }),
      prisma.user.findUnique({ where: { email: body.email } }),
    ]);

    if (!tenant) {
      return reply.status(404).send({
        error: {
          message: 'Tenant not found',
          statusCode: 404,
        },
      });
    }

    if (existingUser) {
      return reply.status(409).send({
        error: {
          message: 'Admin email already exists',
          statusCode: 409,
        },
      });
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name,
      },
    });

    await prisma.tenantUser.create({
      data: {
        tenantId: body.tenantId,
        userId: user.id,
        role: body.role,
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'admin',
        },
        tenantId: body.tenantId,
        tenantRole: body.role,
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

    logger.error('Create tenant admin error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * WHY: SP-admin cập nhật thông tin admin (tên, role trong tenant)
 */
export async function updateTenantAdminHandler(
  request: FastifyRequest<{
    Params: { userId: string };
    Body: z.infer<typeof updateTenantAdminSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const { userId } = request.params;
    const body = updateTenantAdminSchema.parse(request.body);

    const tenantUser = await prisma.tenantUser.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!tenantUser) {
      return reply.status(404).send({
        error: {
          message: 'Tenant admin not found',
          statusCode: 404,
        },
      });
    }

    if (body.name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: body.name },
      });
    }

    if (body.role) {
      await prisma.tenantUser.update({
        where: { id: tenantUser.id },
        data: { role: body.role },
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Tenant admin updated',
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

    logger.error('Update tenant admin error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * WHY: SP-admin xoá admin khỏi hệ thống/tenant
 */
export async function deleteTenantAdminHandler(
  request: FastifyRequest<{
    Params: { userId: string };
    Querystring: { tenantId?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { userId } = request.params;
    const { tenantId } = request.query;

    if (tenantId) {
      // Xoá link giữa user và tenant
      await prisma.tenantUser.deleteMany({
        where: {
          userId,
          tenantId,
        },
      });
    } else {
      // Xoá toàn bộ tenantUser và user
      await prisma.tenantUser.deleteMany({
        where: { userId },
      });
      await prisma.user.delete({
        where: { id: userId },
      });
    }

    return reply.status(204).send();
  } catch (error) {
    logger.error('Delete tenant admin error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

// -------------------------------
// PlanTemplate (Super Admin only)
// -------------------------------

const planTemplateBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  monthlyPriceCents: z.number().int().nonnegative(),
  currency: z.string().min(1).max(10).default('USD'),
  isActive: z.boolean().optional().default(true),
  limits: z.record(z.string(), z.unknown()).transform((val) => val as unknown),
});

const listPlanTemplatesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

/**
 * WHY: List plan templates cho SP admin để quản lý gói dịch vụ
 */
export async function listPlanTemplatesHandler(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      isActive?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const validated = listPlanTemplatesQuerySchema.parse(request.query);

    const page = validated.page || 1;
    const limit = Math.min(validated.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (validated.isActive !== undefined) {
      where.isActive = validated.isActive;
    }

    const [plans, total] = await Promise.all([
      (prisma as any).planTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).planTemplate.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: plans,
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

    logger.error('List plan templates error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * WHY: Tạo plan template mới (SP admin định nghĩa gói dịch vụ)
 */
export async function createPlanTemplateHandler(
  request: FastifyRequest<{
    Body: z.infer<typeof planTemplateBodySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const body = planTemplateBodySchema.parse(request.body);

    const created = await (prisma as any).planTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        monthlyPriceCents: body.monthlyPriceCents,
        currency: body.currency,
        isActive: body.isActive ?? true,
        limits: body.limits as any,
      },
    });

    return reply.status(201).send({
      success: true,
      data: created,
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

    logger.error('Create plan template error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * WHY: Update plan template (chỉnh sửa mô tả, giá, limits)
 */
export async function updatePlanTemplateHandler(
  request: FastifyRequest<{
    Params: { planTemplateId: string };
    Body: Partial<z.infer<typeof planTemplateBodySchema>>;
  }>,
  reply: FastifyReply
) {
  try {
    const { planTemplateId } = request.params;
    const body = planTemplateBodySchema.partial().parse(request.body);

    const existing = await (prisma as any).planTemplate.findUnique({
      where: { id: planTemplateId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: {
          message: 'Plan template not found',
          statusCode: 404,
        },
      });
    }

    const updated = await (prisma as any).planTemplate.update({
      where: { id: planTemplateId },
      data: body as any,
    });

    return reply.status(200).send({
      success: true,
      data: updated,
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

    logger.error('Update plan template error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * WHY: Soft-delete hoặc deactivate plan template
 */
export async function deletePlanTemplateHandler(
  request: FastifyRequest<{
    Params: { planTemplateId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { planTemplateId } = request.params;

    const existing = await (prisma as any).planTemplate.findUnique({
      where: { id: planTemplateId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: {
          message: 'Plan template not found',
          statusCode: 404,
        },
      });
    }

    // WHY: để an toàn, chỉ deactivate thay vì xóa cứng (giữ lịch sử subscription)
    const updated = await (prisma as any).planTemplate.update({
      where: { id: planTemplateId },
      data: { isActive: false },
    });

    return reply.status(200).send({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Delete plan template error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * WHY: SP admin xem danh sách subscription của tenants (overview billing)
 */
export async function listTenantSubscriptionsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const subscriptions = await (prisma as any).subscription.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
        planTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      // Prisma hiện không expose createdAt trong type orderBy (có thể do version),
      // tạm thời không sort để tránh type error, UI có thể sort client-side.
      take: 200,
    });

    return reply.status(200).send({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    logger.error('List tenant subscriptions error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
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

/**
 * Create tenant (sp-admin only)
 * WHY: sp-admin tạo tenant (khách hàng) mới
 */
export async function createTenantHandler(
  request: FastifyRequest<{
    Body: {
      name: string;
      slug?: string;
      adminEmail?: string; // Optional: tạo admin cho tenant này
      adminPassword?: string;
      adminName?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { name, slug, adminEmail, adminPassword, adminName } = request.body;

    // Validation
    if (!name) {
      return reply.status(400).send({
        error: {
          message: 'Tenant name is required',
          statusCode: 400,
        },
      });
    }

    // Generate slug nếu không có
    const tenantSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    // Check if tenant already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (existingTenant) {
      return reply.status(400).send({
        error: {
          message: 'Tenant with this slug already exists',
          statusCode: 400,
        },
      });
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: tenantSlug,
      },
    });

    // Create admin cho tenant (sp-admin tạo admin account)
    // WHY: Chỉ sp-admin mới có quyền tạo admin accounts
    let adminUser = null;
    if (adminEmail && adminPassword) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (existingUser) {
        // User đã tồn tại → link với tenant
        await prisma.tenantUser.create({
          data: {
            userId: existingUser.id,
            tenantId: tenant.id,
            role: 'owner',
          },
        });

        adminUser = existingUser;
        logger.info('Existing user linked to tenant', {
          tenantId: tenant.id,
          userId: existingUser.id,
        });
      } else {
        // Tạo admin user mới
        const bcrypt = await import('bcrypt');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        adminUser = await prisma.user.create({
          data: {
            email: adminEmail,
            password: hashedPassword,
            name: adminName || 'Tenant Admin',
            // systemRole sẽ dùng default từ database (admin)
            tenants: {
              create: {
                tenantId: tenant.id,
                role: 'owner',
              },
            },
          },
        });

        logger.info('Tenant admin created by sp-admin', {
          tenantId: tenant.id,
          adminId: adminUser.id,
        });
      }
    }

    logger.info('Tenant created', {
      tenantId: tenant.id,
      tenantName: tenant.name,
      hasAdmin: !!adminUser,
    });

    return reply.status(201).send({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        admin: adminUser
          ? {
              id: adminUser.id,
              email: adminUser.email,
              name: adminUser.name,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error('Create tenant error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Update tenant configuration (sp-admin only)
 * WHY: sp-admin config cho từng tenant
 */
export async function updateTenantConfigHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
    Body: {
      name?: string;
      slug?: string;
      // Có thể thêm các config khác sau
      settings?: Record<string, any>;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { tenantId } = request.params;
    const { name, slug } = request.body;

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      return reply.status(404).send({
        error: {
          message: 'Tenant not found',
          statusCode: 404,
        },
      });
    }

    // Check slug uniqueness nếu đổi slug
    if (slug && slug !== existingTenant.slug) {
      const slugExists = await prisma.tenant.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return reply.status(400).send({
          error: {
            message: 'Tenant slug already exists',
            statusCode: 400,
          },
        });
      }
    }

    // Update tenant
    const updateData: any = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    // Có thể thêm metadata cho settings sau

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    logger.info('Tenant config updated', {
      tenantId,
      changes: Object.keys(updateData),
    });

    return reply.status(200).send({
      success: true,
      data: {
        tenant: {
          id: updatedTenant.id,
          name: updatedTenant.name,
          slug: updatedTenant.slug,
        },
      },
    });
  } catch (error) {
    logger.error('Update tenant config error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Config chatbot settings cho tenant (sp-admin only)
 * WHY: sp-admin config các cấu hình chat cho admin của tenant
 */
export async function configTenantChatbotSettingsHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
    Body: {
      defaultModel?: string; // Default AI model cho tenant
      defaultTemperature?: number;
      defaultMaxTokens?: number;
      allowedModels?: string[]; // Models được phép sử dụng
      rateLimit?: {
        messagesPerDay?: number;
        messagesPerHour?: number;
      };
      features?: {
        knowledgeBase?: boolean;
        analytics?: boolean;
        export?: boolean;
      };
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { tenantId } = request.params;
    const {
      defaultModel,
      defaultTemperature,
      defaultMaxTokens,
      allowedModels,
      rateLimit,
      features,
    } = request.body;

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return reply.status(404).send({
        error: {
          message: 'Tenant not found',
          statusCode: 404,
        },
      });
    }

    // Lưu config vào tenant metadata
    const currentMetadata = ((tenant as any).metadata as Record<string, any>) || {};
    const chatbotSettings: Record<string, any> = {};
    
    if (defaultModel !== undefined) chatbotSettings.defaultModel = defaultModel;
    if (defaultTemperature !== undefined) chatbotSettings.defaultTemperature = defaultTemperature;
    if (defaultMaxTokens !== undefined) chatbotSettings.defaultMaxTokens = defaultMaxTokens;
    if (allowedModels !== undefined) chatbotSettings.allowedModels = allowedModels;
    if (rateLimit !== undefined) chatbotSettings.rateLimit = rateLimit;
    if (features !== undefined) chatbotSettings.features = features;

    // Merge với settings hiện tại
    const updatedMetadata = {
      ...currentMetadata,
      chatbotSettings: {
        ...currentMetadata.chatbotSettings,
        ...chatbotSettings,
      },
    };

    // Update tenant với metadata
    // NOTE: Dùng biến trung gian kiểu any để tránh lỗi TS khi Prisma Client chưa cập nhật field metadata
    const tenantUpdateData: any = {
      metadata: updatedMetadata,
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: tenantUpdateData,
    });

    logger.info('Tenant chatbot settings configured by sp-admin', {
      tenantId,
      settings: updatedMetadata.chatbotSettings,
    });

    return reply.status(200).send({
      success: true,
      data: {
        tenantId,
        settings: updatedMetadata.chatbotSettings,
        message: 'Chatbot settings configured successfully',
      },
    });
  } catch (error) {
    logger.error('Config tenant chatbot settings error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Top-up user balance (sp-admin only)
 * WHY: Cho phép sp-admin nạp tiền trực tiếp cho user (qua tenant đầu tiên)
 */
export async function topUpUserBalanceHandler(
  request: FastifyRequest<{
    Params: { userId: string };
    Body: z.infer<typeof topUpUserBalanceSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const adminId = authRequest.user?.userId; // Admin thực hiện top-up
    const { userId } = request.params; // User được top-up
    const body = topUpUserBalanceSchema.parse(request.body);
    
    if (!adminId) {
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }

    // Validate: phải có ít nhất một loại tiền để nạp
    if (!body.vndAmount && !body.creditAmount) {
      return reply.status(400).send({
        error: {
          message: 'Must provide either vndAmount or creditAmount',
          statusCode: 400,
        },
      });
    }

    // Get user và tenant đầu tiên
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenants: {
          take: 1,
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({
        error: {
          message: 'User not found',
          statusCode: 404,
        },
      });
    }

    if (user.tenants.length === 0) {
      return reply.status(400).send({
        error: {
          message: 'User has no tenant. Cannot top-up balance.',
          statusCode: 400,
        },
      });
    }

    const tenant = user.tenants[0].tenant;

    // Nạp VND nếu có
    if (body.vndAmount && body.vndAmount > 0) {
      await vndWalletService.addVND(
        tenant.id,
        body.vndAmount,
        body.reason || 'Manual top-up by admin',
        undefined,
        {
          adminUserId: adminId, // Fix: Lưu adminId của người thực hiện top-up
          adminAction: true,
          targetUserId: userId, // Lưu thêm userId của user được top-up để reference
        }
      );
    }

    // Nạp Credit nếu có
    if (body.creditAmount && body.creditAmount > 0) {
      await creditService.addCredit(
        tenant.id,
        body.creditAmount,
        body.reason || 'Manual top-up by admin',
        undefined,
        {
          adminUserId: adminId, // Fix: Lưu adminId của người thực hiện top-up
          adminAction: true,
          targetUserId: userId, // Lưu thêm userId của user được top-up để reference
        }
      );
    }

    // Lấy balance mới sau khi nạp
    const newBalance = await vndWalletService.getBalance(tenant.id);
    const newCredit = await creditService.getBalance(tenant.id);

    logger.info('User balance topped up by admin', {
      userId,
      tenantId: tenant.id,
      vndAmount: body.vndAmount || 0,
      creditAmount: body.creditAmount || 0,
      newBalance,
      newCredit,
    });

    return reply.status(200).send({
      success: true,
      message: 'Balance topped up successfully',
      data: {
        userId,
        tenantId: tenant.id,
        tenantName: tenant.name,
        vndAmount: body.vndAmount || 0,
        creditAmount: body.creditAmount || 0,
        newBalance,
        newCredit,
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

    logger.error('Top-up user balance error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get admin balance logs
 * WHY: Hiển thị logs biến động số dư của từng admin (các transactions mà admin thực hiện)
 */
export async function getAdminBalanceLogsHandler(
  request: FastifyRequest<{
    Params: { adminId: string };
    Querystring: {
      page?: string;
      limit?: string;
      startDate?: string;
      endDate?: string;
      type?: 'vnd' | 'credit' | 'all';
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { adminId } = request.params;
    const validated = getAdminBalanceLogsSchema.parse(request.query);

    // Verify admin exists
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, name: true },
    });

    if (!admin) {
      return reply.status(404).send({
        error: {
          message: 'Admin not found',
          statusCode: 404,
        },
      });
    }

    const page = validated.page || 1;
    const limit = Math.min(validated.limit || 50, 100);
    const skip = (page - 1) * limit;

    // Get all tenants where admin is owner (để hiển thị payments từ shop của admin)
    const adminTenants = await prisma.tenantUser.findMany({
      where: {
        userId: adminId,
        role: 'owner',
      },
      select: {
        tenantId: true,
      },
    });
    const adminTenantIds = adminTenants.map((tu) => tu.tenantId);

    // Build date filter
    const dateFilter: any = {};
    if (validated.startDate || validated.endDate) {
      dateFilter.createdAt = {};
      if (validated.startDate) {
        dateFilter.createdAt.gte = validated.startDate;
      }
      if (validated.endDate) {
        dateFilter.createdAt.lte = validated.endDate;
      }
    }

    // Query VND transactions if type is 'vnd' or 'all'
    // Use raw query to filter by JSON metadata field
    const vndTransactionsPromise =
      validated.type === 'credit'
        ? Promise.resolve({ transactions: [], total: 0 })
        : (async () => {
            // Build where clause with JSON filter
            const whereClause: any = {
              ...dateFilter,
            };

            // Use Prisma's JSON filter syntax
            const allVndTransactions = await (prisma as any).vNDTransaction.findMany({
              where: whereClause,
              select: {
                id: true,
                amount: true,
                reason: true,
                tenantId: true,
                referenceId: true,
                metadata: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            });

            // Get all tenants where admin is owner
            const adminTenants = await prisma.tenantUser.findMany({
              where: {
                userId: adminId,
                role: 'owner',
              },
              select: {
                tenantId: true,
              },
            });
            const adminTenantIds = adminTenants.map((tu) => tu.tenantId);

            // Filter transactions:
            // 1. Admin actions (top-up): metadata.adminUserId === adminId && adminAction === true
            // 2. Payments from admin's tenants: tenantId in adminTenantIds && has paymentCode in metadata
            const filteredVndTransactions = allVndTransactions.filter((t: any) => {
              const metadata = t.metadata as any;
              
              // Case 1: Admin top-up action
              if (metadata?.adminUserId === adminId && metadata?.adminAction === true) {
                return true;
              }
              
              // Case 2: Payment from admin's tenant (QR nạp tiền)
              if (adminTenantIds.includes(t.tenantId) && metadata?.paymentCode) {
                return true;
              }
              
              return false;
            });

            // Apply pagination after filtering
            const paginatedTransactions = filteredVndTransactions.slice(skip, skip + limit);
            const total = filteredVndTransactions.length;

            return {
              transactions: paginatedTransactions.map((t: any) => ({
                ...t,
                type: 'vnd' as const,
              })),
              total,
            };
          })();

    // Query Credit transactions if type is 'credit' or 'all'
    const creditTransactionsPromise =
      validated.type === 'vnd'
        ? Promise.resolve({ transactions: [], total: 0 })
        : (async () => {
            const whereClause: any = {
              ...dateFilter,
            };

            const allCreditTransactions = await (prisma as any).creditTransaction.findMany({
              where: whereClause,
              select: {
                id: true,
                amount: true,
                reason: true,
                tenantId: true,
                referenceId: true,
                metadata: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            });

            // Filter transactions:
            // 1. Admin actions (top-up): metadata.adminUserId === adminId && adminAction === true
            // 2. Payments from admin's tenants: tenantId in adminTenantIds && has paymentCode in metadata
            const filteredCreditTransactions = allCreditTransactions.filter((t: any) => {
              const metadata = t.metadata as any;
              
              // Case 1: Admin top-up action
              if (metadata?.adminUserId === adminId && metadata?.adminAction === true) {
                return true;
              }
              
              // Case 2: Payment from admin's tenant (QR nạp tiền) - Credit transactions từ payment
              if (adminTenantIds.includes(t.tenantId) && metadata?.paymentCode) {
                return true;
              }
              
              return false;
            });

            // Apply pagination after filtering
            const paginatedTransactions = filteredCreditTransactions.slice(skip, skip + limit);
            const total = filteredCreditTransactions.length;

            return {
              transactions: paginatedTransactions.map((t: any) => ({
                ...t,
                type: 'credit' as const,
              })),
              total,
            };
          })();

    const [vndResult, creditResult] = await Promise.all([
      vndTransactionsPromise,
      creditTransactionsPromise,
    ]);

    // Merge all transactions and sort by createdAt desc
    let allTransactions = [...vndResult.transactions, ...creditResult.transactions];
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    // Total count before pagination
    const totalTransactions = allTransactions.length;

    // Apply pagination after merging and sorting
    const paginatedTransactions = allTransactions.slice(skip, skip + limit);

    // Get unique tenant IDs to enrich with tenant info
    const tenantIds = [...new Set(paginatedTransactions.map((t) => t.tenantId))];
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true },
    });

    const tenantMap = new Map(tenants.map((t) => [t.id, t]));

    // Enrich transactions with tenant info
    const enrichedTransactions = paginatedTransactions.map((txn) => {
      const tenant = tenantMap.get(txn.tenantId);
      return {
        id: txn.id,
        type: txn.type,
        amount: txn.amount,
        reason: txn.reason,
        tenantId: txn.tenantId,
        tenantName: tenant?.name || 'Unknown',
        createdAt: txn.createdAt,
        referenceId: txn.referenceId,
        metadata: txn.metadata,
      };
    });

    logger.info('Admin balance logs retrieved', {
      adminId,
      totalTransactions,
      returnedCount: enrichedTransactions.length,
      type: validated.type,
    });

    return reply.status(200).send({
      success: true,
      data: enrichedTransactions,
      meta: {
        page,
        limit,
        total: totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit),
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
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

    logger.error('Get admin balance logs error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get all admin balance logs (sp-admin only)
 * WHY: Sp-admin xem tất cả logs biến động số dư của TẤT CẢ admins
 * - Hiển thị tất cả top-up actions của tất cả admins
 * - Hiển thị tất cả payments từ tất cả tenants
 * - Có thể filter theo adminId (optional)
 */
export async function getAllAdminBalanceLogsHandler(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      startDate?: string;
      endDate?: string;
      type?: 'vnd' | 'credit' | 'all';
      adminId?: string; // Optional filter by adminId
    };
  }>,
  reply: FastifyReply
) {
  try {
    const validated = getAllAdminBalanceLogsSchema.parse(request.query);

    const page = validated.page || 1;
    const limit = Math.min(validated.limit || 50, 100);
    const skip = (page - 1) * limit;

    // Build date filter
    const dateFilter: any = {};
    if (validated.startDate || validated.endDate) {
      dateFilter.createdAt = {};
      if (validated.startDate) {
        dateFilter.createdAt.gte = validated.startDate;
      }
      if (validated.endDate) {
        dateFilter.createdAt.lte = validated.endDate;
      }
    }

    // Query VND transactions if type is 'vnd' or 'all'
    const vndTransactionsPromise =
      validated.type === 'credit'
        ? Promise.resolve({ transactions: [], total: 0 })
        : (async () => {
            const whereClause: any = {
              ...dateFilter,
            };

            const allVndTransactions = await (prisma as any).vNDTransaction.findMany({
              where: whereClause,
              select: {
                id: true,
                amount: true,
                reason: true,
                tenantId: true,
                referenceId: true,
                metadata: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            });

            // Filter transactions:
            // 1. Admin top-up actions: metadata.adminAction === true
            // 2. Payments: has paymentCode in metadata
            // 3. Optional filter by adminId
            const filteredVndTransactions = allVndTransactions.filter((t: any) => {
              const metadata = t.metadata as any;
              
              // Case 1: Admin top-up action
              if (metadata?.adminAction === true) {
                // If adminId filter is provided, check if it matches
                if (validated.adminId) {
                  return metadata?.adminUserId === validated.adminId;
                }
                return true;
              }
              
              // Case 2: Payment (QR nạp tiền)
              if (metadata?.paymentCode) {
                // If adminId filter is provided, check if admin is owner of tenant
                if (validated.adminId) {
                  // We'll check this after getting tenant info
                  return true; // Include for now, filter later
                }
                return true;
              }
              
              return false;
            });

            // If adminId filter is provided, filter payments by tenant ownership
            let finalVndTransactions = filteredVndTransactions;
            if (validated.adminId) {
              // Get tenants where admin is owner
              const adminTenants = await prisma.tenantUser.findMany({
                where: {
                  userId: validated.adminId,
                  role: 'owner',
                },
                select: {
                  tenantId: true,
                },
              });
              const adminTenantIds = adminTenants.map((tu) => tu.tenantId);
              
              finalVndTransactions = filteredVndTransactions.filter((t: any) => {
                const metadata = t.metadata as any;
                // If it's a payment, check if admin owns the tenant
                if (metadata?.paymentCode && !metadata?.adminAction) {
                  return adminTenantIds.includes(t.tenantId);
                }
                return true; // Admin actions already filtered above
              });
            }

            // Apply pagination after filtering
            const paginatedTransactions = finalVndTransactions.slice(skip, skip + limit);
            const total = finalVndTransactions.length;

            return {
              transactions: paginatedTransactions.map((t: any) => ({
                ...t,
                type: 'vnd' as const,
              })),
              total,
            };
          })();

    // Query Credit transactions if type is 'credit' or 'all'
    const creditTransactionsPromise =
      validated.type === 'vnd'
        ? Promise.resolve({ transactions: [], total: 0 })
        : (async () => {
            const whereClause: any = {
              ...dateFilter,
            };

            const allCreditTransactions = await (prisma as any).creditTransaction.findMany({
              where: whereClause,
              select: {
                id: true,
                amount: true,
                reason: true,
                tenantId: true,
                referenceId: true,
                metadata: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            });

            // Filter transactions (same logic as VND)
            const filteredCreditTransactions = allCreditTransactions.filter((t: any) => {
              const metadata = t.metadata as any;
              
              if (metadata?.adminAction === true) {
                if (validated.adminId) {
                  return metadata?.adminUserId === validated.adminId;
                }
                return true;
              }
              
              if (metadata?.paymentCode) {
                if (validated.adminId) {
                  return true; // Filter later by tenant ownership
                }
                return true;
              }
              
              return false;
            });

            // Filter payments by tenant ownership if adminId provided
            let finalCreditTransactions = filteredCreditTransactions;
            if (validated.adminId) {
              const adminTenants = await prisma.tenantUser.findMany({
                where: {
                  userId: validated.adminId,
                  role: 'owner',
                },
                select: {
                  tenantId: true,
                },
              });
              const adminTenantIds = adminTenants.map((tu) => tu.tenantId);
              
              finalCreditTransactions = filteredCreditTransactions.filter((t: any) => {
                const metadata = t.metadata as any;
                if (metadata?.paymentCode && !metadata?.adminAction) {
                  return adminTenantIds.includes(t.tenantId);
                }
                return true;
              });
            }

            // Apply pagination after filtering
            const paginatedTransactions = finalCreditTransactions.slice(skip, skip + limit);
            const total = finalCreditTransactions.length;

            return {
              transactions: paginatedTransactions.map((t: any) => ({
                ...t,
                type: 'credit' as const,
              })),
              total,
            };
          })();

    const [vndResult, creditResult] = await Promise.all([
      vndTransactionsPromise,
      creditTransactionsPromise,
    ]);

    // Merge all transactions and sort by createdAt desc
    let allTransactions = [...vndResult.transactions, ...creditResult.transactions];
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    // Total count before pagination
    const totalTransactions = allTransactions.length;

    // Apply pagination after merging and sorting
    const paginatedTransactions = allTransactions.slice(skip, skip + limit);

    // Get unique tenant IDs and admin IDs to enrich with info
    const tenantIds = [...new Set(paginatedTransactions.map((t) => t.tenantId))];
    const adminIds = new Set<string>();
    
    paginatedTransactions.forEach((t: any) => {
      const metadata = t.metadata as any;
      if (metadata?.adminUserId) {
        adminIds.add(metadata.adminUserId);
      }
    });

    const [tenants, admins] = await Promise.all([
      prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { id: { in: Array.from(adminIds) } },
        select: { id: true, email: true, name: true },
      }),
    ]);

    const tenantMap = new Map(tenants.map((t) => [t.id, t]));
    const adminMap = new Map(admins.map((a) => [a.id, a]));

    // Enrich transactions with tenant and admin info
    const enrichedTransactions = paginatedTransactions.map((txn: any) => {
      const tenant = tenantMap.get(txn.tenantId);
      const metadata = txn.metadata as any;
      const admin = metadata?.adminUserId ? adminMap.get(metadata.adminUserId) : null;
      
      return {
        id: txn.id,
        type: txn.type,
        amount: txn.amount,
        reason: txn.reason,
        tenant: tenant ? { id: tenant.id, name: tenant.name } : null,
        admin: admin ? { id: admin.id, email: admin.email, name: admin.name } : null,
        isPayment: !!metadata?.paymentCode,
        isTopUp: !!metadata?.adminAction,
        paymentCode: metadata?.paymentCode || null,
        createdAt: txn.createdAt,
      };
    });

    logger.info('All admin balance logs retrieved', {
      totalTransactions,
      returnedCount: enrichedTransactions.length,
      type: validated.type,
      adminIdFilter: validated.adminId || 'all',
    });

    return reply.status(200).send({
      success: true,
      data: enrichedTransactions,
      meta: {
        page,
        limit,
        total: totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit),
        filter: {
          adminId: validated.adminId || null,
          type: validated.type,
        },
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

    logger.error('Get all admin balance logs error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Create admin user (First-time setup)
 * WHY: Tạo admin user đầu tiên để quản trị hệ thống
 * NOTE: Public endpoint, chỉ nên dùng khi setup lần đầu
 */
export async function createAdminHandler(
  request: FastifyRequest<{
    Body: {
      email: string;
      password: string;
      name?: string;
      tenantName?: string; // Optional: tạo tenant cho admin
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { email, password, name, tenantName } = request.body;

    // Validation
    if (!email || !password) {
      return reply.status(400).send({
        error: {
          message: 'Email and password are required',
          statusCode: 400,
        },
      });
    }

    if (password.length < 8) {
      return reply.status(400).send({
        error: {
          message: 'Password must be at least 8 characters',
          statusCode: 400,
        },
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(400).send({
        error: {
          message: 'User already exists',
          statusCode: 400,
        },
      });
    }

    // Import bcrypt
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || 'Admin',
      },
    });

    // Create tenant for admin if tenantName provided
    let tenant = null;
    if (tenantName) {
      const tenantSlug = tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug,
          users: {
            create: {
              userId: user.id,
              role: 'owner',
            },
          },
        },
      });
    }

    logger.info('Admin user created', {
      userId: user.id,
      email: user.email,
      tenantId: tenant?.id,
    });

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
            }
          : null,
        message: 'Admin user created successfully',
      },
    });
  } catch (error) {
    logger.error('Create admin error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

