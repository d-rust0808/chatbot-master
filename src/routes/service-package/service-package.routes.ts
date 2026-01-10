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
  getMyActiveSubscriptionsHandler,
  checkServiceActiveHandler,
} from '../../controllers/service-package/service-package.controller';
import { authenticate } from '../../middleware/auth';

export async function servicePackageRoutes(fastify: FastifyInstance) {
  // WHY: Tất cả routes đều require authentication
  // - Security: Chỉ authenticated users mới có thể xem và đăng ký dịch vụ
  // - Multi-tenant: Cần tenant context để filter packages/subscriptions
  fastify.addHook('preHandler', authenticate);

  // Get packages (now requires auth)
  fastify.get('/', getServicePackagesHandler);

  // Purchase package
  fastify.post('/:packageId/purchase', purchaseServicePackageHandler);

  // Get tenant subscriptions (full details)
  fastify.get('/subscriptions', getTenantSubscriptionsHandler);

  // Get active subscriptions for sidebar (optimized)
  fastify.get('/my-subscriptions', getMyActiveSubscriptionsHandler);

  // Check if specific service is active
  fastify.get('/check/:service', checkServiceActiveHandler);

  // Cancel subscription
  fastify.post('/subscriptions/:subscriptionId/cancel', cancelSubscriptionHandler);
}

