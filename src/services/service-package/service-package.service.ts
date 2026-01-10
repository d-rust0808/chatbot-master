/**
 * Service Package Service
 * 
 * WHY: Business logic cho gói dịch vụ (WhatsApp, Messenger, TikTok, etc.)
 * - Purchase service packages
 * - Manage subscriptions
 * - Auto-enable service when subscribed
 * - Admin CRUD operations
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
    imageUrl: pkg.imageUrl,
    features: pkg.features,
    isActive: pkg.isActive,
    sortOrder: pkg.sortOrder,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
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
 * WHY: Lấy danh sách subscriptions đang active cho tenant
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
          imageUrl: true,
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
 * Get active subscriptions for sidebar
 * WHY: Format data phù hợp cho sidebar UI - chỉ lấy thông tin cần thiết
 */
export async function getActiveSubscriptionsForSidebar(tenantId: string) {
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
          service: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { endDate: 'asc' },
  });

  return subscriptions.map((sub: any) => ({
    id: sub.id,
    service: sub.package.service,
    serviceName: sub.package.name,
    imageUrl: sub.package.imageUrl,
    startDate: sub.startDate,
    endDate: sub.endDate,
    daysRemaining: Math.ceil(
      (sub.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ),
    isActive: true,
  }));
}

/**
 * Check if service is active for tenant
 * WHY: Kiểm tra nhanh xem service có đang active không
 */
export async function checkServiceActive(tenantId: string, service: string) {
  const subscription = await (prisma as any).serviceSubscription.findFirst({
    where: {
      tenantId,
      package: {
        service: service.toLowerCase(),
      },
      status: 'active',
      endDate: { gt: new Date() },
    },
    include: {
      package: {
        select: {
          id: true,
          name: true,
          service: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!subscription) {
    return {
      isActive: false,
      subscription: null,
    };
  }

  return {
    isActive: true,
    subscription: {
      id: subscription.id,
      service: subscription.package.service,
      serviceName: subscription.package.name,
      imageUrl: subscription.package.imageUrl,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysRemaining: Math.ceil(
        (subscription.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),
    },
  };
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

// ==================== Admin CRUD Operations ====================

/**
 * Create service package (Admin only)
 * WHY: Super admin tạo gói dịch vụ mới
 */
export async function createServicePackage(data: {
  name: string;
  description?: string;
  service: string; // whatsapp, facebook, instagram, tiktok, zalo, etc.
  pricePerMonth: number;
  minDuration?: number;
  imageUrl?: string;
  features?: any; // JSON
  isActive?: boolean;
  sortOrder?: number;
}) {
  // Validate service name
  const validServices = ['whatsapp', 'facebook', 'instagram', 'tiktok', 'zalo', 'messenger', 'shopee'];
  if (!validServices.includes(data.service.toLowerCase())) {
    throw new CreditOperationError(`Invalid service: ${data.service}. Valid services: ${validServices.join(', ')}`);
  }

  // Validate price
  if (data.pricePerMonth <= 0) {
    throw new CreditOperationError('Price per month must be greater than 0');
  }

  const servicePackage = await (prisma as any).servicePackage.create({
    data: {
      name: data.name,
      description: data.description || null,
      service: data.service.toLowerCase(),
      pricePerMonth: data.pricePerMonth,
      minDuration: data.minDuration || 1,
      imageUrl: data.imageUrl || null,
      features: data.features || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      sortOrder: data.sortOrder || 0,
    },
  });

  logger.info('Service package created', {
    packageId: servicePackage.id,
    name: servicePackage.name,
    service: servicePackage.service,
  });

  return servicePackage;
}

/**
 * Get all service packages (Admin view - includes inactive)
 * WHY: Admin cần xem tất cả packages, kể cả inactive
 */
export async function getAllServicePackagesAdmin(filters?: {
  service?: string;
  isActive?: boolean;
}) {
  const where: any = {};
  
  if (filters?.service) {
    where.service = filters.service.toLowerCase();
  }
  
  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const packages = await (prisma as any).servicePackage.findMany({
    where,
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return packages;
}

/**
 * Get service package by ID (Admin)
 */
export async function getServicePackageByIdAdmin(packageId: string) {
  const servicePackage = await (prisma as any).servicePackage.findUnique({
    where: { id: packageId },
  });

  if (!servicePackage) {
    throw new CreditOperationError('Service package not found');
  }

  return servicePackage;
}

/**
 * Update service package (Admin only)
 * WHY: Super admin cập nhật thông tin gói dịch vụ
 */
export async function updateServicePackage(
  packageId: string,
  data: {
    name?: string;
    description?: string;
    service?: string;
    pricePerMonth?: number;
    minDuration?: number;
    imageUrl?: string;
    features?: any;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  // Check if package exists
  const existing = await (prisma as any).servicePackage.findUnique({
    where: { id: packageId },
  });

  if (!existing) {
    throw new CreditOperationError('Service package not found');
  }

  // Validate service if provided
  if (data.service) {
    const validServices = ['whatsapp', 'facebook', 'instagram', 'tiktok', 'zalo', 'messenger', 'shopee'];
    if (!validServices.includes(data.service.toLowerCase())) {
      throw new CreditOperationError(`Invalid service: ${data.service}. Valid services: ${validServices.join(', ')}`);
    }
  }

  // Validate price if provided
  if (data.pricePerMonth !== undefined && data.pricePerMonth <= 0) {
    throw new CreditOperationError('Price per month must be greater than 0');
  }

  // Build update data (only include provided fields)
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.service !== undefined) updateData.service = data.service.toLowerCase();
  if (data.pricePerMonth !== undefined) updateData.pricePerMonth = data.pricePerMonth;
  if (data.minDuration !== undefined) updateData.minDuration = data.minDuration;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.features !== undefined) updateData.features = data.features;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  updateData.updatedAt = new Date();

  const updated = await (prisma as any).servicePackage.update({
    where: { id: packageId },
    data: updateData,
  });

  logger.info('Service package updated', {
    packageId: updated.id,
    name: updated.name,
    service: updated.service,
  });

  return updated;
}

/**
 * Delete service package (Soft delete - Admin only)
 * WHY: Soft delete bằng cách set isActive = false
 * - Không hard delete để giữ lịch sử subscriptions
 */
export async function deleteServicePackage(packageId: string) {
  // Check if package exists
  const existing = await (prisma as any).servicePackage.findUnique({
    where: { id: packageId },
    include: {
      subscriptions: {
        where: {
          status: 'active',
          endDate: { gt: new Date() },
        },
        take: 1,
      },
    },
  });

  if (!existing) {
    throw new CreditOperationError('Service package not found');
  }

  // Check if has active subscriptions
  if (existing.subscriptions.length > 0) {
    throw new CreditOperationError('Cannot delete service package with active subscriptions');
  }

  // Soft delete: set isActive = false
  const deleted = await (prisma as any).servicePackage.update({
    where: { id: packageId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  logger.info('Service package deleted (soft)', {
    packageId: deleted.id,
    name: deleted.name,
  });

  return deleted;
}

