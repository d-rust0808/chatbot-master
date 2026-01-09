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
import { config } from '../../infrastructure/config';
import { uploadToR2 } from '../../infrastructure/r2-storage';
import * as fs from 'fs/promises';
import * as path from 'path';

// Upload directory (fallback if R2 not enabled)
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
 * WHY: Save image file to R2 (if enabled) or local storage và return URL
 */
export async function saveServicePackageImage(
  file: { filename: string; mimetype: string; buffer: Buffer }
): Promise<string> {
  // Validate image type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new CreditOperationError(
      `Invalid image type. Allowed: ${allowedTypes.join(', ')}`
    );
  }

  // Generate unique filename
  const ext = path.extname(file.filename) || '.jpg';
  const uniqueFilename = `service-packages/${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;

  // Upload to R2 if enabled
  if (config.r2.enabled) {
    try {
      logger.info('Uploading service package image to R2', {
        filename: file.filename,
        key: uniqueFilename,
      });

      const publicUrl = await uploadToR2(
        {
          buffer: file.buffer,
          mimetype: file.mimetype,
          filename: file.filename,
        },
        uniqueFilename
      );

      logger.info('Service package image uploaded to R2', {
        publicUrl,
      });

      return publicUrl;
    } catch (error) {
      logger.error('Failed to upload to R2, falling back to local storage', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fall through to local storage
    }
  }

  // Fallback to local storage
  await ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, path.basename(uniqueFilename));

  // Save file locally
  await fs.writeFile(filePath, file.buffer);

  logger.info('Service package image saved locally', {
    filePath,
  });

  // Return URL path (relative to public)
  return `/uploads/service-packages/${path.basename(uniqueFilename)}`;
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
  const validServices = ['whatsapp', 'messenger', 'tiktok', 'zalo', 'instagram', 'shopee'];
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
    const validServices = ['whatsapp', 'messenger', 'tiktok', 'zalo', 'instagram', 'shopee'];
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
      'Cannot delete service package with active subscriptions'
    );
  }

  // Soft delete: set isActive = false (không hard delete để giữ lịch sử)
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

/**
 * Get all service packages (admin view - includes inactive)
 */
export async function getAllServicePackages(filters?: {
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

