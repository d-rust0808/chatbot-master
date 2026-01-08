/**
 * Tenant Service & Workflow Controller
 *
 * WHY:
 * - Tenant-level service config: bật/tắt whatsapp, messenger, tiktok... cho khách hàng
 * - User-level permissions: user nào được dùng / quản lý dịch vụ nào
 * - Workflow config: cấu hình flow cho từng chatbot / cửa hàng
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../infrastructure/database';
import { logger } from '../infrastructure/logger';
// import type { AuthenticatedRequest } from '../types/auth';

const tenantIdParamSchema = z.object({
  tenantId: z.string().min(1),
});

const serviceKeySchema = z.enum([
  'whatsapp',
  'facebook_messenger',
  'instagram_dm',
  'tiktok',
  'zalo',
  'shopee',
]);

const upsertTenantServicesBodySchema = z.object({
  services: z
    .array(
      z.object({
        service: serviceKeySchema,
        isEnabled: z.boolean(),
        config: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1),
});

const userServicePermissionsBodySchema = z.object({
  permissions: z
    .array(
      z.object({
        service: serviceKeySchema,
        canManage: z.boolean().optional().default(false),
        canUse: z.boolean().optional().default(false),
      })
    )
    .min(1),
});

const workflowBodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  chatbotId: z.string().min(1),
  storeId: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional().default(true),
});

/**
 * WHY: Tenant admin xem các dịch vụ được bật cho tenant
 */
export async function listTenantServicesHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { tenantId } = tenantIdParamSchema.parse(request.params);

    const services = await (prisma as any).tenantService.findMany({
      where: { tenantId },
      orderBy: { service: 'asc' },
    });

    return reply.status(200).send({
      success: true,
      data: services,
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

    logger.error('List tenant services error:', error);
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
 * WHY: SP-admin hoặc tenant admin cập nhật danh sách service bật/tắt cho tenant
 */
export async function upsertTenantServicesHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
    Body: z.infer<typeof upsertTenantServicesBodySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const { tenantId } = tenantIdParamSchema.parse(request.params);
    const body = upsertTenantServicesBodySchema.parse(request.body);

    // Đảm bảo tenant tồn tại
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      return reply.status(404).send({
        error: {
          message: 'Tenant not found',
          statusCode: 404,
        },
      });
    }

    // Upsert từng service
    await prisma.$transaction(
      body.services.map((svc) =>
        (prisma as any).tenantService.upsert({
          where: {
            tenantId_service: {
              tenantId,
              service: svc.service,
            },
          },
          create: {
            tenantId,
            service: svc.service,
            isEnabled: svc.isEnabled,
            config: (svc.config ?? undefined) as any,
          },
          update: {
            isEnabled: svc.isEnabled,
            config: (svc.config ?? undefined) as any,
          },
        })
      )
    );

    const updated = await (prisma as any).tenantService.findMany({
      where: { tenantId },
      orderBy: { service: 'asc' },
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

    logger.error('Upsert tenant services error:', error);
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
 * WHY: Tenant admin xem quyền dịch vụ theo user trong tenant
 */
export async function listUserServicePermissionsHandler(
  request: FastifyRequest<{
    Params: { tenantId: string; userId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { tenantId, userId } = request.params;

    const tenantUser = await prisma.tenantUser.findFirst({
      where: {
        tenantId,
        userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!tenantUser) {
      return reply.status(404).send({
        error: {
          message: 'Tenant user not found',
          statusCode: 404,
        },
      });
    }

    const permissions = await (prisma as any).tenantUserServicePermission.findMany({
      where: { tenantUserId: tenantUser.id },
    });

    return reply.status(200).send({
      success: true,
      data: {
        tenantUser: {
          id: tenantUser.id,
          role: tenantUser.role,
        },
        permissions,
      },
    });
  } catch (error) {
    logger.error('List user service permissions error:', error);
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
 * WHY: Tenant admin set quyền dịch vụ cho user (per-tenant)
 */
export async function upsertUserServicePermissionsHandler(
  request: FastifyRequest<{
    Params: { tenantId: string; userId: string };
    Body: z.infer<typeof userServicePermissionsBodySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const { tenantId, userId } = request.params;
    const body = userServicePermissionsBodySchema.parse(request.body);

    const tenantUser = await prisma.tenantUser.findFirst({
      where: {
        tenantId,
        userId,
      },
      select: { id: true },
    });

    if (!tenantUser) {
      return reply.status(404).send({
        error: {
          message: 'Tenant user not found',
          statusCode: 404,
        },
      });
    }

    await prisma.$transaction(
      body.permissions.map((perm) =>
        (prisma as any).tenantUserServicePermission.upsert({
          where: {
            tenantUserId_service: {
              tenantUserId: tenantUser.id,
              service: perm.service,
            },
          },
          create: {
            tenantUserId: tenantUser.id,
            service: perm.service,
            canManage: perm.canManage ?? false,
            canUse: perm.canUse ?? false,
          },
          update: {
            canManage: perm.canManage ?? false,
            canUse: perm.canUse ?? false,
          },
        })
      )
    );

    const updated = await (prisma as any).tenantUserServicePermission.findMany({
      where: { tenantUserId: tenantUser.id },
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

    logger.error('Upsert user service permissions error:', error);
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
 * WHY: Tenant admin list workflows cho tenant / chatbot
 */
export async function listWorkflowsHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
    Querystring: { chatbotId?: string; isActive?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { tenantId } = tenantIdParamSchema.parse(request.params);
    const { chatbotId, isActive } = request.query;

    const where: any = { tenantId };
    if (chatbotId) {
      where.chatbotId = chatbotId;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const workflows = await (prisma as any).workflow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return reply.status(200).send({
      success: true,
      data: workflows,
    });
  } catch (error) {
    logger.error('List workflows error:', error);
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
 * WHY: Tenant admin tạo workflow mới cho chatbot
 */
export async function createWorkflowHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
    Body: z.infer<typeof workflowBodySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const { tenantId } = tenantIdParamSchema.parse(request.params);
    const body = workflowBodySchema.parse(request.body);

    // Đảm bảo chatbot thuộc tenant này
    const chatbot = await prisma.chatbot.findFirst({
      where: {
        id: body.chatbotId,
        tenantId,
      },
      select: { id: true },
    });

    if (!chatbot) {
      return reply.status(404).send({
        error: {
          message: 'Chatbot not found for tenant',
          statusCode: 404,
        },
      });
    }

    const created = await (prisma as any).workflow.create({
      data: {
        tenantId,
        chatbotId: body.chatbotId,
        name: body.name,
        description: body.description,
        storeId: body.storeId,
        config: (body.config ?? undefined) as any,
        isActive: body.isActive ?? true,
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

    logger.error('Create workflow error:', error);
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
 * WHY: Tenant admin update workflow
 */
export async function updateWorkflowHandler(
  request: FastifyRequest<{
    Params: { tenantId: string; workflowId: string };
    Body: Partial<z.infer<typeof workflowBodySchema>>;
  }>,
  reply: FastifyReply
) {
  try {
    const { tenantId, workflowId } = request.params;
    const body = workflowBodySchema.partial().parse(request.body);

    const existing = await (prisma as any).workflow.findFirst({
      where: {
        id: workflowId,
        tenantId,
      },
    });

    if (!existing) {
      return reply.status(404).send({
        error: {
          message: 'Workflow not found',
          statusCode: 404,
        },
      });
    }

    const updated = await (prisma as any).workflow.update({
      where: { id: workflowId },
      data: {
        ...body,
        config: (body.config ?? existing.config) as any,
      } as any,
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

    logger.error('Update workflow error:', error);
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
 * WHY: Tenant admin delete workflow
 */
export async function deleteWorkflowHandler(
  request: FastifyRequest<{
    Params: { tenantId: string; workflowId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { tenantId, workflowId } = request.params;

    const existing = await (prisma as any).workflow.findFirst({
      where: {
        id: workflowId,
        tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      return reply.status(404).send({
        error: {
          message: 'Workflow not found',
          statusCode: 404,
        },
      });
    }

    await (prisma as any).workflow.delete({
      where: { id: workflowId },
    });

    return reply.status(204).send();
  } catch (error) {
    logger.error('Delete workflow error:', error);
    return reply.status(500).send({
      error: {
        message:
          error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}


