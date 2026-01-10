/**
 * Model Test Controller
 * 
 * WHY: API endpoint để test models
 * - Test model availability
 * - Test generate response
 * - Report results
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { modelService } from '../../services/ai/model.service';
import { AIProviderFactory } from '../../services/ai/ai-provider.factory';
import { logger } from '../../infrastructure/logger';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

interface TestResult {
  model: string;
  available: boolean;
  provider: string;
  testResponse?: {
    success: boolean;
    content?: string;
    error?: string;
    tokens?: number;
  };
}

/**
 * Test một model
 */
async function testModel(modelName: string): Promise<TestResult> {
  const result: TestResult = {
    model: modelName,
    available: false,
    provider: 'unknown',
  };

  try {
    // 1. Check availability
    const isAvailable = await modelService.isModelAvailable(modelName);
    result.available = isAvailable;

    if (!isAvailable) {
      return result;
    }

    // 2. Get provider
    const provider = AIProviderFactory.getProviderFromModel(modelName);
    result.provider = provider;

    // 3. Test generate response
    try {
      const aiProvider = AIProviderFactory.create(provider);

      const testMessage = 'Xin chào, bạn có khỏe không?';
      const response = await aiProvider.generateResponse(
        [
          {
            role: 'system',
            content: 'Bạn là một chatbot thân thiện.',
          },
          {
            role: 'user',
            content: testMessage,
          },
        ],
        {
          model: modelName,
          temperature: 0.7,
          maxTokens: 100,
        }
      );

      result.testResponse = {
        success: true,
        content: response.content.substring(0, 200), // First 200 chars
        tokens: response.tokens?.total,
      };
    } catch (error) {
      result.testResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logger.error(`Model ${modelName} test failed:`, error);
    }
  } catch (error) {
    logger.error(`Error testing model ${modelName}:`, error);
    result.testResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  return result;
}

/**
 * Test single model
 */
export async function testSingleModelHandler(
  request: FastifyRequest<{ Params: { modelName: string } }>,
  reply: FastifyReply
) {
  try {
    const { modelName } = request.params;

    const result = await testModel(modelName);

    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'Model test completed successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Test model error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

/**
 * Test all recommended models
 */
export async function testAllModelsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const recommendedModels = await modelService.getRecommendedModels();
    const modelNames = recommendedModels.map((m) => m.name);

    logger.info(`Testing ${modelNames.length} models...`);

    // Test từng model (parallel với limit)
    const results: TestResult[] = [];
    const batchSize = 3; // Test 3 models cùng lúc để không quá tải

    for (let i = 0; i < modelNames.length; i += batchSize) {
      const batch = modelNames.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((model) => testModel(model))
      );
      results.push(...batchResults);
    }

    // Summary
    const working = results.filter((r) => r.available && r.testResponse?.success);
    const failed = results.filter((r) => r.available && !r.testResponse?.success);
    const notAvailable = results.filter((r) => !r.available);

    const formattedResponse = formatSuccessResponse(
      {
        results,
        summary: {
          total: results.length,
          working: working.length,
          failed: failed.length,
          notAvailable: notAvailable.length,
        },
        working: working.map((r) => ({
          model: r.model,
          provider: r.provider,
        })),
        failed: failed.map((r) => ({
          model: r.model,
          error: r.testResponse?.error,
        })),
        notAvailable: notAvailable.map((r) => r.model),
      },
      200,
      'All models test completed successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Test all models error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}


