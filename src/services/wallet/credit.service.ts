    /**
 * Credit Service
 * 
 * WHY: Business logic for credit operations
 * - Check balance
 * - Deduct credits
 * - Add credits
 * - Track transactions
 * - Transaction-safe operations
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import {
  InsufficientCreditsError,
  CreditOperationError,
} from '../../errors/wallet/credit.errors';

/**
 * Credit Service
 */
export class CreditService {
  /**
   * Get credit balance for tenant
   * WHY: Check available credits before operations
   */
  async getBalance(tenantId: string): Promise<number> {
    try {
      const wallet = await prisma.creditWallet.findUnique({
        where: { tenantId },
        select: { balance: true },
      });

      if (!wallet) {
        // Create wallet if not exists
        try {
          const newWallet = await prisma.creditWallet.create({
            data: {
              tenantId,
              balance: 0,
              currency: 'CREDIT',
            },
          });
          return newWallet.balance;
        } catch (createError: any) {
          // If table doesn't exist, return 0 instead of throwing
          if (createError?.code === 'P2021' || createError?.message?.includes('does not exist')) {
            logger.warn('Credit wallet table does not exist yet, returning 0', { tenantId });
            return 0;
          }
          throw createError;
        }
      }

      return wallet.balance;
    } catch (error: any) {
      // If table doesn't exist, return 0 instead of throwing
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        logger.warn('Credit wallet table does not exist yet, returning 0', { tenantId });
        return 0;
      }
      
      logger.error('Failed to get credit balance', {
        tenantId,
        error: error instanceof Error ? error.message : error,
      });
      throw new CreditOperationError(
        'Failed to get credit balance',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if tenant has enough credits
   * WHY: Pre-check before processing requests
   */
  async canDeduct(tenantId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(tenantId);
    return balance >= amount;
  }

  /**
   * Deduct credits from tenant wallet
   * WHY: Charge for AI usage
   */
  async deduct(
    tenantId: string,
    amount: number,
    reason: string,
    referenceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (amount <= 0) {
      throw new CreditOperationError('Deduction amount must be positive');
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Get or create wallet
        let wallet = await tx.creditWallet.findUnique({
          where: { tenantId },
        });

        if (!wallet) {
          wallet = await tx.creditWallet.create({
            data: {
              tenantId,
              balance: 0,
              currency: 'CREDIT',
            },
          });
        }

        // Check balance
        if (wallet.balance < amount) {
          throw new InsufficientCreditsError(
            tenantId,
            amount,
            wallet.balance
          );
        }

        // Deduct credits
        await tx.creditWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: amount },
          },
        });

        // Create transaction record
        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            tenantId,
            amount: -amount, // Negative for deduction
            reason,
            referenceId,
            metadata: metadata || {},
          },
        });

        logger.info('Credits deducted', {
          tenantId,
          amount,
          reason,
          referenceId,
          newBalance: wallet.balance - amount,
        });
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        throw error;
      }

      logger.error('Failed to deduct credits', {
        tenantId,
        amount,
        error: error instanceof Error ? error.message : error,
      });
      throw new CreditOperationError(
        'Failed to deduct credits',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Add credits to tenant wallet
   * WHY: Top-up from payment or manual adjustment
   */
  async addCredit(
    tenantId: string,
    amount: number,
    reason: string,
    referenceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (amount <= 0) {
      throw new CreditOperationError('Credit amount must be positive');
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Get or create wallet
        let wallet = await tx.creditWallet.findUnique({
          where: { tenantId },
        });

        if (!wallet) {
          wallet = await tx.creditWallet.create({
            data: {
              tenantId,
              balance: 0,
              currency: 'CREDIT',
            },
          });
        }

        // Add credits
        await tx.creditWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: amount },
          },
        });

        // Create transaction record
        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            tenantId,
            amount: amount, // Positive for addition
            reason,
            referenceId,
            metadata: metadata || {},
          },
        });

        logger.info('Credits added', {
          tenantId,
          amount,
          reason,
          referenceId,
          newBalance: wallet.balance + amount,
        });
      });
    } catch (error) {
      logger.error('Failed to add credits', {
        tenantId,
        amount,
        error: error instanceof Error ? error.message : error,
      });
      throw new CreditOperationError(
        'Failed to add credits',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get credit transaction history
   * WHY: Audit trail and history
   */
  async getTransactionHistory(
    tenantId: string,
    options?: {
      page?: number;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    transactions: Array<{
      id: string;
      amount: number;
      reason: string;
      referenceId: string | null;
      metadata: any;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        select: {
          id: true,
          amount: true,
          reason: true,
          referenceId: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.creditTransaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

// Export singleton instance
export const creditService = new CreditService();

