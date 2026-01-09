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
      return reply.status(200).send({
        data: [],
      });
    }
    
    return reply.status(200).send({
      data: config.value as AIModelConfig[],
    });
  } catch (error) {
    logger.error('Failed to list AI models', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return reply.status(500).send({
      error: {
        message: 'Failed to list AI models',
      },
    });
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
      return reply.status(404).send({
        error: {
          message: 'Model not found',
        },
      });
    }
    
    const models = config.value as AIModelConfig[];
    const model = models.find((m) => m.name === name);
    
    if (!model) {
      return reply.status(404).send({
        error: {
          message: 'Model not found',
        },
      });
    }
    
    return reply.status(200).send({
      data: model,
    });
  } catch (error) {
    logger.error('Failed to get AI model', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return reply.status(500).send({
      error: {
        message: 'Failed to get AI model',
      },
    });
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
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
        },
      });
    }
    
    // Get current models
    const config = await systemConfigService.getConfig('ai', AI_CONFIG_KEYS.AI_MODELS_LIST);
    const models: AIModelConfig[] = config && Array.isArray(config.value) 
      ? (config.value as AIModelConfig[])
      : [];
    
    // Check if model already exists
    if (models.some((m) => m.name === validated.name)) {
      return reply.status(409).send({
        error: {
          message: 'Model already exists',
        },
      });
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
    
    return reply.status(201).send({
      data: validated,
    });
  } catch (error) {
    logger.error('Failed to create AI model', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid model data',
          details: error.errors,
        },
      });
    }
    
    return reply.status(500).send({
      error: {
        message: 'Failed to create AI model',
      },
    });
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
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
        },
      });
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
    
    return reply.status(200).send({
      data: validated,
    });
  } catch (error) {
    logger.error('Failed to update AI model', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid model data',
          details: error.errors,
        },
      });
    }
    
    return reply.status(500).send({
      error: {
        message: 'Failed to update AI model',
      },
    });
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
      return reply.status(401).send({
        error: {
          message: 'Unauthorized',
        },
      });
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
    
    // Remove model
    models.splice(modelIndex, 1);
    
    // Update config
    await systemConfigService.updateConfig(
      'ai',
      AI_CONFIG_KEYS.AI_MODELS_LIST,
      { value: models },
      userId
    );
    
    return reply.status(200).send({
      message: 'Model deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete AI model', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    return reply.status(500).send({
      error: {
        message: 'Failed to delete AI model',
      },
    });
  }
}

