/**
 * Service Package Service
 * 
 * WHY: Business logic cho gói dịch vụ (WhatsApp, Messenger, TikTok, etc.)
 * - Purchase service packages
 * - Manage subscriptions
 * - Auto-enable service when subscribed
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { vndWalletService } from '../wallet/vnd-wallet.service';
import {
  InsufficientCreditsError,
  CreditOperationError,
} from '../../errors/wallet/credit.errors';

/**
 * Get available service packages
 */
export async function getServicePackages(service?: string) {
  const where: any = { isActive: true };
  if (service) {
    where.service = service;
  }

  const packages = await (prisma as any).servicePackage.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });

  return packages.map((pkg: any) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    service: pkg.service,
    pricePerMonth: pkg.pricePerMonth,
    minDuration: pkg.minDuration,
    features: pkg.features,
  }));
}

/**
 * Purchase service package
 * WHY: Mua gói dịch vụ từ VNĐ wallet và tạo subscription
 */
export async function purchaseServicePackage(
  tenantId: string,
  packageId: string,
  duration: number // Số tháng (1, 2, 3, 4, 5)
): Promise<{
  subscriptionId: string;
  packageName: string;
  service: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  price: number;
}> {
  // Get package
  const servicePackage = await (prisma as any).servicePackage.findUnique({
    where: { id: packageId },
  });

  if (!servicePackage) {
    throw new CreditOperationError('Service package not found');
  }

  if (!servicePackage.isActive) {
    throw new CreditOperationError('Service package is not active');
  }

  // Validate duration
  if (duration < servicePackage.minDuration) {
    throw new CreditOperationError(
      `Duration must be at least ${servicePackage.minDuration} month(s)`
    );
  }

  // Calculate price: pricePerMonth * duration
  const totalPrice = servicePackage.pricePerMonth * duration;

  // Check VND balance
  const vndBalance = await vndWalletService.getBalance(tenantId);
  if (vndBalance < totalPrice) {
    throw new InsufficientCreditsError(
      tenantId,
      totalPrice,
      vndBalance,
      'Insufficient VND balance to purchase service package'
    );
  }

  // Check if tenant already has active subscription for this service
  const existingSubscription = await (prisma as any).serviceSubscription.findFirst({
    where: {
      tenantId,
      package: {
        service: servicePackage.service,
      },
      status: 'active',
      endDate: { gt: new Date() },
    },
    include: { package: true },
  });

  if (existingSubscription) {
    // Extend existing subscription
    const newEndDate = new Date(existingSubscription.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + duration);

    // Deduct VND
    await vndWalletService.deductVND(
      tenantId,
      totalPrice,
      `Gia hạn gói ${servicePackage.name} thêm ${duration} tháng`,
      packageId,
      {
        packageId,
        packageName: servicePackage.name,
        service: servicePackage.service,
        duration,
        extendFrom: existingSubscription.id,
      }
    );

    // Update subscription
    const updated = await (prisma as any).serviceSubscription.update({
      where: { id: existingSubscription.id },
      data: {
        endDate: newEndDate,
        duration: existingSubscription.duration + duration,
        price: existingSubscription.price + totalPrice,
        updatedAt: new Date(),
      },
    });

    // Enable service if not already enabled
    await enableServiceForTenant(tenantId, servicePackage.service);

    logger.info('Service package extended', {
      tenantId,
      packageId,
      subscriptionId: updated.id,
      duration,
      newEndDate: updated.endDate,
    });

    return {
      subscriptionId: updated.id,
      packageName: servicePackage.name,
      service: servicePackage.service,
      duration: updated.duration,
      startDate: updated.startDate,
      endDate: updated.endDate,
      price: updated.price,
    };
  }

  // Create new subscription
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + duration);

  // Deduct VND
  await vndWalletService.deductVND(
    tenantId,
    totalPrice,
    `Mua gói dịch vụ: ${servicePackage.name} - ${duration} tháng`,
    packageId,
    {
      packageId,
      packageName: servicePackage.name,
      service: servicePackage.service,
      duration,
    }
  );

  // Create subscription
  const subscription = await (prisma as any).serviceSubscription.create({
    data: {
      tenantId,
      packageId,
      duration,
      price: totalPrice,
      startDate,
      endDate,
      status: 'active',
    },
    include: { package: true },
  });

  // Enable service for tenant
  await enableServiceForTenant(tenantId, servicePackage.service);

  logger.info('Service package purchased', {
    tenantId,
    packageId,
    subscriptionId: subscription.id,
    service: servicePackage.service,
    duration,
    price: totalPrice,
    endDate: subscription.endDate,
  });

  return {
    subscriptionId: subscription.id,
    packageName: servicePackage.name,
    service: servicePackage.service,
    duration,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    price: totalPrice,
  };
}

/**
 * Enable service for tenant
 * WHY: Auto-enable service when subscription is active
 */
async function enableServiceForTenant(
  tenantId: string,
  service: string
): Promise<void> {
  // Get or create tenant service
  const tenantService = await (prisma as any).tenantService.upsert({
    where: {
      tenantId_service: {
        tenantId,
        service,
      },
    },
    update: {
      isEnabled: true,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      service,
      isEnabled: true,
    },
  });

  logger.debug('Service enabled for tenant', {
    tenantId,
    service,
    tenantServiceId: tenantService.id,
  });
}

/**
 * Get tenant's active subscriptions
 */
export async function getTenantSubscriptions(tenantId: string) {
  const subscriptions = await (prisma as any).serviceSubscription.findMany({
    where: {
      tenantId,
      status: 'active',
      endDate: { gt: new Date() },
    },
    include: {
      package: {
        select: {
          id: true,
          name: true,
          description: true,
          service: true,
          pricePerMonth: true,
          minDuration: true,
          features: true,
        },
      },
    },
    orderBy: { endDate: 'asc' },
  });

  return subscriptions.map((sub: any) => ({
    id: sub.id,
    package: sub.package,
    duration: sub.duration,
    price: sub.price,
    status: sub.status,
    startDate: sub.startDate,
    endDate: sub.endDate,
    autoRenew: sub.autoRenew,
    daysRemaining: Math.ceil(
      (sub.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  tenantId: string,
  subscriptionId: string
): Promise<void> {
  const subscription = await (prisma as any).serviceSubscription.findUnique({
    where: { id: subscriptionId },
    include: { package: true },
  });

  if (!subscription) {
    throw new CreditOperationError('Subscription not found');
  }

  if (subscription.tenantId !== tenantId) {
    throw new CreditOperationError('Unauthorized: Subscription does not belong to tenant');
  }

  if (subscription.status !== 'active') {
    throw new CreditOperationError(`Cannot cancel subscription with status: ${subscription.status}`);
  }

  await (prisma as any).serviceSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      autoRenew: false,
    },
  });

  logger.info('Subscription cancelled', {
    tenantId,
    subscriptionId,
    service: subscription.package.service,
  });
}

/**
 * Check if service is subscribed and active
 */
export async function isServiceSubscribed(
  tenantId: string,
  service: string
): Promise<boolean> {
  const subscription = await (prisma as any).serviceSubscription.findFirst({
    where: {
      tenantId,
      package: {
        service,
      },
      status: 'active',
      endDate: { gt: new Date() },
    },
  });

  return !!subscription;
}

