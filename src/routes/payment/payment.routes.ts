/**
 * Payment Routes - Sepay Integration
 * 
 * WHY: Route definitions cho payment APIs
 * - Admin endpoints (cần auth)
 * - Webhook endpoint (public, không cần auth)
 * - Super admin endpoints
 */

import { FastifyInstance } from 'fastify';
import {
  createPaymentHandler,
  getPaymentHistoryHandler,
  getPaymentDetailHandler,
  getPaymentStatusHandler,
  getPendingPaymentHandler,
  cancelPendingPaymentHandler,
  cancelPaymentByIdHandler,
} from '../../controllers/payment/payment.controller';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/role-check';

export async function paymentRoutes(fastify: FastifyInstance) {
  // WHY: Webhook endpoint đã được đăng ký ở routes/index.ts
  // - Đăng ký ở level cao hơn để tránh middleware auth
  // - Không cần đăng ký lại ở đây

  // Admin endpoints (require authentication + admin role)
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireAdmin);

  // Create payment
  fastify.post('/', createPaymentHandler);

  // Get payment history
  fastify.get('/', getPaymentHistoryHandler);

  // Get payment status by code (public, but rate limited)
  fastify.get('/status/:code', getPaymentStatusHandler);

  // Get pending payment
  fastify.get('/pending', getPendingPaymentHandler);

  // Cancel pending payment (first pending)
  fastify.delete('/pending', cancelPendingPaymentHandler);

  // Get payment detail
  fastify.get('/:id', getPaymentDetailHandler);

  // Cancel payment by ID
  fastify.delete('/:id', cancelPaymentByIdHandler);
  
  // NOTE: Super admin endpoints (getAllPaymentsHandler, manualCompletePaymentHandler)
  // are registered separately in routes/index.ts with prefix /sp-admin/payments
}

