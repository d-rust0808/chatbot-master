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

  // Get tenant subscription (tenant admin can view their own tenant)
  fastify.get('/billing/subscription', getTenantSubscriptionHandler);

  // Get tenant credit (tenant admin can view their own tenant)
  fastify.get('/billing/credit', getTenantCreditHandler);
}


