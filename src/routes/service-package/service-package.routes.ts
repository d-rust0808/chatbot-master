/**
 * Service Package Routes
 * 
 * WHY: Route definitions cho service package APIs
 */

import { FastifyInstance } from 'fastify';
import {
  getServicePackagesHandler,
  purchaseServicePackageHandler,
  getTenantSubscriptionsHandler,
  cancelSubscriptionHandler,
} from '../../controllers/service-package/service-package.controller';
import { authenticate } from '../../middleware/auth';

export async function servicePackageRoutes(fastify: FastifyInstance) {
  // Public: Get packages (no auth required)
  fastify.get('/', getServicePackagesHandler);

  // Authenticated routes
  fastify.addHook('preHandler', authenticate);

  // Purchase package
  fastify.post('/:packageId/purchase', purchaseServicePackageHandler);

  // Get tenant subscriptions
  fastify.get('/subscriptions', getTenantSubscriptionsHandler);

  // Cancel subscription
  fastify.post('/subscriptions/:subscriptionId/cancel', cancelSubscriptionHandler);
}

