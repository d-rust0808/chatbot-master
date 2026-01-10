/**
 * Catalog Controller
 *
 * WHY: Tenant Admin quản lý danh mục & sản phẩm để chatbot có thể tư vấn / bán hàng.
 * - CRUD Category
 * - CRUD Product
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest } from '../../types/auth';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

const tenantParamSchema = z.object({
  tenantId: z.string().min(1),
});

const categoryBodySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  parentId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

const productBodySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  categoryId: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().min(1).max(10).default('USD'),
  stock: z.number().int().nonnegative().optional().default(0),
  isActive: z.boolean().optional().default(true),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .transform((val) => (val === undefined ? undefined : (val as unknown))),
});

const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

function getTenantIdFromRequest(request: FastifyRequest): string {
  const paramsResult = tenantParamSchema.safeParse(request.params);
  if (paramsResult.success) {
    return paramsResult.data.tenantId;
  }

  const authRequest = request as AuthenticatedRequest;
  const tenantId = authRequest.user?.tenantId;
  if (!tenantId) {
    throw new Error('Tenant context not found');
  }
  return tenantId;
}

export async function listCategoriesHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      isActive?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const validated = listQuerySchema.parse(request.query);

    const page = validated.page || 1;
    const limit = Math.min(validated.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (validated.search) {
      where.name = {
        contains: validated.search,
        mode: 'insensitive',
      };
    }
    if (validated.isActive !== undefined) {
      where.isActive = validated.isActive;
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.category.count({ where }),
    ]);

    const formattedResponse = formatSuccessResponse(
      categories,
      200,
      'Categories retrieved successfully',
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Validation error',
          400,
          error.errors
        )
      );
    }

    logger.error('List categories error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

export async function createCategoryHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
    Body: z.infer<typeof categoryBodySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const body = categoryBodySchema.parse(request.body);

    const created = await prisma.category.create({
      data: {
        tenantId,
        name: body.name,
        slug: body.slug,
        parentId: body.parentId,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    const formattedResponse = formatSuccessResponse(
      created,
      201,
      'Category created successfully'
    );
    return reply.status(201).send(formattedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Validation error',
          400,
          error.errors
        )
      );
    }

    logger.error('Create category error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

export async function updateCategoryHandler(
  request: FastifyRequest<{
    Params: { tenantId: string; categoryId: string };
    Body: Partial<z.infer<typeof categoryBodySchema>>;
  }>,
  reply: FastifyReply
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const { categoryId } = request.params;
    const body = categoryBodySchema.partial().parse(request.body);

    const existing = await prisma.category.findFirst({
      where: { id: categoryId, tenantId },
    });

    if (!existing) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          'Category not found',
          404
        )
      );
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: body,
    });

    const formattedResponse = formatSuccessResponse(
      updated,
      200,
      'Category updated successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Validation error',
          400,
          error.errors
        )
      );
    }

    logger.error('Update category error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

export async function deleteCategoryHandler(
  request: FastifyRequest<{
    Params: { tenantId: string; categoryId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const { categoryId } = request.params;

    const existing = await prisma.category.findFirst({
      where: { id: categoryId, tenantId },
    });

    if (!existing) {
      return reply.status(404).send(
        formatErrorResponse(
          'NOT_FOUND_ERROR',
          'Category not found',
          404
        )
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    const formattedResponse = formatSuccessResponse(
      null,
      204,
      'Category deleted successfully'
    );
    return reply.status(204).send(formattedResponse);
  } catch (error) {
    logger.error('Delete category error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

export async function listProductsHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      isActive?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const validated = listQuerySchema.parse(request.query);

    const page = validated.page || 1;
    const limit = Math.min(validated.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (validated.search) {
      where.OR = [
        { name: { contains: validated.search, mode: 'insensitive' } },
        { slug: { contains: validated.search, mode: 'insensitive' } },
      ];
    }
    if (validated.isActive !== undefined) {
      where.isActive = validated.isActive;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    const formattedResponse = formatSuccessResponse(
      products,
      200,
      'Products retrieved successfully',
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Validation error',
          400,
          error.errors
        )
      );
    }

    logger.error('List products error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

export async function createProductHandler(
  request: FastifyRequest<{
    Params: { tenantId: string };
    Body: z.infer<typeof productBodySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const body = productBodySchema.parse(request.body);

    const created = await prisma.product.create({
      data: {
        tenantId,
        name: body.name,
        slug: body.slug,
        description: body.description,
        categoryId: body.categoryId,
        priceCents: body.priceCents,
        currency: body.currency,
        stock: body.stock ?? 0,
        isActive: body.isActive ?? true,
        metadata: (body.metadata ?? undefined) as any,
      },
    });

    const formattedResponse = formatSuccessResponse(
      created,
      201,
      'Product created successfully'
    );
    return reply.status(201).send(formattedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Validation error',
          400,
          error.errors
        )
      );
    }

    logger.error('Create product error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

export async function updateProductHandler(
  request: FastifyRequest<{
    Params: { tenantId: string; productId: string };
    Body: Partial<z.infer<typeof productBodySchema>>;
  }>,
  reply: FastifyReply
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const { productId } = request.params;
    const body = productBodySchema.partial().parse(request.body);

    const existing = await prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: {
          message: 'Product not found',
          statusCode: 404,
        },
      });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...body,
        metadata: (body.metadata ?? undefined) as any,
      } as any,
    });

    const formattedResponse = formatSuccessResponse(
      updated,
      200,
      'Product updated successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(
        formatErrorResponse(
          'VALIDATION_ERROR',
          'Validation error',
          400,
          error.errors
        )
      );
    }

    logger.error('Update product error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

export async function deleteProductHandler(
  request: FastifyRequest<{
    Params: { tenantId: string; productId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    const { productId } = request.params;

    const existing = await prisma.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: {
          message: 'Product not found',
          statusCode: 404,
        },
      });
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    const formattedResponse = formatSuccessResponse(
      null,
      204,
      'Product deleted successfully'
    );
    return reply.status(204).send(formattedResponse);
  } catch (error) {
    logger.error('Delete product error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}


