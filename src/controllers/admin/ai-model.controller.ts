/**
 * AI Model Controller (SP-Admin only)
 * 
 * WHY: API handlers cho AI Model management
 * - CRUD operations cho models
 * - Chỉ SP-Admin có quyền truy cập
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { systemConfigService } from '../../services/system-config/system-config.service';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest } from '../../types/auth';
import { AI_CONFIG_KEYS, type AIModelConfig } from '../../types/system-config';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

/**
 * Model validation schema
 */
const modelSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string(),
  provider: z.enum(['openai', 'gemini', 'deepseek']),
  category: z.enum(['budget', 'balanced', 'premium']),
  recommended: z.boolean(),
  modelRatio: z.number().positive(),
  outputRatio: z.number().positive(),
  cacheRatio: z.number().positive(),
  cacheCreationRatio: z.number().positive(),
  groupRatio: z.number().positive(),
  promptPrice: z.number().nonnegative(),
  completionPrice: z.number().nonnegative(),
  cachePrice: z.number().nonnegative(),
  cacheCreationPrice: z.number().nonnegative(),
  aliases: z.array(z.string()).optional(),
});

/**
 * Get all models
 * GET /sp-admin/ai-models
 */
export async function listAIModelsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const config = await systemConfigService.getConfig('ai', AI_CONFIG_KEYS.AI_MODELS_LIST);
    
    if (!config || !Array.isArray(config.value)) {
      const formattedResponse = formatSuccessResponse(
        [],
        200,
        'AI models retrieved successfully'
      );
      return reply.status(200).send(formattedResponse);
    }
    
    const formattedResponse = formatSuccessResponse(
      config.value as AIModelConfig[],
      200,
      'AI models retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to list AI models', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to list AI models',
        500
      )
    );
  }
}

/**
 * Get model by name
 * GET /sp-admin/ai-models/:name
 */
export async function getAIModelHandler(
  request: FastifyRequest<{
    Params: {
      name: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { name } = request.params;
    
    const config = await systemConfigService.getConfig('ai', AI_CONFIG_KEYS.AI_MODELS_LIST);
    
    if (!config || !Array.isArray(config.value)) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          'Model not found',
          404
        )
      );
    }
    
    const models = config.value as AIModelConfig[];
    const model = models.find((m) => m.name === name);
    
    if (!model) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          'Model not found',
          404
        )
      );
    }
    
    const formattedResponse = formatSuccessResponse(
      model,
      200,
      'AI model retrieved successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to get AI model', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to get AI model',
        500
      )
    );
  }
}

/**
 * Create new model
 * POST /sp-admin/ai-models
 */
export async function createAIModelHandler(
  request: FastifyRequest<{ Body: AIModelConfig }>,
  reply: FastifyReply
) {
  try {
    const validated = modelSchema.parse(request.body);
    const authRequest = request as unknown as AuthenticatedRequest<unknown, AIModelConfig>;
    const userId = authRequest.user?.userId;
    
    if (!userId) {
      return reply.status(401).send(
        formatErrorResponse(
          'AUTH_ERROR',
          'Unauthorized',
          401
        )
      );
    }
    
    // Get current models
    const config = await systemConfigService.getConfig('ai', AI_CONFIG_KEYS.AI_MODELS_LIST);
    const models: AIModelConfig[] = config && Array.isArray(config.value) 
      ? (config.value as AIModelConfig[])
      : [];
    
    // Check if model already exists
    if (models.some((m) => m.name === validated.name)) {
      return reply.status(409).send(
        formatErrorResponse(
          'CONFLICT_ERROR',
          'Model already exists',
          409
        )
      );
    }
    
    // Add new model
    models.push(validated);
    
    // Update config
    await systemConfigService.updateConfig(
      'ai',
      AI_CONFIG_KEYS.AI_MODELS_LIST,
      { value: models },
      userId
    );
    
    const formattedResponse = formatSuccessResponse(
      validated,
      201,
      'AI model created successfully'
    );
    return reply.status(201).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to create AI model', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid model data',
          400,
          error.errors
        )
      );
    }
    
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to create AI model',
        500
      )
    );
  }
}

/**
 * Update model
 * PATCH /sp-admin/ai-models/:name
 */
export async function updateAIModelHandler(
  request: FastifyRequest<{
    Params: { name: string };
    Body: Partial<AIModelConfig>;
  }>,
  reply: FastifyReply
) {
  try {
    const { name } = request.params;
    const authRequest = request as unknown as AuthenticatedRequest<
      { name: string },
      Partial<AIModelConfig>
    >;
    const userId = authRequest.user?.userId;
    
    if (!userId) {
      return reply.status(401).send(
        formatErrorResponse(
          'AUTH_ERROR',
          'Unauthorized',
          401
        )
      );
    }
    
    // Get current models
    const config = await systemConfigService.getConfig('ai', AI_CONFIG_KEYS.AI_MODELS_LIST);
    
    if (!config || !Array.isArray(config.value)) {
      return reply.status(404).send({
        error: {
          message: 'Models list not found',
        },
      });
    }
    
    const models: AIModelConfig[] = config.value as AIModelConfig[];
    const modelIndex = models.findIndex((m) => m.name === name);
    
    if (modelIndex === -1) {
      return reply.status(404).send({
        error: {
          message: 'Model not found',
        },
      });
    }
    
    // Update model (preserve name)
    const updatedModel = {
      ...models[modelIndex],
      ...request.body,
      name, // Don't allow changing name
    };
    
    // Validate updated model
    const validated = modelSchema.parse(updatedModel);
    
    // Update in array
    models[modelIndex] = validated;
    
    // Update config
    await systemConfigService.updateConfig(
      'ai',
      AI_CONFIG_KEYS.AI_MODELS_LIST,
      { value: models },
      userId
    );
    
    const formattedResponse = formatSuccessResponse(
      validated,
      200,
      'AI model updated successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to update AI model', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Invalid model data',
          400,
          error.errors
        )
      );
    }
    
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to update AI model',
        500
      )
    );
  }
}

/**
 * Delete model
 * DELETE /sp-admin/ai-models/:name
 */
export async function deleteAIModelHandler(
  request: FastifyRequest<{ Params: { name: string } }>,
  reply: FastifyReply
) {
  try {
    const { name } = request.params;
    const authRequest = request as unknown as AuthenticatedRequest<{ name: string }>;
    const userId = authRequest.user?.userId;
    
    if (!userId) {
      return reply.status(401).send(
        formatErrorResponse(
          'AUTH_ERROR',
          'Unauthorized',
          401
        )
      );
    }
    
    // Get current models
    const config = await systemConfigService.getConfig('ai', AI_CONFIG_KEYS.AI_MODELS_LIST);
    
    if (!config || !Array.isArray(config.value)) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          'Models list not found',
          404
        )
      );
    }
    
    const models: AIModelConfig[] = config.value as AIModelConfig[];
    const modelIndex = models.findIndex((m) => m.name === name);
    
    if (modelIndex === -1) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          'Model not found',
          404
        )
      );
    }
    
    // Remove model
    models.splice(modelIndex, 1);
    
    // Update config
    await systemConfigService.updateConfig(
      'ai',
      AI_CONFIG_KEYS.AI_MODELS_LIST,
      { value: models },
      userId
    );
    
    const formattedResponse = formatSuccessResponse(
      null,
      200,
      'Model deleted successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Failed to delete AI model', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Failed to delete AI model',
        500
      )
    );
  }
}

