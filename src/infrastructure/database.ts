/**
 * Prisma database client
 * 
 * WHY: Singleton pattern cho Prisma client
 * - Reuse connection pool
 * - Prevent multiple instances
 * - Type-safe database access
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';
import { config } from './config';

// PrismaClient với logging trong development
// WHY: Log errors và warnings, query logging có thể enable sau nếu cần
const prismaClientOptions: Prisma.PrismaClientOptions = config.isDevelopment
  ? {
      log: [
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'info', emit: 'stdout' },
      ],
    }
  : {
      log: [{ level: 'error', emit: 'stdout' }],
    };

// Create Prisma client instance
export const prisma = new PrismaClient(prismaClientOptions);

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Database connection closed');
});

