/**
 * Auto-Setup Service
 * 
 * WHY: Automate onboarding workflow
 * - Create chatbot
 * - Connect platforms
 * - Upload knowledge base (nếu có)
 * - Configure AI settings
 */

import { logger } from '../../infrastructure/logger';
import { prisma } from '../../infrastructure/database';
import { GeneratedConfig } from './config-generator.service';
import { platformManager } from '../platform-manager.service';
import type { PlatformConnectionConfig, PlatformType } from '../../types/platform';

/**
 * Setup Progress
 */
export interface SetupProgress {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
  error?: string;
}

/**
 * Setup Result
 */
export interface SetupResult {
  success: boolean;
  chatbotId?: string;
  platformConnections?: Array<{
    platform: string;
    connectionId: string;
    status: string;
  }>;
  errors?: Array<{
    step: string;
    error: string;
  }>;
}

/**
 * Auto-Setup Service
 * WHY: Execute automated onboarding workflow
 */
export class AutoSetupService {
  /**
   * Execute auto-setup workflow
   */
  async executeSetup(
    tenantId: string,
    config: GeneratedConfig,
    onProgress?: (progress: SetupProgress) => void
  ): Promise<SetupResult> {
    const result: SetupResult = {
      success: false,
      errors: [],
    };

    try {
      // Step 1: Create chatbot
      onProgress?.({
        step: 'create_chatbot',
        status: 'in_progress',
        message: 'Creating chatbot...',
      });

      const chatbot = await this.createChatbot(tenantId, config.chatbot);
      result.chatbotId = chatbot.id;

      onProgress?.({
        step: 'create_chatbot',
        status: 'completed',
        message: `Chatbot "${chatbot.name}" created successfully`,
      });

      // Step 2: Connect platforms
      if (config.platforms.length > 0) {
        onProgress?.({
          step: 'connect_platforms',
          status: 'in_progress',
          message: `Connecting ${config.platforms.length} platform(s)...`,
        });

        const platformConnections = await this.connectPlatforms(
          tenantId,
          chatbot.id,
          config.platforms,
          onProgress
        );
        result.platformConnections = platformConnections;
      }

      // Step 3: Upload knowledge base (nếu có)
      if (config.knowledgeBase) {
        onProgress?.({
          step: 'upload_knowledge_base',
          status: 'in_progress',
          message: 'Uploading knowledge base...',
        });

        // TODO: Implement knowledge base upload
        // For now, just log
        logger.info('Knowledge base upload not yet implemented', {
          type: config.knowledgeBase.type,
        });

        onProgress?.({
          step: 'upload_knowledge_base',
          status: 'completed',
          message: 'Knowledge base upload skipped (not yet implemented)',
        });
      }

      result.success = true;
      logger.info('Auto-setup completed successfully', {
        tenantId,
        chatbotId: chatbot.id,
        platformsCount: config.platforms.length,
      });

      return result;
    } catch (error) {
      logger.error('Auto-setup failed:', error);
      result.errors?.push({
        step: 'auto_setup',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      onProgress?.({
        step: 'auto_setup',
        status: 'failed',
        message: 'Auto-setup failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return result;
    }
  }

  /**
   * Create chatbot
   */
  private async createChatbot(
    tenantId: string,
    chatbotConfig: GeneratedConfig['chatbot']
  ) {
    try {
      const chatbot = await prisma.chatbot.create({
        data: {
          tenantId,
          name: chatbotConfig.name,
          description: chatbotConfig.description,
          systemPrompt: chatbotConfig.systemPrompt,
          aiModel: chatbotConfig.aiModel,
          temperature: chatbotConfig.temperature,
          maxTokens: chatbotConfig.maxTokens,
          isActive: chatbotConfig.isActive,
        },
      });

      logger.info('Chatbot created', { chatbotId: chatbot.id, tenantId });
      return chatbot;
    } catch (error) {
      logger.error('Error creating chatbot:', error);
      throw new Error(`Failed to create chatbot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Connect platforms
   */
  private async connectPlatforms(
    _tenantId: string,
    chatbotId: string,
    platforms: GeneratedConfig['platforms'],
    onProgress?: (progress: SetupProgress) => void
  ): Promise<Array<{ platform: string; connectionId: string; status: string }>> {
    const connections: Array<{ platform: string; connectionId: string; status: string }> = [];

    for (const platformConfig of platforms) {
      try {
        onProgress?.({
          step: `connect_platform_${platformConfig.platform}`,
          status: 'in_progress',
          message: `Connecting ${platformConfig.platform}...`,
        });

        // Create platform connection record
        // Note: Prisma schema uses string for platform, but we validate it's a valid PlatformType
        const connection = await prisma.platformConnection.create({
          data: {
            chatbotId,
            platform: platformConfig.platform as any, // Prisma expects string, but we validate it's PlatformType
            status: 'disconnected',
            credentials: (platformConfig.credentials || {}) as any, // Prisma Json type
          },
        });

        // Attempt to connect
        try {
          const connectionConfig: PlatformConnectionConfig = {
            platform: platformConfig.platform as PlatformType,
            credentials: {
              connectionId: connection.id,
              ...platformConfig.credentials,
            },
          };

          await platformManager.connectPlatform(connection.id, connectionConfig);

          // Update connection status
          await prisma.platformConnection.update({
            where: { id: connection.id },
            data: { status: 'connected' },
          });

          connections.push({
            platform: platformConfig.platform,
            connectionId: connection.id,
            status: 'connected',
          });

          onProgress?.({
            step: `connect_platform_${platformConfig.platform}`,
            status: 'completed',
            message: `${platformConfig.platform} connected successfully`,
          });
        } catch (connectError) {
          logger.error(`Failed to connect ${platformConfig.platform}:`, connectError);

          // Update connection status
          await prisma.platformConnection.update({
            where: { id: connection.id },
            data: { status: 'error' },
          });

          connections.push({
            platform: platformConfig.platform,
            connectionId: connection.id,
            status: 'error',
          });

          onProgress?.({
            step: `connect_platform_${platformConfig.platform}`,
            status: 'failed',
            message: `Failed to connect ${platformConfig.platform}`,
            error: connectError instanceof Error ? connectError.message : 'Unknown error',
          });
        }
      } catch (error) {
        logger.error(`Error setting up platform ${platformConfig.platform}:`, error);
        onProgress?.({
          step: `connect_platform_${platformConfig.platform}`,
          status: 'failed',
          message: `Error setting up ${platformConfig.platform}`,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return connections;
  }
}

// Export singleton instance
export const autoSetupService = new AutoSetupService();

