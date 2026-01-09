/**
 * Model Service
 * 
 * WHY: Quản lý available models từ v98store
 * - Fetch available models
 * - Recommend models based on use case
 * - Model pricing info
 */

import axios from 'axios';
import { logger } from '../../infrastructure/logger';
import { systemConfigService } from '../system-config/system-config.service';
import { AI_CONFIG_KEYS, type AIModelConfig } from '../../types/system-config';

interface V98Model {
  name: string;
  uptime: number;
  status: number;
}

interface V98StatusResponse {
  success: boolean;
  data: Array<{
    categoryName: string;
    monitors: V98Model[];
  }>;
}

/**
 * Model definition type
 */
export interface RecommendedModel {
  name: string;
  displayName: string;
  description: string;
  provider: 'openai' | 'gemini' | 'deepseek';
  category: 'budget' | 'balanced' | 'premium';
  recommended: boolean;
  aliases?: string[];
}

/**
 * Recommended models cho chatbot (DEPRECATED - use System Config instead)
 * WHY: Fallback nếu System Config chưa có models
 * - Giá thành tốt
 * - Chất lượng ổn định
 * - Phù hợp cho chatbot
 */
export const RECOMMENDED_MODELS: RecommendedModel[] = [
  // OpenAI Models
  {
    name: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    description: 'Rẻ nhất, phù hợp cho chatbot cơ bản',
    provider: 'openai',
    category: 'budget',
    recommended: true,
  },
  {
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    description: 'Cân bằng giữa chất lượng và giá',
    provider: 'openai',
    category: 'balanced',
    recommended: true,
  },
  // Đã xóa: gpt-4.1-mini-2025-04-14 (không có sẵn trên v98store)
  {
    name: 'gpt-4.1-2025-04-14',
    displayName: 'GPT-4.1',
    description: 'Phiên bản mới nhất, chất lượng cao',
    provider: 'openai',
    category: 'premium',
    recommended: false,
    // Alias để dễ nhớ
    aliases: ['gpt-4.1', '4.1'],
  },
  {
    name: 'gpt-4',
    displayName: 'GPT-4',
    description: 'Model cổ điển, chất lượng tốt',
    provider: 'openai',
    category: 'premium',
    recommended: false,
  },
  // Gemini Models
  {
    name: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Nhanh, rẻ, phù hợp chatbot',
    provider: 'gemini',
    category: 'budget',
    recommended: true,
  },
  // Đã xóa: gemini-2.5-pro (rate limit issues)
  {
    name: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash Preview',
    description: 'Phiên bản preview mới nhất, nhanh',
    provider: 'gemini',
    category: 'budget',
    recommended: false,
  },
  // DeepSeek Models
  {
    name: 'deepseek-chat',
    displayName: 'DeepSeek Chat',
    description: 'Rất rẻ, chất lượng tốt',
    provider: 'deepseek',
    category: 'budget',
    recommended: true,
  },
  {
    name: 'deepseek-v3',
    displayName: 'DeepSeek V3',
    description: 'Phiên bản V3, chất lượng tốt hơn',
    provider: 'deepseek',
    category: 'balanced',
    recommended: false,
  },
  {
    name: 'deepseek-v3.1',
    displayName: 'DeepSeek V3.1',
    description: 'Phiên bản V3.1, cải tiến từ V3',
    provider: 'deepseek',
    category: 'balanced',
    recommended: false,
  },
  {
    name: 'deepseek-v3.2',
    displayName: 'DeepSeek V3.2',
    description: 'Phiên bản V3.2 mới nhất',
    provider: 'deepseek',
    category: 'balanced',
    recommended: false,
  },
  {
    name: 'deepseek-r1',
    displayName: 'DeepSeek R1',
    description: 'Model reasoning, phù hợp logic phức tạp',
    provider: 'deepseek',
    category: 'premium',
    recommended: false,
  },
] as const;

/**
 * Model Service
 */
export class ModelService {
  private readonly statusUrl = 'https://v98store.com/api/status';
  private cachedModels: V98Model[] | null = null;
  private cacheExpiry: number = 0;
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes
  private cachedConfigModels: AIModelConfig[] | null = null;
  private configModelsCacheExpiry: number = 0;
  private readonly configModelsCacheTTL = 1 * 60 * 1000; // 1 minute

  /**
   * Get models từ System Config
   * WHY: Đọc models từ System Config thay vì hardcode
   */
  async getConfigModels(): Promise<AIModelConfig[]> {
    // Check cache
    if (this.cachedConfigModels && Date.now() < this.configModelsCacheExpiry) {
      return this.cachedConfigModels;
    }

    try {
      const config = await systemConfigService.getConfig('ai', AI_CONFIG_KEYS.AI_MODELS_LIST);
      
      if (config && Array.isArray(config.value)) {
        const models = config.value as AIModelConfig[];
        this.cachedConfigModels = models;
        this.configModelsCacheExpiry = Date.now() + this.configModelsCacheTTL;
        return models;
      }
      
      // Fallback to hardcoded models nếu chưa có trong System Config
      logger.warn('No models found in System Config, using fallback');
      return this.getFallbackModels();
    } catch (error) {
      logger.error('Failed to get models from System Config', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.getFallbackModels();
    }
  }

  /**
   * Get fallback models (from hardcoded RECOMMENDED_MODELS)
   */
  private getFallbackModels(): AIModelConfig[] {
    // Convert RECOMMENDED_MODELS to AIModelConfig format
    // Note: Fallback models không có pricing info đầy đủ
    return RECOMMENDED_MODELS.map((model) => ({
      name: model.name,
      displayName: model.displayName,
      description: model.description,
      provider: model.provider,
      category: model.category,
      recommended: model.recommended,
      aliases: model.aliases,
      // Default pricing (sẽ được update từ System Config)
      modelRatio: 1,
      outputRatio: 4,
      cacheRatio: 1,
      cacheCreationRatio: 1,
      groupRatio: 1,
      promptPrice: 0,
      completionPrice: 0,
      cachePrice: 0,
      cacheCreationPrice: 0,
    }));
  }

  /**
   * Get available models từ v98store
   * WHY: Fetch real-time model status
   * Filter chỉ models từ OpenAI, Gemini, DeepSeek
   */
  async getAvailableModels(): Promise<V98Model[]> {
    // Check cache
    if (this.cachedModels && Date.now() < this.cacheExpiry) {
      return this.cachedModels;
    }

    try {
      const response = await axios.get<V98StatusResponse>(this.statusUrl);

      if (!response.data.success || !response.data.data.length) {
        logger.warn('Failed to fetch models from v98store');
        return this.cachedModels || [];
      }

      // Extract all models
      const allModels: V98Model[] = [];
      for (const category of response.data.data) {
        allModels.push(...category.monitors);
      }

      // Filter only active models (status === 1)
      const activeModels = allModels.filter((m) => m.status === 1);

      // Filter chỉ models từ OpenAI, Gemini, DeepSeek
      const filteredModels = activeModels.filter((m) => {
        const modelName = m.name.trim().toLowerCase();
        return (
          modelName.startsWith('gpt-') ||
          modelName.startsWith('o1') ||
          modelName.startsWith('gemini') ||
          modelName.startsWith('deepseek-') ||
          modelName.startsWith('deepseek-v') ||
          modelName.startsWith('deepseek-r')
        );
      });

      // Cache results
      this.cachedModels = filteredModels;
      this.cacheExpiry = Date.now() + this.cacheTTL;

      return filteredModels;
    } catch (error) {
      logger.error('Failed to fetch models from v98store:', error);
      // Return cached models nếu có, hoặc empty array
      return this.cachedModels || [];
    }
  }

  /**
   * Get recommended models với status
   * WHY: Show recommended models với availability
   */
  async getRecommendedModels(): Promise<
    Array<{
      name: string;
      displayName: string;
      description: string;
      provider: string;
      category: string;
      recommended: boolean;
      available: boolean;
      uptime?: number;
    }>
  > {
    const availableModels = await this.getAvailableModels();
    const availableModelNames = new Set(
      availableModels.map((m) => m.name.trim())
    );

    // Get models from System Config
    const configModels = await this.getConfigModels();

    return configModels.map((model) => {
      const availableModel = availableModels.find(
        (m) => m.name.trim() === model.name
      );

      return {
        name: model.name,
        displayName: model.displayName,
        description: model.description,
        provider: model.provider,
        category: model.category,
        recommended: model.recommended,
        available: availableModelNames.has(model.name),
        uptime: availableModel?.uptime,
      };
    });
  }

  /**
   * Check if model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    const availableModels = await this.getAvailableModels();
    return availableModels.some((m) => m.name.trim() === modelName);
  }

  /**
   * Get model info
   */
  async getModelInfo(modelName: string): Promise<V98Model | null> {
    const availableModels = await this.getAvailableModels();
    return (
      availableModels.find((m) => m.name.trim() === modelName) || null
    );
  }

  /**
   * Resolve model name từ alias hoặc display name
   * WHY: Cho phép user dùng tên dễ nhớ như "gpt-4.1" thay vì "gpt-4.1-2025-04-14"
   * 
   * @param input - Model name, alias, hoặc display name
   * @returns Actual model name hoặc null nếu không tìm thấy
   */
  async resolveModelName(input: string): Promise<string | null> {
    const configModels = await this.getConfigModels();
    
    // Check exact match first
    const exactMatch = configModels.find(
      (m) => m.name === input || m.displayName === input
    );
    if (exactMatch) {
      return exactMatch.name;
    }

    // Check aliases (case-insensitive)
    const aliasMatch = configModels.find((m) =>
      m.aliases?.some((alias) => alias.toLowerCase() === input.toLowerCase())
    );
    if (aliasMatch) {
      return aliasMatch.name;
    }

    // Check partial match với display name
    const displayMatch = configModels.find((m) =>
      m.displayName.toLowerCase().includes(input.toLowerCase()) ||
      input.toLowerCase().includes(m.displayName.toLowerCase())
    );
    if (displayMatch) {
      return displayMatch.name;
    }

    return null;
  }

  /**
   * Get model by name, alias, or display name
   * 
   * @param input - Model name, alias, hoặc display name
   * @returns Model definition hoặc null
   */
  async getModelByName(input: string): Promise<AIModelConfig | null> {
    const resolvedName = await this.resolveModelName(input);
    if (!resolvedName) {
      return null;
    }

    const configModels = await this.getConfigModels();
    return configModels.find((m) => m.name === resolvedName) || null;
  }
}

// Export singleton instance
export const modelService = new ModelService();

