/**
 * Payment Expiry Worker
 * 
 * WHY: Background job để tự động expire payments quá hạn
 * - Chạy mỗi 30 giây
 * - Kiểm tra payments có status='pending' và expiresAt < now
 * - Tự động đánh dấu expired
 */

import { logger } from '../../infrastructure/logger';
import { expirePendingPayments } from '../../services/payment/payment.service';

const CHECK_INTERVAL_MS = 30 * 1000; // 30 giây

let intervalId: NodeJS.Timeout | null = null;

/**
 * Start payment expiry worker
 */
export function startPaymentExpiryWorker(): void {
  if (intervalId) {
    logger.warn('Payment expiry worker already running');
    return;
  }

  logger.info('Starting payment expiry worker', {
    interval: `${CHECK_INTERVAL_MS / 1000}s`,
  });

  // Run immediately on start
  checkAndExpirePayments();

  // Then run every 30 seconds
  intervalId = setInterval(() => {
    checkAndExpirePayments();
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop payment expiry worker
 */
export function stopPaymentExpiryWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Payment expiry worker stopped');
  }
}

/**
 * Check and expire pending payments
 */
async function checkAndExpirePayments(): Promise<void> {
  try {
    const expiredCount = await expirePendingPayments();
    if (expiredCount > 0) {
      logger.info('Expired payments', { count: expiredCount });
    }
  } catch (error) {
    logger.error('Payment expiry worker error:', error);
  }
}

