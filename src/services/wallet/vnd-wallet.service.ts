/**
 * VND Wallet Service
 * 
 * WHY: Business logic cho VNĐ wallet operations
 * - Manage VNĐ balance (real money)
 * - Deposit money
 * - Purchase credits from VNĐ wallet
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import {
  InsufficientCreditsError,
  CreditOperationError,
} from '../../errors/wallet/credit.errors';
import type { Prisma } from '@prisma/client';

/**
 * VND Wallet Service
 */
export class VNDWalletService {
  /**
   * Get VNĐ balance for tenant
   */
  async getBalance(tenantId: string): Promise<number> {
    try {
      const wallet = await (prisma as any).vNDWallet.findUnique({
        where: { tenantId },
        select: { balance: true },
      });

      if (!wallet) {
        // Create wallet if not exists
        try {
          const newWallet = await (prisma as any).vNDWallet.create({
            data: {
              tenantId,
              balance: 0,
              currency: 'VND',
            },
          });
          return newWallet.balance;
        } catch (createError: any) {
          // If table doesn't exist, return 0 instead of throwing
          if (createError?.code === 'P2021' || createError?.message?.includes('does not exist')) {
            logger.warn('VND wallet table does not exist yet, returning 0', { tenantId });
            return 0;
          }
          throw createError;
        }
      }

      return wallet.balance;
    } catch (error: any) {
      // If table doesn't exist, return 0 instead of throwing
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        logger.warn('VND wallet table does not exist yet, returning 0', { tenantId });
        return 0;
      }
      
      logger.error('Failed to get VND balance', {
        tenantId,
        error: error instanceof Error ? error.message : error,
      });
      throw new CreditOperationError(
        'Failed to get VND balance',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Add VNĐ to wallet (from payment deposit)
   */
  async addVND(
    tenantId: string,
    amount: number,
    reason: string,
    referenceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (amount <= 0) {
      throw new CreditOperationError('Amount must be positive');
    }

    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Get or create wallet
        let wallet = await (tx as any).vNDWallet.findUnique({
          where: { tenantId },
        });

        if (!wallet) {
          wallet = await (tx as any).vNDWallet.create({
            data: {
              tenantId,
              balance: 0,
              currency: 'VND',
            },
          });
        }

        // Add VNĐ
        await (tx as any).vNDWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: amount },
          },
        });

        // Create transaction record
        await (tx as any).vNDTransaction.create({
          data: {
            walletId: wallet.id,
            tenantId,
            amount: amount, // Positive for addition
            reason,
            referenceId,
            metadata: metadata || {},
          },
        });

        logger.info('VND added', {
          tenantId,
          amount,
          reason,
          referenceId,
          newBalance: wallet.balance + amount,
        });
      });
    } catch (error) {
      logger.error('Failed to add VND', {
        tenantId,
        amount,
        error: error instanceof Error ? error.message : error,
      });
      throw new CreditOperationError(
        'Failed to add VND',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deduct VNĐ from wallet (e.g., purchase credits)
   */
  async deductVND(
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
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Get or create wallet
        let wallet = await (tx as any).vNDWallet.findUnique({
          where: { tenantId },
        });

        if (!wallet) {
          wallet = await (tx as any).vNDWallet.create({
            data: {
              tenantId,
              balance: 0,
              currency: 'VND',
            },
          });
        }

        // Check balance
        if (wallet.balance < amount) {
          throw new InsufficientCreditsError(
            tenantId,
            amount,
            wallet.balance,
            'Insufficient VND balance'
          );
        }

        // Deduct VNĐ
        await (tx as any).vNDWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: amount },
          },
        });

        // Create transaction record
        await (tx as any).vNDTransaction.create({
          data: {
            walletId: wallet.id,
            tenantId,
            amount: -amount, // Negative for deduction
            reason,
            referenceId,
            metadata: metadata || {},
          },
        });

        logger.info('VND deducted', {
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

      logger.error('Failed to deduct VND', {
        tenantId,
        amount,
        error: error instanceof Error ? error.message : error,
      });
      throw new CreditOperationError(
        'Failed to deduct VND',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get VND transaction history
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
      (prisma as any).vNDTransaction.findMany({
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
      (prisma as any).vNDTransaction.count({ where }),
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
export const vndWalletService = new VNDWalletService();

