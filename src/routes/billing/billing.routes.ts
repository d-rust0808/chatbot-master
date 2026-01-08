/**
 * Billing / Credit routes
 *
 * WHY: Tenant-level billing info (subscription, plan limit, credit wallet).
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/role-check';
import {
  getTenantSubscriptionHandler,
  getTenantCreditHandler,
} from '../../controllers/billing/billing.controller';

export async function billingRoutes(fastify: FastifyInstance) {
  // Require authenticated tenant admin
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireAdmin);

  fastify.get(
    '/tenants/:tenantId/billing/subscription',
    getTenantSubscriptionHandler
  );

  fastify.get('/tenants/:tenantId/billing/credit', getTenantCreditHandler);
}


