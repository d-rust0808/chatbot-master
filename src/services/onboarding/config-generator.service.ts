/**
 * Config Generator Service
 * 
 * WHY: Generate chatbot configuration từ parsed intent
 * - Map intent to database schema
 * - Generate default values
 * - Validate configuration
 */

import { logger } from '../../infrastructure/logger';
import { OnboardingIntent } from './prompt-parser.service';
import { modelService } from '../ai/model.service';
import { promptParserService } from './prompt-parser.service';

/**
 * Generated Configuration
 */
export interface GeneratedConfig {
  chatbot: {
    name: string;
    description?: string;
    systemPrompt: string;
    aiModel: string;
    temperature: number;
    maxTokens: number;
    isActive: boolean;
  };
  platforms: Array<{
    platform: string;
    credentials?: Record<string, unknown>;
  }>;
  knowledgeBase?: {
    type: 'url' | 'text' | 'file';
    content?: string;
    url?: string;
  };
}

/**
 * Config Generator Service
 * WHY: Generate complete configuration từ onboarding intent
 */
export class ConfigGeneratorService {
  /**
   * Generate configuration từ intent
   */
  async generateConfig(intent: OnboardingIntent): Promise<GeneratedConfig> {
    try {
      logger.info('Generating configuration from intent', {
        hasChatbotName: !!intent.chatbotName,
        platformsCount: intent.platforms?.length || 0,
      });

      // Generate system prompt nếu chưa có
      let systemPrompt = intent.systemPrompt;
      if (!systemPrompt && intent.chatbotDescription) {
        systemPrompt = await promptParserService.generateSystemPrompt(intent.chatbotDescription);
      } else if (!systemPrompt) {
        systemPrompt = 'You are a helpful assistant. Answer questions clearly and professionally.';
      }

      // Get AI model
      const aiModel = intent.aiModel || await this.getDefaultModel();
      const temperature = intent.temperature ?? 0.7;
      const maxTokens = intent.maxTokens ?? 1000;

      // Generate chatbot config
      const chatbotConfig = {
        name: intent.chatbotName || 'My Chatbot',
        description: intent.chatbotDescription,
        systemPrompt,
        aiModel,
        temperature,
        maxTokens,
        isActive: true,
      };

      // Generate platforms config
      const platforms = intent.platforms || [];

      // Generate knowledge base config
      const knowledgeBase = intent.knowledgeBase;

      const config: GeneratedConfig = {
        chatbot: chatbotConfig,
        platforms,
        knowledgeBase,
      };

      // Validate config
      this.validateConfig(config);

      logger.info('Configuration generated successfully', {
        chatbotName: config.chatbot.name,
        platformsCount: config.platforms.length,
        hasKnowledgeBase: !!config.knowledgeBase,
      });

      return config;
    } catch (error) {
      logger.error('Error generating configuration:', error);
      throw error;
    }
  }

  /**
   * Get default AI model
   */
  private async getDefaultModel(): Promise<string> {
    const recommended = await modelService.getRecommendedModels();
    return recommended[0]?.name || 'gpt-4o-mini';
  }

  /**
   * Validate generated configuration
   */
  private validateConfig(config: GeneratedConfig): void {
    // Validate chatbot name
    if (!config.chatbot.name || config.chatbot.name.trim().length === 0) {
      throw new Error('Chatbot name is required');
    }

    if (config.chatbot.name.length > 100) {
      throw new Error('Chatbot name must be less than 100 characters');
    }

    // Validate system prompt
    if (!config.chatbot.systemPrompt || config.chatbot.systemPrompt.trim().length === 0) {
      throw new Error('System prompt is required');
    }

    if (config.chatbot.systemPrompt.length > 2000) {
      throw new Error('System prompt must be less than 2000 characters');
    }

    // Validate AI model (async - sẽ validate khi thực tế sử dụng)
    // Skip strict validation here, model service sẽ handle validation khi generate response

    // Validate temperature
    if (config.chatbot.temperature < 0 || config.chatbot.temperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }

    // Validate maxTokens
    if (config.chatbot.maxTokens < 1 || config.chatbot.maxTokens > 4000) {
      throw new Error('maxTokens must be between 1 and 4000');
    }

    // Validate platforms
    if (config.platforms.length === 0) {
      logger.warn('No platforms specified in configuration');
    }

    const validPlatforms = ['whatsapp', 'facebook', 'instagram', 'tiktok', 'zalo', 'shopee', 'lazada'];
    for (const platform of config.platforms) {
      if (!validPlatforms.includes(platform.platform)) {
        throw new Error(`Invalid platform: ${platform.platform}`);
      }
    }
  }
}

// Export singleton instance
export const configGeneratorService = new ConfigGeneratorService();

