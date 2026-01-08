/**
 * Credit Pricing Utilities
 * 
 * WHY: Convert AI cost (USD) to credits (VNĐ)
 * - Standardize pricing model
 * - Support different AI models
 * - Configurable exchange rate
 */

import { calculateCost } from '../ai/token-manager';

// USD to VNĐ exchange rate (configurable via env)
const USD_TO_VND_RATE = parseFloat(process.env.USD_TO_VND_RATE || '25000');

/**
 * Model-specific pricing multipliers
 * WHY: Some models cost more, adjust credit deduction
 */
const MODEL_MULTIPLIERS: Record<string, number> = {
  'gpt-4o': 1.0,
  'gpt-4o-mini': 0.5,
  'gpt-4': 1.5,
  'gpt-4.1-2025-04-14': 1.2,
  'gpt-3.5-turbo': 0.3,
  'gemini-2.5-flash': 0.4,
  'gemini-3-flash-preview': 0.5,
  'deepseek-chat': 0.2,
  'deepseek-v3': 0.3,
  'deepseek-v3.1': 0.3,
  'deepseek-v3.2': 0.3,
  'deepseek-r1': 0.5,
};

/**
 * Convert USD cost to credits (VNĐ)
 * WHY: Credit = VNĐ, need to convert from USD
 */
export function convertUsdToCredits(usdCost: number): number {
  return Math.ceil(usdCost * USD_TO_VND_RATE);
}

/**
 * Calculate credits from tokens and model
 * WHY: Direct calculation from AI usage
 */
export function calculateCreditsFromTokens(
  tokens: number,
  model: string
): number {
  // Calculate USD cost first
  const usdCost = calculateCost(tokens, model);
  
  // Apply model multiplier
  const multiplier = MODEL_MULTIPLIERS[model] || 1.0;
  const adjustedCost = usdCost * multiplier;
  
  // Convert to credits
  return convertUsdToCredits(adjustedCost);
}

/**
 * Calculate credits from token usage object
 * WHY: Use actual token counts (prompt + completion)
 */
export function calculateCreditsFromTokenUsage(
  tokens: { prompt: number; completion: number; total: number },
  model: string
): number {
  // Use actual token split if available
  if (tokens.prompt > 0 || tokens.completion > 0) {
    // Calculate cost using actual token counts
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
    };
    
    const price = pricing[model] || pricing['gpt-3.5-turbo'];
    const inputCost = (tokens.prompt / 1000) * price.input;
    const outputCost = (tokens.completion / 1000) * price.output;
    const usdCost = inputCost + outputCost;
    
    // Apply multiplier
    const multiplier = MODEL_MULTIPLIERS[model] || 1.0;
    const adjustedCost = usdCost * multiplier;
    
    return convertUsdToCredits(adjustedCost);
  }
  
  // Fallback to total tokens
  return calculateCreditsFromTokens(tokens.total, model);
}

/**
 * Get minimum credits required for a request
 * WHY: Pre-check before processing
 */
export function estimateCreditsRequired(
  estimatedTokens: number,
  model: string
): number {
  // Estimate with buffer (20% more)
  const bufferTokens = Math.ceil(estimatedTokens * 1.2);
  return calculateCreditsFromTokens(bufferTokens, model);
}

/**
 * Get exchange rate (for API/info)
 */
export function getExchangeRate(): number {
  return USD_TO_VND_RATE;
}

