/**
 * Admin Service Package Controller
 * 
 * WHY: Admin APIs để quản lý service packages
 * - Create, update, delete packages
 * - Upload images
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createServicePackage,
  updateServicePackage,
  deleteServicePackage,
  getAllServicePackages,
  getServicePackageByIdAdmin,
  saveServicePackageImage,
} from '../../services/service-package/admin.service';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest } from '../../types/auth';

// Type for multipart part
interface MultipartPart {
  type: 'file' | 'field';
  fieldname: string;
  value?: string;
  filename?: string;
  mimetype?: string;
  encoding?: string;
  toBuffer?: () => Promise<Buffer>;
}

const packageIdParamSchema = z.object({
  id: z.string().min(1),
});

/**
 * Create service package (with image upload)
 * POST /api/v1/admin/service-packages
 * Content-Type: multipart/form-data
 * Fields: name, description, service, pricePerMonth, minDuration, image (file)
 */
export async function createServicePackageHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    
    // Check admin role
    if (authRequest.user?.role !== 'sp-admin') {
      return reply.status(403).send({
        error: {
          message: 'Forbidden: Super admin only',
          statusCode: 403,
        },
      });
    }

    // Log request for debugging
    logger.info('Create service package handler called', {
      contentType: request.headers['content-type'],
      hasMultipart: request.isMultipart(),
      url: request.url,
      method: request.method,
    });

    // Parse multipart form data
    let formData: Record<string, any> = {};
    let imageFile: any = null;

    try {
      // Check if request is multipart
      if (!request.isMultipart()) {
        logger.warn('Request is not multipart', {
          contentType: request.headers['content-type'],
        });
        return reply.status(400).send({
          error: {
            message: 'Content-Type must be multipart/form-data',
            statusCode: 400,
          },
        });
      }

      logger.info('Starting multipart parsing', {
        contentType: request.headers['content-type'],
        contentLength: request.headers['content-length'],
      });

      // WHY: Parse multipart với timeout và error handling tốt hơn
      const parseTimeout = 30000; // 30 seconds
      let parseStartTime = Date.now();
      
      try {
        const parts = request.parts();
        let partCount = 0;
        
        logger.info('Got parts iterator, starting to consume', {
          hasParts: !!parts,
        });
        
        for await (const part of parts) {
          partCount++;
          const elapsed = Date.now() - parseStartTime;
          
          // Check timeout trong loop
          if (elapsed > parseTimeout) {
            throw new Error(`Multipart parsing timeout after ${elapsed}ms`);
          }
          
          const multipartPart = part as MultipartPart;
          
          logger.info('Processing multipart part', {
            partNumber: partCount,
            elapsed: `${elapsed}ms`,
            type: multipartPart.type,
            fieldname: multipartPart.fieldname,
            filename: multipartPart.filename,
          });
          
          if (multipartPart.type === 'file') {
            logger.info('Image file part received, reading buffer', {
              filename: multipartPart.filename,
              mimetype: multipartPart.mimetype,
              hasToBuffer: typeof multipartPart.toBuffer === 'function',
            });
            
            // WHY: Đọc buffer ngay trong loop để consume stream đúng cách
            try {
              if (!multipartPart.toBuffer) {
                throw new Error('File part does not have toBuffer method');
              }
              
              const buffer = await multipartPart.toBuffer();
              imageFile = {
                ...multipartPart,
                buffer, // Store buffer để dùng sau
              };
              logger.info('Image file buffer read successfully', {
                filename: multipartPart.filename,
                bufferSize: buffer.length,
              });
            } catch (bufferError) {
              logger.error('Failed to read image buffer', {
                error: bufferError instanceof Error ? bufferError.message : String(bufferError),
                filename: multipartPart.filename,
              });
              throw bufferError;
            }
          } else {
            formData[multipartPart.fieldname] = multipartPart.value;
            logger.info('Form field received', {
              fieldname: multipartPart.fieldname,
              value: typeof multipartPart.value === 'string' ? multipartPart.value.substring(0, 100) : multipartPart.value,
            });
          }
        }
        
        const totalElapsed = Date.now() - parseStartTime;
        logger.info('Multipart parsing completed', {
          totalParts: partCount,
          formFieldsCount: Object.keys(formData).length,
          hasImage: !!imageFile,
          elapsed: `${totalElapsed}ms`,
        });
      } catch (parseError) {
        const elapsed = Date.now() - parseStartTime;
        logger.error('Error during multipart parsing', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          stack: parseError instanceof Error ? parseError.stack : undefined,
          elapsed: `${elapsed}ms`,
        });
        throw parseError;
      }
    } catch (multipartError) {
      logger.error('Multipart parsing error:', {
        error: multipartError instanceof Error ? multipartError.message : String(multipartError),
        stack: multipartError instanceof Error ? multipartError.stack : undefined,
        contentType: request.headers['content-type'],
      });
      return reply.status(400).send({
        error: {
          message: 'Failed to parse multipart form data',
          statusCode: 400,
          details: multipartError instanceof Error ? multipartError.message : String(multipartError),
        },
        api_version: 'v1',
        provider: 'cdudu',
      });
    }

    logger.info('Parsed form data successfully', {
      formDataKeys: Object.keys(formData),
      hasImage: !!imageFile,
      formData: {
        name: formData.name,
        service: formData.service,
        pricePerMonth: formData.pricePerMonth,
      },
    });

    // Extract form fields
    const name = formData.name;
    const description = formData.description;
    const service = formData.service;
    const pricePerMonth = parseInt(formData.pricePerMonth || '0', 10);
    const minDuration = parseInt(formData.minDuration || '1', 10);
    const sortOrder = parseInt(formData.sortOrder || '0', 10);

    logger.info('Extracted form fields', {
      name,
      description,
      service,
      pricePerMonth,
      minDuration,
      sortOrder,
    });

    // Validate required fields
    if (!name || !service || !pricePerMonth || pricePerMonth <= 0) {
      logger.warn('Validation failed: Missing required fields', {
        hasName: !!name,
        hasService: !!service,
        pricePerMonth,
        formData,
      });
      return reply.status(400).send({
        error: {
          message: 'Missing required fields: name, service, pricePerMonth',
          statusCode: 400,
          details: {
            name: name || 'missing',
            service: service || 'missing',
            pricePerMonth: pricePerMonth || 'missing or invalid',
          },
        },
      });
    }

    // Handle image upload
    let imageUrl: string | undefined;
    if (imageFile) {
      logger.info('Processing image upload', {
        filename: imageFile.filename,
        mimetype: imageFile.mimetype,
        hasBuffer: !!(imageFile as any).buffer,
      });
      
      // WHY: Dùng buffer đã đọc sẵn trong loop, không đọc lại
      const buffer = (imageFile as any).buffer || await imageFile.toBuffer();
      const file = {
        filename: imageFile.filename || 'image.jpg',
        mimetype: imageFile.mimetype || 'image/jpeg',
        buffer,
      };
      
      logger.info('Saving image file', {
        filename: file.filename,
        bufferSize: buffer.length,
      });
      
      imageUrl = await saveServicePackageImage(file);
      
      logger.info('Image saved successfully', {
        imageUrl,
      });
    }

    // Create package
    logger.info('Creating service package in database', {
      name,
      service,
      pricePerMonth,
    });
    
    const package_ = await createServicePackage({
      name,
      description,
      service,
      pricePerMonth,
      minDuration,
      imageUrl,
      sortOrder,
    });

    logger.info('Service package created successfully', {
      packageId: package_.id,
      name: package_.name,
    });

    const response = {
      success: true,
      message: 'Service package created successfully',
      data: package_,
    };

    logger.info('Sending success response', {
      statusCode: 201,
      packageId: package_.id,
    });

    return reply.status(201).send(response);
  } catch (error) {
    logger.error('Create service package error:', {
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      requestHeaders: {
        contentType: request.headers['content-type'],
        authorization: request.headers.authorization ? 'Bearer ***' : 'missing',
      },
      url: request.url,
      method: request.method,
    });

    const errorResponse = {
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500,
        api_version: 'v1',
        provider: 'cdudu',
      },
    };

    logger.info('Sending error response', {
      statusCode: 500,
      errorMessage: errorResponse.error.message,
    });

    // Đảm bảo response luôn được gửi
    try {
      return reply.status(500).send(errorResponse);
    } catch (sendError) {
      logger.error('Failed to send error response', {
        error: sendError instanceof Error ? sendError.message : String(sendError),
      });
      // Nếu không thể gửi response, ít nhất log ra
      throw error;
    }
  }
}

/**
 * Update service package
 * PUT /api/v1/admin/service-packages/:id
 */
export async function updateServicePackageHandler(
  request: FastifyRequest<{
    Params: z.infer<typeof packageIdParamSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    
    if (authRequest.user?.role !== 'sp-admin') {
      return reply.status(403).send({
        error: {
          message: 'Forbidden: Super admin only',
          statusCode: 403,
        },
      });
    }

    const { id } = packageIdParamSchema.parse(request.params);
    
    // Parse multipart form data
    const parts = request.parts();
    const formData: Record<string, any> = {};
    let imageFile: any = null;

    for await (const part of parts) {
      if (part.type === 'file') {
        imageFile = part;
      } else {
        formData[part.fieldname] = part.value;
      }
    }

    // Extract form fields
    const updateData: any = {};
    if (formData.name) updateData.name = formData.name;
    if (formData.description !== undefined) updateData.description = formData.description;
    if (formData.service) updateData.service = formData.service;
    if (formData.pricePerMonth) updateData.pricePerMonth = parseInt(formData.pricePerMonth, 10);
    if (formData.minDuration) updateData.minDuration = parseInt(formData.minDuration, 10);
    if (formData.sortOrder !== undefined) updateData.sortOrder = parseInt(formData.sortOrder || '0', 10);
    if (formData.isActive !== undefined) {
      updateData.isActive = formData.isActive === 'true' || formData.isActive === true;
    }

    // Handle image upload
    if (imageFile) {
      const buffer = await imageFile.toBuffer();
      const file = {
        filename: imageFile.filename || 'image.jpg',
        mimetype: imageFile.mimetype || 'image/jpeg',
        buffer,
      };
      updateData.imageUrl = await saveServicePackageImage(file);
    }

    const updated = await updateServicePackage(id, updateData);

    return reply.status(200).send({
      success: true,
      message: 'Service package updated successfully',
      data: updated,
    });
  } catch (error) {
    logger.error('Update service package error:', error);
    return reply.status(400).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 400,
      },
    });
  }
}

/**
 * Delete service package
 * DELETE /api/v1/admin/service-packages/:id
 */
export async function deleteServicePackageHandler(
  request: FastifyRequest<{
    Params: z.infer<typeof packageIdParamSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    
    if (authRequest.user?.role !== 'sp-admin') {
      return reply.status(403).send({
        error: {
          message: 'Forbidden: Super admin only',
          statusCode: 403,
        },
      });
    }

    const { id } = packageIdParamSchema.parse(request.params);

    await deleteServicePackage(id);

    return reply.status(200).send({
      success: true,
      message: 'Service package deleted successfully',
    });
  } catch (error) {
    logger.error('Delete service package error:', error);
    return reply.status(400).send({
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 400,
      },
    });
  }
}

/**
 * Get all service packages (admin view)
 * GET /api/v1/admin/service-packages?service=whatsapp&isActive=true
 */
export async function getAllServicePackagesHandler(
  request: FastifyRequest<{
    Querystring: { service?: string; isActive?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    
    if (authRequest.user?.role !== 'sp-admin') {
      return reply.status(403).send({
        error: {
          message: 'Forbidden: Super admin only',
          statusCode: 403,
        },
      });
    }

    const filters: any = {};
    if (request.query.service) {
      filters.service = request.query.service;
    }
    if (request.query.isActive !== undefined) {
      filters.isActive = request.query.isActive === 'true';
    }

    const packages = await getAllServicePackages(filters);

    return reply.status(200).send({
      success: true,
      data: packages,
    });
  } catch (error) {
    logger.error('Get all service packages error:', error);
    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        statusCode: 500,
      },
    });
  }
}

/**
 * Get service package by ID (Admin)
 * GET /api/v1/admin/service-packages/:id
 */
export async function getServicePackageByIdAdminHandler(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    
    if (authRequest.user?.role !== 'sp-admin') {
      return reply.status(403).send({
        error: {
          message: 'Forbidden: Super admin only',
          statusCode: 403,
        },
      });
    }

    const { id } = request.params;
    const servicePackage = await getServicePackageByIdAdmin(id);

    return reply.status(200).send({
      success: true,
      data: servicePackage,
    });
  } catch (error) {
    logger.error('Get service package by ID admin error:', error);
    return reply.status(404).send({
      error: {
        message: error instanceof Error ? error.message : 'Service package not found',
        statusCode: 404,
      },
    });
  }
}

