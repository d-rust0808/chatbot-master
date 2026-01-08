/**
 * Catalog routes
 *
 * WHY: Tenant-level catalog management (category & product) cho admin.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/role-check';
import {
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
  listProductsHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler,
} from '../../controllers/catalog/catalog.controller';

export async function catalogRoutes(fastify: FastifyInstance) {
  // All catalog routes require authenticated tenant admin
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireAdmin);

  // Categories
  fastify.get('/tenants/:tenantId/catalog/categories', listCategoriesHandler);
  fastify.post('/tenants/:tenantId/catalog/categories', createCategoryHandler);
  fastify.patch(
    '/tenants/:tenantId/catalog/categories/:categoryId',
    updateCategoryHandler
  );
  fastify.delete(
    '/tenants/:tenantId/catalog/categories/:categoryId',
    deleteCategoryHandler
  );

  // Products
  fastify.get('/tenants/:tenantId/catalog/products', listProductsHandler);
  fastify.post('/tenants/:tenantId/catalog/products', createProductHandler);
  fastify.patch(
    '/tenants/:tenantId/catalog/products/:productId',
    updateProductHandler
  );
  fastify.delete(
    '/tenants/:tenantId/catalog/products/:productId',
    deleteProductHandler
  );
}


