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
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

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
    
    const formattedResponse = formatSuccessResponse(
      result.data,
      200,
      'System configs retrieved successfully',
      result.meta
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to list system configs', {
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
        'Failed to list system configs',
        500
      )
    );
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
      const formattedResponse = formatSuccessResponse(
        {
          category,
          key,
          value: null,
          type: 'string',
        },
        200,
        'System config retrieved successfully'
      );
      return reply.status(200).send(formattedResponse);
    }
    
    const formattedResponse = formatSuccessResponse(
      {
        category,
        key,
        value: config.value,
        type: config.type,
      },
      200,
      'System config retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get system config', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get system config',
        500
      )
    );
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
    
    const formattedResponse = formatSuccessResponse(
      config,
      201,
      'System config created successfully'
    );
    return reply.status(201).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to create system config', {
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
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return reply.status(409).send(
        formatErrorResponse(
          'CONFLICT_ERROR',
          'System config already exists',
          409
        )
      );
    }
    
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to create system config',
        500
      )
    );
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
    
    const formattedResponse = formatSuccessResponse(
      config,
      200,
      'System config updated successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to update system config', {
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
    
    // Config will be auto-created if doesn't exist, so no need for 404 check
    
    if (error instanceof Error && error.message.includes('not editable')) {
      return reply.status(403).send(
        formatErrorResponse(
          'FORBIDDEN_ERROR',
          'System config is not editable',
          403
        )
      );
    }
    
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to update system config',
        500
      )
    );
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
    
    const formattedResponse = formatSuccessResponse(
      null,
      204,
      'System config deleted successfully'
    );
    return reply.status(204).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to delete system config', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    if (error instanceof Error && error.message.includes('not found')) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          'System config not found',
          404
        )
      );
    }
    
    if (error instanceof Error && error.message.includes('not editable')) {
      return reply.status(403).send(
        formatErrorResponse(
          'FORBIDDEN_ERROR',
          'System config is not editable',
          403
        )
      );
    }
    
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to delete system config',
        500
      )
    );
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
    
    const formattedResponse = formatSuccessResponse(
      null,
      200,
      'Default system configs initialized successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to initialize default system configs', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to initialize default system configs',
        500
      )
    );
  }
}

