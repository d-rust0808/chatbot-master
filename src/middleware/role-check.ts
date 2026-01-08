/**
 * Role Check Middleware
 * 
 * WHY: Check user roles để authorize access
 * - sp-admin: Full system access
 * - admin: Tenant admin access
 * - customer: Limited access
 * 
 * NOTE: Assume authentication đã được check ở route level
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { isSuperAdmin, isAdminOrSuperAdmin } from '../types/roles';
import type { AuthenticatedRequest } from '../types/auth';

/**
 * Require super admin role
 * WHY: Protect routes chỉ dành cho sp-admin
 * NOTE: Must be used after authenticate middleware
 */
export async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authRequest = request as AuthenticatedRequest;
  const userRole = authRequest.user?.role;
  
  if (!isSuperAdmin(userRole)) {
    return reply.status(403).send({
      error: {
        message: 'Super admin access required',
        statusCode: 403,
      },
    });
  }
}

/**
 * Require admin or super admin role
 * NOTE: Must be used after authenticate middleware
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authRequest = request as AuthenticatedRequest;
  const userRole = authRequest.user?.role;
  
  // Debug log
  const { logger } = await import('../infrastructure/logger');
  logger.debug('requireAdmin check', { 
    userRole, 
    isAdmin: userRole === 'admin', 
    isSuperAdmin: userRole === 'sp-admin',
    isAdminOrSuperAdmin: isAdminOrSuperAdmin(userRole)
  });
  
  if (!isAdminOrSuperAdmin(userRole)) {
    return reply.status(403).send({
      error: {
        message: 'Admin access required',
        statusCode: 403,
        details: {
          userRole,
          required: 'admin or sp-admin',
        },
      },
    });
  }
}

