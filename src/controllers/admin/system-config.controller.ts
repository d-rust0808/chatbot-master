/**
 * System Config Controller (SP-Admin only)
 * 
 * WHY: API handlers cho System Config management
 * - CRUD operations cho configs
 * - Chỉ SP-Admin có quyền truy cập
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { systemConfigService } from '../../services/system-config/system-config.service';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest } from '../../types/auth';
import {
  createSystemConfigSchema,
  updateSystemConfigSchema,
  listSystemConfigsSchema,
} from '../../types/system-config';

/**
 * List system configs
 * GET /sp-admin/system-configs
 * WHY: SP-Admin xem danh sách configs
 */
export async function listSystemConfigsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const query = listSystemConfigsSchema.parse(request.query);
    
    const result = await systemConfigService.listConfigs({
      category: query.category,
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    
    return reply.status(200).send({
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    logger.error('Failed to list system configs', {
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
        message: 'Failed to list system configs',
      },
    });
  }
}

/**
 * Get system config by category and key
 * GET /sp-admin/system-configs/:category/:key
 * WHY: SP-Admin xem chi tiết config
 */
export async function getSystemConfigHandler(
  request: FastifyRequest<{
    Params: {
      category: string;
      key: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { category, key } = request.params;
    
    const config = await systemConfigService.getConfig(
      category as any,
      key
    );
    
    // Return 200 with null value if config doesn't exist (for AI config, allow empty)
    if (!config) {
      return reply.status(200).send({
        data: {
          category,
          key,
          value: null,
          type: 'string',
        },
      });
    }
    
    return reply.status(200).send({
      data: {
        category,
        key,
        value: config.value,
        type: config.type,
      },
    });
  } catch (error) {
    logger.error('Failed to get system config', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return reply.status(500).send({
      error: {
        message: 'Failed to get system config',
      },
    });
  }
}

/**
 * Create system config
 * POST /sp-admin/system-configs
 * WHY: SP-Admin tạo config mới
 */
export async function createSystemConfigHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;
    
    const body = createSystemConfigSchema.parse(request.body);
    
    const config = await systemConfigService.createConfig(
      body.category,
      body.key,
      body.value,
      body.type,
      body.description,
      body.isEditable,
      userId
    );
    
    return reply.status(201).send({
      data: config,
    });
  } catch (error) {
    logger.error('Failed to create system config', {
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
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return reply.status(409).send({
        error: {
          message: 'System config already exists',
        },
      });
    }
    
    return reply.status(500).send({
      error: {
        message: 'Failed to create system config',
      },
    });
  }
}

/**
 * Update system config
 * PATCH /sp-admin/system-configs/:category/:key
 * WHY: SP-Admin update config
 */
export async function updateSystemConfigHandler(
  request: FastifyRequest<{
    Params: {
      category: string;
      key: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user?.userId;
    
    const { category, key } = request.params;
    const body = updateSystemConfigSchema.parse(request.body);
    
    const config = await systemConfigService.updateConfig(
      category as any,
      key,
      {
        value: body.value,
        description: body.description,
        isEditable: body.isEditable,
      },
      userId
    );
    
    return reply.status(200).send({
      data: config,
    });
  } catch (error) {
    logger.error('Failed to update system config', {
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
    
    // Config will be auto-created if doesn't exist, so no need for 404 check
    
    if (error instanceof Error && error.message.includes('not editable')) {
      return reply.status(403).send({
        error: {
          message: 'System config is not editable',
        },
      });
    }
    
    return reply.status(500).send({
      error: {
        message: 'Failed to update system config',
      },
    });
  }
}

/**
 * Delete system config
 * DELETE /sp-admin/system-configs/:category/:key
 * WHY: SP-Admin xóa config
 */
export async function deleteSystemConfigHandler(
  request: FastifyRequest<{
    Params: {
      category: string;
      key: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { category, key } = request.params;
    
    await systemConfigService.deleteConfig(
      category as any,
      key
    );
    
    return reply.status(204).send();
  } catch (error) {
    logger.error('Failed to delete system config', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    if (error instanceof Error && error.message.includes('not found')) {
      return reply.status(404).send({
        error: {
          message: 'System config not found',
        },
      });
    }
    
    if (error instanceof Error && error.message.includes('not editable')) {
      return reply.status(403).send({
        error: {
          message: 'System config is not editable',
        },
      });
    }
    
    return reply.status(500).send({
      error: {
        message: 'Failed to delete system config',
      },
    });
  }
}

/**
 * Initialize default configs
 * POST /sp-admin/system-configs/initialize
 * WHY: SP-Admin khởi tạo default configs
 */
export async function initializeSystemConfigsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await systemConfigService.initializeDefaultConfigs();
    
    return reply.status(200).send({
      message: 'Default system configs initialized successfully',
    });
  } catch (error) {
    logger.error('Failed to initialize default system configs', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return reply.status(500).send({
      error: {
        message: 'Failed to initialize default system configs',
      },
    });
  }
}

