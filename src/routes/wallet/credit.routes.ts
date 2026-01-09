/**
 * Credit Routes
 * 
 * WHY: Route definitions cho credit APIs
 * - Balance check
 * - Transaction history
 */

import { FastifyInstance } from 'fastify';
import {
  getAllBalancesHandler,
  getBalanceHandler,
  getTransactionHistoryHandler,
  getVNDBalanceHandler,
  purchaseCreditsHandler,
  getCreditPackagesHandler,
  purchaseCreditPackageHandler,
  getVNDTransactionHistoryHandler,
} from '../../controllers/wallet/credit.controller';
import { authenticate } from '../../middleware/auth';

export async function creditRoutes(fastify: FastifyInstance) {
  // All credit routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Get all balances (VND + Credit) - Recommended for frontend
  fastify.get('/balances', getAllBalancesHandler); // Both VND and Credit balances

  // Credit wallet (for AI usage)
  fastify.get('/balance', getBalanceHandler); // Credit balance only
  fastify.get('/transactions', getTransactionHistoryHandler); // Credit transactions

  // VND wallet (real money)
  fastify.get('/vnd-balance', getVNDBalanceHandler); // VND balance only
  fastify.get('/vnd-transactions', getVNDTransactionHistoryHandler); // VND transactions

  // Purchase credits
  fastify.post('/purchase', purchaseCreditsHandler); // Buy credits from VND wallet
  fastify.get('/packages', getCreditPackagesHandler); // Get available packages
  fastify.post('/packages/:packageId/purchase', purchaseCreditPackageHandler); // Buy package
}

