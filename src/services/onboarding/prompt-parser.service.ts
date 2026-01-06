/**
 * Prompt Parser Service
 * 
 * WHY: Parse user prompts và extract onboarding intent
 * - Use OpenAI Function Calling để extract structured data
 * - Map natural language to configuration
 * - Validate extracted data
 */

import { logger } from '../../infrastructure/logger';
import { OpenAI } from 'openai';
import { config } from '../../infrastructure/config';
import { modelService } from '../ai/model.service';

/**
 * Onboarding Intent từ parsed prompt
 */
export interface OnboardingIntent {
  chatbotName?: string;
  chatbotDescription?: string;
  platforms?: Array<{
    platform: string;
    credentials?: Record<string, unknown>;
  }>;
  systemPrompt?: string;
  aiModel?: string;
  temperature?: number;
  maxTokens?: number;
  knowledgeBase?: {
    type: 'url' | 'text' | 'file';
    content?: string;
    url?: string;
  };
}

/**
 * Prompt Parser Service
 * WHY: Parse natural language prompts thành structured onboarding intent
 */
export class PromptParserService {
  private openai: OpenAI;

  constructor() {
    const apiKey = config.proxy.apiKey || config.openai.apiKey;
    const baseURL = config.proxy.apiBase || 'https://api.openai.com/v1';
    
    if (!apiKey) {
      throw new Error('Either PROXY_API_KEY or OPENAI_API_KEY must be set');
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL,
    });
  }

  /**
   * Parse user prompt
   * WHY: Extract onboarding intent từ natural language
   */
  async parsePrompt(userPrompt: string): Promise<OnboardingIntent> {
    try {
      logger.info('Parsing onboarding prompt', { promptLength: userPrompt.length });

      // Get recommended model
      const recommendedModels = await modelService.getRecommendedModels();
      const model = recommendedModels[0]?.name || 'gpt-4o-mini';

      // Call OpenAI với function calling
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an assistant that helps users set up chatbots. Parse the user's prompt and extract the following information:
- Chatbot name and description
- Platforms to connect (WhatsApp, Facebook, Instagram, TikTok, Zalo, Shopee, Lazada)
- System prompt for the chatbot
- AI model preferences
- Knowledge base sources (URLs, text, or files)

Be specific and extract all relevant information from the user's prompt.`,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        functions: [this.getOnboardingFunctionSchema()],
        function_call: { name: 'extract_onboarding_intent' },
        temperature: 0.3, // Lower temperature for more consistent parsing
      });

      const functionCall = response.choices[0].message.function_call;
      if (!functionCall || functionCall.name !== 'extract_onboarding_intent') {
        throw new Error('Failed to extract onboarding intent from prompt');
      }

      const parsedIntent = JSON.parse(functionCall.arguments) as OnboardingIntent;

      // Validate parsed intent
      this.validateIntent(parsedIntent);

      logger.info('Successfully parsed onboarding prompt', {
        hasChatbotName: !!parsedIntent.chatbotName,
        platformsCount: parsedIntent.platforms?.length || 0,
        hasSystemPrompt: !!parsedIntent.systemPrompt,
      });

      return parsedIntent;
    } catch (error) {
      logger.error('Error parsing prompt:', error);
      throw new Error(`Failed to parse prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get OpenAI function schema for onboarding
   */
  private getOnboardingFunctionSchema() {
    return {
      name: 'extract_onboarding_intent',
      description: 'Extract onboarding intent from user prompt',
      parameters: {
        type: 'object',
        properties: {
          chatbotName: {
            type: 'string',
            description: 'Name of the chatbot',
          },
          chatbotDescription: {
            type: 'string',
            description: 'Description of what the chatbot does',
          },
          platforms: {
            type: 'array',
            description: 'List of platforms to connect',
            items: {
              type: 'object',
              properties: {
                platform: {
                  type: 'string',
                  enum: ['whatsapp', 'facebook', 'instagram', 'tiktok', 'zalo', 'shopee', 'lazada'],
                  description: 'Platform name',
                },
                credentials: {
                  type: 'object',
                  description: 'Platform credentials if mentioned',
                  additionalProperties: true,
                },
              },
              required: ['platform'],
            },
          },
          systemPrompt: {
            type: 'string',
            description: 'System prompt for the chatbot (custom instructions)',
          },
          aiModel: {
            type: 'string',
            description: 'Preferred AI model (e.g., gpt-4o-mini, gpt-4o, deepseek-chat)',
          },
          temperature: {
            type: 'number',
            description: 'Temperature for AI responses (0-2)',
            minimum: 0,
            maximum: 2,
          },
          maxTokens: {
            type: 'number',
            description: 'Maximum tokens per response',
            minimum: 1,
            maximum: 4000,
          },
          knowledgeBase: {
            type: 'object',
            description: 'Knowledge base source',
            properties: {
              type: {
                type: 'string',
                enum: ['url', 'text', 'file'],
                description: 'Type of knowledge base',
              },
              content: {
                type: 'string',
                description: 'Text content or file content',
              },
              url: {
                type: 'string',
                description: 'URL to knowledge base document',
              },
            },
          },
        },
      },
    };
  }

  /**
   * Validate parsed intent
   */
  private validateIntent(intent: OnboardingIntent): void {
    // Validate platforms
    if (intent.platforms && intent.platforms.length > 0) {
      const validPlatforms = ['whatsapp', 'facebook', 'instagram', 'tiktok', 'zalo', 'shopee', 'lazada'];
      for (const platform of intent.platforms) {
        if (!validPlatforms.includes(platform.platform)) {
          throw new Error(`Invalid platform: ${platform.platform}`);
        }
      }
    }

    // Validate AI model if provided (async validation sẽ được làm ở config generator)
    // Skip validation here để tránh async trong validation

    // Validate temperature
    if (intent.temperature !== undefined) {
      if (intent.temperature < 0 || intent.temperature > 2) {
        throw new Error('Temperature must be between 0 and 2');
      }
    }

    // Validate maxTokens
    if (intent.maxTokens !== undefined) {
      if (intent.maxTokens < 1 || intent.maxTokens > 4000) {
        throw new Error('maxTokens must be between 1 and 4000');
      }
    }

    // Validate knowledge base
    if (intent.knowledgeBase) {
      if (intent.knowledgeBase.type === 'url' && !intent.knowledgeBase.url) {
        throw new Error('Knowledge base URL is required when type is "url"');
      }
      if (intent.knowledgeBase.type === 'text' && !intent.knowledgeBase.content) {
        throw new Error('Knowledge base content is required when type is "text"');
      }
    }
  }

  /**
   * Generate system prompt từ business description
   * WHY: Auto-generate system prompt nếu user không provide
   */
  async generateSystemPrompt(businessDescription: string): Promise<string> {
    try {
      const recommendedModels = await modelService.getRecommendedModels();
      const model = recommendedModels[0]?.name || 'gpt-4o-mini';

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at writing system prompts for chatbots. Generate a clear, professional system prompt based on the business description.',
          },
          {
            role: 'user',
            content: `Generate a system prompt for a chatbot that: ${businessDescription}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const generatedPrompt = response.choices[0].message.content || '';
      logger.info('Generated system prompt', { length: generatedPrompt.length });
      return generatedPrompt;
    } catch (error) {
      logger.error('Error generating system prompt:', error);
      // Fallback to default prompt
      return `You are a helpful assistant for ${businessDescription}. Answer questions clearly and professionally.`;
    }
  }
}

// Export singleton instance
export const promptParserService = new PromptParserService();

