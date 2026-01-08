/**
 * Credit Purchase Service
 * 
 * WHY: Business logic cho mua credit từ VNĐ wallet
 * - Purchase credits from VND wallet
 * - Support credit packages (with discounts)
 * - Rate: 1 VNĐ = 1 credit (or package rate)
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { vndWalletService } from './vnd-wallet.service';
import { creditService } from './credit.service';
import {
  InsufficientCreditsError,
  CreditOperationError,
} from '../../errors/wallet/credit.errors';

// Default rate: 1 VNĐ = 1 credit
const DEFAULT_CREDIT_RATE = 1;

/**
 * Purchase credits from VND wallet
 * WHY: Convert VNĐ to credits for AI usage
 */
export async function purchaseCredits(
  tenantId: string,
  vndAmount: number
): Promise<{
  vndAmount: number;
  creditAmount: number;
  rate: number;
}> {
  if (vndAmount <= 0) {
    throw new CreditOperationError('VNĐ amount must be positive');
  }

  // Default rate: 1 VNĐ = 1 credit
  const creditAmount = Math.floor(vndAmount * DEFAULT_CREDIT_RATE);

  // Check VND balance
  const vndBalance = await vndWalletService.getBalance(tenantId);
  if (vndBalance < vndAmount) {
    throw new InsufficientCreditsError(
      tenantId,
      vndAmount,
      vndBalance,
      'Insufficient VND balance to purchase credits'
    );
  }

  // Transaction: Deduct VND + Add Credits
  let vndTransactionId: string | undefined;
  let creditTransactionId: string | undefined;

  try {
    // Deduct VND
    await vndWalletService.deductVND(
      tenantId,
      vndAmount,
      `Mua ${creditAmount} credits`,
      undefined,
      {
        creditAmount,
        rate: DEFAULT_CREDIT_RATE,
      }
    );

    // Get VND transaction ID (last transaction)
    const vndTransactions = await vndWalletService.getTransactionHistory(
      tenantId,
      { page: 1, limit: 1 }
    );
    vndTransactionId = vndTransactions.transactions[0]?.id;

    // Add Credits
    await creditService.addCredit(
      tenantId,
      creditAmount,
      `Mua credits từ VNĐ wallet - ${vndAmount.toLocaleString('vi-VN')} VNĐ`,
      vndTransactionId,
      {
        vndAmount,
        rate: DEFAULT_CREDIT_RATE,
      }
    );

    // Get credit transaction ID
    const creditTransactions = await creditService.getTransactionHistory(
      tenantId,
      { page: 1, limit: 1 }
    );
    creditTransactionId = creditTransactions.transactions[0]?.id;

    logger.info('Credits purchased', {
      tenantId,
      vndAmount,
      creditAmount,
      rate: DEFAULT_CREDIT_RATE,
      vndTransactionId,
      creditTransactionId,
    });

    return {
      vndAmount,
      creditAmount,
      rate: DEFAULT_CREDIT_RATE,
    };
  } catch (error) {
    logger.error('Failed to purchase credits', {
      tenantId,
      vndAmount,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Purchase credits from package (with discount)
 */
export async function purchaseCreditPackage(
  tenantId: string,
  packageId: string
): Promise<{
  packageName: string;
  creditAmount: number;
  bonusCredit: number;
  totalCredits: number;
  price: number;
}> {
  // Get package
  const creditPackage = await prisma.creditPackage.findUnique({
    where: { id: packageId },
  });

  if (!creditPackage) {
    throw new CreditOperationError('Credit package not found');
  }

  if (!creditPackage.isActive) {
    throw new CreditOperationError('Credit package is not active');
  }

  // Check VND balance
  const vndBalance = await vndWalletService.getBalance(tenantId);
  if (vndBalance < creditPackage.price) {
    throw new InsufficientCreditsError(
      tenantId,
      creditPackage.price,
      vndBalance,
      'Insufficient VND balance to purchase package'
    );
  }

  // Calculate total credits (package + bonus)
  const totalCredits = creditPackage.creditAmount + creditPackage.bonusCredit;

  // Transaction: Deduct VND + Add Credits
  let vndTransactionId: string | undefined;

  try {
    // Deduct VND
    await vndWalletService.deductVND(
      tenantId,
      creditPackage.price,
      `Mua gói credit: ${creditPackage.name}`,
      packageId,
      {
        packageId,
        packageName: creditPackage.name,
        creditAmount: creditPackage.creditAmount,
        bonusCredit: creditPackage.bonusCredit,
        totalCredits,
      }
    );

    // Get VND transaction ID
    const vndTransactions = await vndWalletService.getTransactionHistory(
      tenantId,
      { page: 1, limit: 1 }
    );
    vndTransactionId = vndTransactions.transactions[0]?.id;

    // Add Credits (including bonus)
    await creditService.addCredit(
      tenantId,
      totalCredits,
      `Mua gói credit: ${creditPackage.name} (${creditPackage.creditAmount} + ${creditPackage.bonusCredit} bonus)`,
      vndTransactionId,
      {
        packageId,
        packageName: creditPackage.name,
        creditAmount: creditPackage.creditAmount,
        bonusCredit: creditPackage.bonusCredit,
        totalCredits,
        price: creditPackage.price,
      }
    );

    logger.info('Credit package purchased', {
      tenantId,
      packageId,
      packageName: creditPackage.name,
      price: creditPackage.price,
      totalCredits,
      vndTransactionId,
    });

    return {
      packageName: creditPackage.name,
      creditAmount: creditPackage.creditAmount,
      bonusCredit: creditPackage.bonusCredit,
      totalCredits,
      price: creditPackage.price,
    };
  } catch (error) {
    logger.error('Failed to purchase credit package', {
      tenantId,
      packageId,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Get available credit packages
 */
export async function getCreditPackages(): Promise<
  Array<{
    id: string;
    name: string;
    description: string | null;
    creditAmount: number;
    bonusCredit: number;
    totalCredits: number;
    price: number;
    isActive: boolean;
  }>
> {
  const packages = await prisma.creditPackage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    creditAmount: pkg.creditAmount,
    bonusCredit: pkg.bonusCredit,
    totalCredits: pkg.creditAmount + pkg.bonusCredit,
    price: pkg.price,
    isActive: pkg.isActive,
  }));
}

