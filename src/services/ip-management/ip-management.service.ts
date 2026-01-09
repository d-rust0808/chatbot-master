/**
 * IP Management Service
 * 
 * WHY: Quản lý IP blacklist, whitelist và ban IP
 * - Block malicious IPs
 * - Whitelist trusted IPs
 * - Support CIDR ranges
 * - Auto-expire bans
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import type { PrismaClient } from '@prisma/client';

// Type assertion để fix TypeScript language server cache issue
// WHY: Prisma client chưa generate sau khi thêm models mới
const prismaWithIPManagement = prisma as PrismaClient & {
  iPBlacklist: {
    findMany: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
  iPWhitelist: {
    findMany: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
};

/**
 * Check if IP matches CIDR range
 * WHY: Support blocking IP ranges, not just single IPs
 */
function ipMatchesCIDR(ip: string, cidr: string): boolean {
  // If not CIDR format, do exact match
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  try {
    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    // Convert IPs to numbers
    const ipToNumber = (ip: string): number => {
      return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    };

    const networkNum = ipToNumber(network);
    const ipNum = ipToNumber(ip);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;

    return (networkNum & mask) === (ipNum & mask);
  } catch (error) {
    logger.warn('Invalid CIDR format', { cidr, error });
    return false;
  }
}

/**
 * IP Management Service
 */
export class IPManagementService {
  /**
   * Check if IP is blacklisted
   * WHY: Middleware cần check nhanh
   */
  async isIPBlacklisted(ipAddress: string): Promise<boolean> {
    try {
      // First check whitelist (whitelist takes priority)
      const isWhitelisted = await this.isIPWhitelisted(ipAddress);
      if (isWhitelisted) {
        return false; // Whitelisted IPs are never blacklisted
      }

      // Check blacklist
      const blacklistEntries = await prismaWithIPManagement.iPBlacklist.findMany({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null }, // Never expires
            { expiresAt: { gt: new Date() } }, // Not expired yet
          ],
        },
      });

      // Check if IP matches any blacklist entry (supports CIDR)
      for (const entry of blacklistEntries) {
        if (ipMatchesCIDR(ipAddress, entry.ipAddress)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check IP blacklist', {
        ipAddress,
        error: error instanceof Error ? error.message : String(error),
      });
      // On error, don't block (fail open for availability)
      return false;
    }
  }

  /**
   * Check if IP is whitelisted
   * WHY: Whitelist bypasses all restrictions
   */
  async isIPWhitelisted(ipAddress: string): Promise<boolean> {
    try {
      const whitelistEntries = await prismaWithIPManagement.iPWhitelist.findMany({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null }, // Never expires
            { expiresAt: { gt: new Date() } }, // Not expired yet
          ],
        },
      });

      // Check if IP matches any whitelist entry (supports CIDR)
      for (const entry of whitelistEntries) {
        if (ipMatchesCIDR(ipAddress, entry.ipAddress)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check IP whitelist', {
        ipAddress,
        error: error instanceof Error ? error.message : String(error),
      });
      // On error, don't whitelist (fail closed for security)
      return false;
    }
  }

  /**
   * Add IP to blacklist
   * WHY: Admin ban IP
   */
  async addToBlacklist(data: {
    ipAddress: string;
    reason?: string;
    bannedBy?: string;
    expiresAt?: Date;
  }): Promise<{
    id: string;
    ipAddress: string;
    reason: string | null;
    bannedBy: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
  }> {
    // Check if already blacklisted
    const existing = await prismaWithIPManagement.iPBlacklist.findUnique({
      where: { ipAddress: data.ipAddress },
    });

    if (existing) {
      // Update existing entry
      const updated = await prismaWithIPManagement.iPBlacklist.update({
        where: { id: existing.id },
        data: {
          reason: data.reason || existing.reason,
          bannedBy: data.bannedBy || existing.bannedBy,
          isActive: true,
          expiresAt: data.expiresAt || existing.expiresAt,
        },
      });

      logger.info('IP blacklist updated', {
        ipAddress: data.ipAddress,
        id: updated.id,
      });

      return {
        id: updated.id,
        ipAddress: updated.ipAddress,
        reason: updated.reason,
        bannedBy: updated.bannedBy,
        isActive: updated.isActive,
        expiresAt: updated.expiresAt,
        createdAt: updated.createdAt,
      };
    }

    // Create new entry
    const created = await prismaWithIPManagement.iPBlacklist.create({
      data: {
        ipAddress: data.ipAddress,
        reason: data.reason || null,
        bannedBy: data.bannedBy || null,
        isActive: true,
        expiresAt: data.expiresAt || null,
      },
    });

    logger.info('IP added to blacklist', {
      ipAddress: data.ipAddress,
      id: created.id,
      reason: data.reason,
    });

    return {
      id: created.id,
      ipAddress: created.ipAddress,
      reason: created.reason,
      bannedBy: created.bannedBy,
      isActive: created.isActive,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    };
  }

  /**
   * Remove IP from blacklist
   * WHY: Admin unban IP
   */
  async removeFromBlacklist(ipAddress: string): Promise<void> {
    const entry = await prismaWithIPManagement.iPBlacklist.findUnique({
      where: { ipAddress },
    });

    if (!entry) {
      throw new Error(`IP ${ipAddress} is not in blacklist`);
    }

    await prismaWithIPManagement.iPBlacklist.delete({
      where: { id: entry.id },
    });

    logger.info('IP removed from blacklist', {
      ipAddress,
      id: entry.id,
    });
  }

  /**
   * Add IP to whitelist
   * WHY: Admin whitelist trusted IP
   */
  async addToWhitelist(data: {
    ipAddress: string;
    reason?: string;
    addedBy?: string;
    expiresAt?: Date;
  }): Promise<{
    id: string;
    ipAddress: string;
    reason: string | null;
    addedBy: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
  }> {
    // Check if already whitelisted
    const existing = await prismaWithIPManagement.iPWhitelist.findUnique({
      where: { ipAddress: data.ipAddress },
    });

    if (existing) {
      // Update existing entry
      const updated = await prismaWithIPManagement.iPWhitelist.update({
        where: { id: existing.id },
        data: {
          reason: data.reason || existing.reason,
          addedBy: data.addedBy || existing.addedBy,
          isActive: true,
          expiresAt: data.expiresAt || existing.expiresAt,
        },
      });

      logger.info('IP whitelist updated', {
        ipAddress: data.ipAddress,
        id: updated.id,
      });

      return {
        id: updated.id,
        ipAddress: updated.ipAddress,
        reason: updated.reason,
        addedBy: updated.addedBy,
        isActive: updated.isActive,
        expiresAt: updated.expiresAt,
        createdAt: updated.createdAt,
      };
    }

    // Create new entry
    const created = await prismaWithIPManagement.iPWhitelist.create({
      data: {
        ipAddress: data.ipAddress,
        reason: data.reason || null,
        addedBy: data.addedBy || null,
        isActive: true,
        expiresAt: data.expiresAt || null,
      },
    });

    logger.info('IP added to whitelist', {
      ipAddress: data.ipAddress,
      id: created.id,
      reason: data.reason,
    });

    return {
      id: created.id,
      ipAddress: created.ipAddress,
      reason: created.reason,
      addedBy: created.addedBy,
      isActive: created.isActive,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    };
  }

  /**
   * Remove IP from whitelist
   * WHY: Admin remove whitelist
   */
  async removeFromWhitelist(ipAddress: string): Promise<void> {
    const entry = await prismaWithIPManagement.iPWhitelist.findUnique({
      where: { ipAddress },
    });

    if (!entry) {
      throw new Error(`IP ${ipAddress} is not in whitelist`);
    }

    await prismaWithIPManagement.iPWhitelist.delete({
      where: { id: entry.id },
    });

    logger.info('IP removed from whitelist', {
      ipAddress,
      id: entry.id,
    });
  }

  /**
   * Get all blacklisted IPs
   * WHY: Admin xem danh sách
   */
  async getBlacklist(options: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<{
    data: Array<{
      id: string;
      ipAddress: string;
      reason: string | null;
      bannedBy: string | null;
      isActive: boolean;
      expiresAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [entries, total] = await Promise.all([
      prismaWithIPManagement.iPBlacklist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaWithIPManagement.iPBlacklist.count({ where }),
    ]);

    return {
      data: entries.map((entry: any) => ({
        id: entry.id,
        ipAddress: entry.ipAddress,
        reason: entry.reason,
        bannedBy: entry.bannedBy,
        isActive: entry.isActive,
        expiresAt: entry.expiresAt,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all whitelisted IPs
   * WHY: Admin xem danh sách
   */
  async getWhitelist(options: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<{
    data: Array<{
      id: string;
      ipAddress: string;
      reason: string | null;
      addedBy: string | null;
      isActive: boolean;
      expiresAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [entries, total] = await Promise.all([
      prismaWithIPManagement.iPWhitelist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaWithIPManagement.iPWhitelist.count({ where }),
    ]);

    return {
      data: entries.map((entry: any) => ({
        id: entry.id,
        ipAddress: entry.ipAddress,
        reason: entry.reason,
        addedBy: entry.addedBy,
        isActive: entry.isActive,
        expiresAt: entry.expiresAt,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Ban IP (alias for addToBlacklist)
   * WHY: Convenience method
   */
  async banIP(data: {
    ipAddress: string;
    reason?: string;
    bannedBy?: string;
    expiresAt?: Date;
  }): Promise<{
    id: string;
    ipAddress: string;
    reason: string | null;
    bannedBy: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
  }> {
    return this.addToBlacklist(data);
  }

  /**
   * Unban IP (alias for removeFromBlacklist)
   * WHY: Convenience method
   */
  async unbanIP(ipAddress: string): Promise<void> {
    return this.removeFromBlacklist(ipAddress);
  }

  /**
   * Toggle blacklist entry active status
   * WHY: Tạm thời disable/enable ban
   */
  async toggleBlacklistStatus(ipAddress: string, isActive: boolean): Promise<void> {
    const entry = await prismaWithIPManagement.iPBlacklist.findUnique({
      where: { ipAddress },
    });

    if (!entry) {
      throw new Error(`IP ${ipAddress} is not in blacklist`);
    }

    await prismaWithIPManagement.iPBlacklist.update({
      where: { id: entry.id },
      data: { isActive },
    });

    logger.info('IP blacklist status toggled', {
      ipAddress,
      isActive,
    });
  }

  /**
   * Toggle whitelist entry active status
   * WHY: Tạm thời disable/enable whitelist
   */
  async toggleWhitelistStatus(ipAddress: string, isActive: boolean): Promise<void> {
    const entry = await prismaWithIPManagement.iPWhitelist.findUnique({
      where: { ipAddress },
    });

    if (!entry) {
      throw new Error(`IP ${ipAddress} is not in whitelist`);
    }

    await prismaWithIPManagement.iPWhitelist.update({
      where: { id: entry.id },
      data: { isActive },
    });

    logger.info('IP whitelist status toggled', {
      ipAddress,
      isActive,
    });
  }
}

// Export singleton instance
export const ipManagementService = new IPManagementService();

