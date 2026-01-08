/**
 * Onboarding Controller
 * 
 * WHY: API endpoints cho prompt-based onboarding
 * - Parse user prompt
 * - Generate configuration
 * - Execute auto-setup
 * - Return progress updates
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { logger } from '../../infrastructure/logger';
import { requireTenant } from '../../middleware/tenant';
import { promptParserService } from '../../services/onboarding/prompt-parser.service';
import { configGeneratorService } from '../../services/onboarding/config-generator.service';
import { autoSetupService } from '../../services/onboarding/auto-setup.service';
import type { SetupProgress } from '../../services/onboarding/auto-setup.service';

// Validation schemas
const onboardingSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  autoExecute: z.boolean().optional().default(false),
});

/**
 * Onboard from prompt
 */
export async function onboardFromPromptHandler(
  request: FastifyRequest<{
    Body: {
      prompt: string;
      autoExecute?: boolean;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);
    const validated = onboardingSchema.parse(request.body);

    logger.info('Onboarding request received', {
      tenantId: tenant.id,
      promptLength: validated.prompt.length,
      autoExecute: validated.autoExecute,
    });

    // Step 1: Parse prompt
    const intent = await promptParserService.parsePrompt(validated.prompt);

    // Step 2: Generate configuration
    const config = await configGeneratorService.generateConfig(intent);

    // If autoExecute is false, return config for confirmation
    if (!validated.autoExecute) {
      return reply.status(200).send({
        success: true,
        data: {
          intent,
          config,
          message: 'Configuration generated. Review and confirm to proceed.',
        },
      });
    }

    // Step 3: Execute auto-setup
    const progressUpdates: SetupProgress[] = [];
    const result = await autoSetupService.executeSetup(
      tenant.id,
      config,
      (progress) => {
        progressUpdates.push(progress);
        // TODO: Emit WebSocket event for real-time updates
      }
    );

    if (result.success) {
      return reply.status(200).send({
        success: true,
        data: {
          chatbotId: result.chatbotId,
          platformConnections: result.platformConnections,
          progress: progressUpdates,
          message: 'Onboarding completed successfully',
        },
      });
    } else {
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Onboarding failed',
          errors: result.errors,
          progress: progressUpdates,
        },
      });
    }
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

    logger.error('Onboarding error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Confirm and execute onboarding
 */
export async function confirmOnboardingHandler(
  request: FastifyRequest<{
    Body: {
      config: any; // GeneratedConfig
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenant = requireTenant(request);

    const config = request.body.config;
    if (!config || !config.chatbot) {
      return reply.status(400).send({
        error: {
          message: 'Invalid configuration',
          statusCode: 400,
        },
      });
    }

    logger.info('Confirming onboarding', { tenantId: tenant.id });

    // Execute auto-setup
    const progressUpdates: SetupProgress[] = [];
    const result = await autoSetupService.executeSetup(
      tenant.id,
      config,
      (progress) => {
        progressUpdates.push(progress);
      }
    );

    if (result.success) {
      return reply.status(200).send({
        success: true,
        data: {
          chatbotId: result.chatbotId,
          platformConnections: result.platformConnections,
          progress: progressUpdates,
          message: 'Onboarding completed successfully',
        },
      });
    } else {
      return reply.status(500).send({
        success: false,
        error: {
          message: 'Onboarding failed',
          errors: result.errors,
          progress: progressUpdates,
        },
      });
    }
  } catch (error) {
    logger.error('Confirm onboarding error:', error);
    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

