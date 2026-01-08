/**
 * Admin Service Package Service
 * 
 * WHY: Admin operations cho service packages
 * - Create, update, delete packages
 * - Upload images
 * - Manage package status
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { CreditOperationError } from '../../errors/wallet/credit.errors';
import * as fs from 'fs/promises';
import * as path from 'path';

// Upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'service-packages');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create upload directory', { error });
  }
}

/**
 * Save uploaded image
 * WHY: Save image file và return URL
 */
export async function saveServicePackageImage(
  file: { filename: string; mimetype: string; buffer: Buffer }
): Promise<string> {
  await ensureUploadDir();

  // Validate image type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new CreditOperationError(
      `Invalid image type. Allowed: ${allowedTypes.join(', ')}`
    );
  }

  // Generate unique filename
  const ext = path.extname(file.filename) || '.jpg';
  const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
  const filePath = path.join(UPLOAD_DIR, uniqueFilename);

  // Save file
  await fs.writeFile(filePath, file.buffer);

  // Return URL path (relative to public)
  return `/uploads/service-packages/${uniqueFilename}`;
}

/**
 * Create service package
 */
export async function createServicePackage(data: {
  name: string;
  description?: string;
  service: string;
  pricePerMonth: number;
  minDuration?: number;
  imageUrl?: string;
  features?: Record<string, any>;
  sortOrder?: number;
}) {
  // Validate service name
  const validServices = ['whatsapp', 'messenger', 'tiktok', 'zalo', 'instagram'];
  if (!validServices.includes(data.service.toLowerCase())) {
    throw new CreditOperationError(
      `Invalid service. Allowed: ${validServices.join(', ')}`
    );
  }

  const package_ = await (prisma as any).servicePackage.create({
    data: {
      name: data.name,
      description: data.description || null,
      service: data.service.toLowerCase(),
      pricePerMonth: data.pricePerMonth,
      minDuration: data.minDuration || 1,
      imageUrl: data.imageUrl || null,
      features: data.features || {},
      isActive: true,
      sortOrder: data.sortOrder || 0,
    },
  });

  logger.info('Service package created', {
    packageId: package_.id,
    name: package_.name,
    service: package_.service,
  });

  return package_;
}

/**
 * Update service package
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
    features?: Record<string, any>;
    isActive?: boolean;
    sortOrder?: number;
  }
) {
  const package_ = await (prisma as any).servicePackage.findUnique({
    where: { id: packageId },
  });

  if (!package_) {
    throw new CreditOperationError('Service package not found');
  }

  // Validate service if provided
  if (data.service) {
    const validServices = ['whatsapp', 'messenger', 'tiktok', 'zalo', 'instagram'];
    if (!validServices.includes(data.service.toLowerCase())) {
      throw new CreditOperationError(
        `Invalid service. Allowed: ${validServices.join(', ')}`
      );
    }
  }

  const updated = await (prisma as any).servicePackage.update({
    where: { id: packageId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.service && { service: data.service.toLowerCase() }),
      ...(data.pricePerMonth && { pricePerMonth: data.pricePerMonth }),
      ...(data.minDuration && { minDuration: data.minDuration }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.features && { features: data.features }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  logger.info('Service package updated', {
    packageId: updated.id,
    name: updated.name,
  });

  return updated;
}

/**
 * Delete service package
 */
export async function deleteServicePackage(packageId: string) {
  const package_ = await (prisma as any).servicePackage.findUnique({
    where: { id: packageId },
    include: {
      subscriptions: {
        where: {
          status: 'active',
          endDate: { gt: new Date() },
        },
      },
    },
  });

  if (!package_) {
    throw new CreditOperationError('Service package not found');
  }

  // Check if has active subscriptions
  if (package_.subscriptions.length > 0) {
    throw new CreditOperationError(
      'Cannot delete package with active subscriptions'
    );
  }

  // Delete image if exists
  if (package_.imageUrl) {
    try {
      const imagePath = path.join(process.cwd(), 'public', package_.imageUrl);
      await fs.unlink(imagePath);
    } catch (error) {
      logger.warn('Failed to delete package image', { error, imageUrl: package_.imageUrl });
    }
  }

  await (prisma as any).servicePackage.delete({
    where: { id: packageId },
  });

  logger.info('Service package deleted', { packageId });
}

/**
 * Get all service packages (admin view - includes inactive)
 */
export async function getAllServicePackages(service?: string) {
  const where: any = {};
  if (service) {
    where.service = service.toLowerCase();
  }

  const packages = await (prisma as any).servicePackage.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });

  return packages;
}

