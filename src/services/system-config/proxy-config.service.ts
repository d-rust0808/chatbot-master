/**
 * Proxy Config Service
 * 
 * WHY: Helper service để lấy proxy config từ System Config
 * - Đọc PROXY_API_KEY và PROXY_API_BASE từ System Config
 * - Fallback về env nếu chưa có trong System Config
 * - Cache để performance
 */

import { systemConfigService } from './system-config.service';
import { AI_CONFIG_KEYS } from '../../types/system-config';
import { config } from '../../infrastructure/config';
import { logger } from '../../infrastructure/logger';

/**
 * Proxy Config
 */
export interface ProxyConfig {
  apiKey: string | undefined;
  apiBase: string | undefined;
}

/**
 * Get proxy config từ System Config hoặc env
 * WHY: Ưu tiên System Config, fallback về env
 */
export async function getProxyConfig(): Promise<ProxyConfig> {
  try {
    // Try to get from System Config first
    const [apiKeyConfig, apiBaseConfig] = await Promise.all([
      systemConfigService.getConfig('ai', AI_CONFIG_KEYS.API_KEY_PROXY),
      systemConfigService.getConfig('ai', AI_CONFIG_KEYS.PROXY_API_BASE),
    ]);
    
    const apiKey = apiKeyConfig?.value 
      ? (typeof apiKeyConfig.value === 'string' ? apiKeyConfig.value : undefined)
      : config.proxy.apiKey;
    
    const apiBase = apiBaseConfig?.value
      ? (typeof apiBaseConfig.value === 'string' ? apiBaseConfig.value : undefined)
      : config.proxy.apiBase;
    
    return {
      apiKey,
      apiBase,
    };
  } catch (error) {
    logger.warn('Failed to get proxy config from System Config, using env', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Fallback to env
    return {
      apiKey: config.proxy.apiKey,
      apiBase: config.proxy.apiBase,
    };
  }
}

