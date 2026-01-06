/**
 * Proxy Balance Service
 * 
 * WHY: Check balance và logs từ v98store proxy
 * - Monitor API usage
 * - Alert khi balance thấp
 * - Track costs
 */

import axios from 'axios';
import { logger } from '../../infrastructure/logger';
import { config } from '../../infrastructure/config';

interface BalanceResponse {
  remain_quota: number;
  used_quota: number;
}

/**
 * Proxy Balance Service
 */
export class ProxyBalanceService {
  private readonly baseUrl = 'https://v98store.com';

  /**
   * Check balance
   */
  async checkBalance(): Promise<{
    remaining: number;
    used: number;
    total: number;
    percentage: number;
  }> {
    if (!config.proxy.apiKey) {
      throw new Error('PROXY_API_KEY is not set');
    }

    try {
      const response = await axios.get<BalanceResponse>(
        `${this.baseUrl}/check-balance`,
        {
          params: {
            key: config.proxy.apiKey,
          },
        }
      );

      const { remain_quota, used_quota } = response.data;
      const total = remain_quota + used_quota;
      const percentage = total > 0 ? (remain_quota / total) * 100 : 0;

      return {
        remaining: remain_quota,
        used: used_quota,
        total,
        percentage: Number(percentage.toFixed(2)),
      };
    } catch (error) {
      logger.error('Failed to check proxy balance:', error);
      throw new Error(
        `Failed to check balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get API logs
   */
  async getLogs(): Promise<string> {
    if (!config.proxy.apiKey) {
      throw new Error('PROXY_API_KEY is not set');
    }

    try {
      const response = await axios.get<string>(`${this.baseUrl}/log`, {
        params: {
          key: config.proxy.apiKey,
        },
      });

      return response.data; // HTML string
    } catch (error) {
      logger.error('Failed to get proxy logs:', error);
      throw new Error(
        `Failed to get logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if balance is low (below threshold)
   */
  async isBalanceLow(threshold: number = 5): Promise<boolean> {
    try {
      const balance = await this.checkBalance();
      return balance.remaining < threshold;
    } catch (error) {
      logger.error('Failed to check if balance is low:', error);
      return false;
    }
  }
}

// Export singleton instance
export const proxyBalanceService = new ProxyBalanceService();

