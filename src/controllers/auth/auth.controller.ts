/**
 * Authentication controller
 * 
 * WHY: Request/Response handling
 * - Validate input với Zod
 * - Call services
 * - Format responses
 * - Error handling
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { register, login, refreshAccessToken, logout } from '../../services/auth/auth.service';
import { logger } from '../../infrastructure/logger';
import type { AuthenticatedRequest, LoginRequest, RegisterRequest } from '../../types/auth';
import { formatSuccessResponse, formatErrorResponse } from '../../utils/response-format';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Register new user
 */
export async function registerHandler(
  request: FastifyRequest<{ Body: RegisterRequest }>,
  reply: FastifyReply
) {
  try {
    // Validate input
    const validatedData = registerSchema.parse(request.body);

    // Call service
    const result = await register(validatedData);

    // Return response với format chuẩn
    const formattedResponse = formatSuccessResponse(
      result,
      201,
      'User registered successfully'
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

    logger.error('Register error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

/**
 * Login user
 */
export async function loginHandler(
  request: FastifyRequest<{ Body: LoginRequest }>,
  reply: FastifyReply
) {
  try {
    // Log request for debugging
    logger.debug('Login request received', {
      email: request.body?.email,
      hasPassword: !!request.body?.password,
      bodyKeys: request.body ? Object.keys(request.body) : [],
    });

    // Validate input
    const validatedData = loginSchema.parse(request.body);

    // Call service
    const result = await login(validatedData);

    // Return response với format chuẩn
    const formattedResponse = formatSuccessResponse(
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        tenants: result.tenants ?? [],
        wallet: result.wallet ? {
          vndBalance: result.wallet.vndBalance,
          creditBalance: result.wallet.creditBalance,
        } : {
          vndBalance: 0,
          creditBalance: 0,
        },
      },
      200,
      'Đăng nhập thành công'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    // Log error với full context
    logger.error('Login error:', {
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: request.body,
    });

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

    // Handle invalid credentials
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return reply.status(401).send(
        formatErrorResponse(
          'AUTH_ERROR',
          'Thông tin tài khoản mật khẩu không đúng',
          401
        )
      );
    }

    // Handle other errors
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    );
  }
}

/**
 * Refresh access token
 */
export async function refreshTokenHandler(
  request: FastifyRequest<{ Body: { refreshToken: string } }>,
  reply: FastifyReply
) {
  try {
    // Validate input
    const validatedData = refreshTokenSchema.parse(request.body);

    // Call service
    const result = await refreshAccessToken(validatedData.refreshToken);

    // Return response với format chuẩn
    const formattedResponse = formatSuccessResponse(
      result,
      200,
      'Access token refreshed successfully'
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

    logger.error('Refresh token error:', error);
    return reply.status(401).send(
      formatErrorResponse(
        'AUTH_ERROR',
        error instanceof Error ? error.message : 'Invalid refresh token',
        401
      )
    );
  }
}

/**
 * Logout user
 */
export async function logoutHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authRequest = request as AuthenticatedRequest;
    const userId = authRequest.user.userId;

    // Call service
    await logout(userId);

    // Return response với format chuẩn
    const formattedResponse = formatSuccessResponse(
      null,
      200,
      'Logged out successfully'
    );
    return reply.status(200).send(formattedResponse);
  } catch (error) {
    logger.error('Logout error:', error);
    return reply.status(500).send(
      formatErrorResponse(
        'INTERNAL_ERROR',
        'Internal server error',
        500
      )
    );
  }
}

