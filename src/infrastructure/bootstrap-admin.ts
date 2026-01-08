/**
 * Bootstrap Admin User
 * 
 * WHY: Tự động tạo admin user khi server start
 * - Check nếu admin đã tồn tại thì skip
 * - Tạo admin user từ env variables
 * - Tạo tenant cho admin nếu có tenantName
 */

import { prisma } from './database';
import { logger } from './logger';
import { config } from './config';
import bcrypt from 'bcrypt';

/**
 * Bootstrap admin user on startup
 * WHY: Auto-create admin để có thể login ngay
 */
export async function bootstrapAdmin(): Promise<void> {
  try {
    // Check if admin config exists
    if (!config.admin.email || !config.admin.password) {
      logger.debug('Admin credentials not configured, skipping admin bootstrap');
      return;
    }

    // Check if admin already exists - nếu có rồi thì bỏ qua
    const existingAdmin = await prisma.user.findUnique({
      where: { email: config.admin.email },
      include: {
        tenants: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (existingAdmin) {
      logger.info('✅ Admin user already exists, skipping creation', {
        email: config.admin.email,
        userId: existingAdmin.id,
        tenantCount: existingAdmin.tenants.length,
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(config.admin.password, 10);

    // Create admin user với role sp-admin
    const adminUser = await prisma.user.create({
      data: {
        email: config.admin.email,
        password: hashedPassword,
        name: config.admin.name || 'Admin',
        systemRole: 'sp-admin', // Super admin role
      },
    });

    logger.info('✅ Admin user created', {
      userId: adminUser.id,
      email: adminUser.email,
    });

    // Create tenant for admin if tenantName provided
    if (config.admin.tenantName) {
      const tenantSlug = config.admin.tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if tenant already exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        include: {
          users: {
            where: { userId: adminUser.id },
          },
        },
      });

      if (!existingTenant) {
        // Tenant chưa có → tạo mới
        const tenant = await prisma.tenant.create({
          data: {
            name: config.admin.tenantName,
            slug: tenantSlug,
            users: {
              create: {
                userId: adminUser.id,
                role: 'owner',
              },
            },
          },
        });

        logger.info('✅ Admin tenant created', {
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
        });
      } else {
        // Tenant đã có → check xem admin đã link chưa
        const isAlreadyLinked = existingTenant.users.some(
          (tu) => tu.userId === adminUser.id
        );

        if (!isAlreadyLinked) {
          // Link admin to existing tenant
          await prisma.tenantUser.create({
            data: {
              userId: adminUser.id,
              tenantId: existingTenant.id,
              role: 'owner',
            },
          });

          logger.info('✅ Admin linked to existing tenant', {
            tenantId: existingTenant.id,
            tenantName: existingTenant.name,
          });
        } else {
          // Admin đã link với tenant rồi → skip
          logger.info('✅ Admin already linked to tenant, skipping', {
            tenantId: existingTenant.id,
            tenantName: existingTenant.name,
          });
        }
      }
    }

    logger.info('🎉 Admin bootstrap completed successfully');
  } catch (error) {
    logger.error('❌ Failed to bootstrap admin:', error);
    // Don't throw - server can still start without admin
    // Admin can be created manually via API
  }
}

