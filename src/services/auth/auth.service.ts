/**
 * Authentication service
 * 
 * WHY: Business logic tách khỏi controllers
 * - Password hashing với bcrypt
 * - JWT token generation
 * - Refresh token management
 * - Reusable across controllers
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../infrastructure/database';
import { config } from '../../infrastructure/config';
import { logger } from '../../infrastructure/logger';
import { redis } from '../../infrastructure/redis';
import { vndWalletService } from '../wallet/vnd-wallet.service';
import { creditService } from '../wallet/credit.service';
import type { LoginRequest, RegisterRequest, AuthResponse, JWTPayload } from '../../types/auth';

// Constants
const SALT_ROUNDS = 10;
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Hash password với bcrypt
 * WHY: Bcrypt là industry standard, có salt tự động
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate access token (JWT)
 * WHY: Short-lived token (15m) cho security
 */
function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

/**
 * Generate refresh token (JWT)
 * WHY: Long-lived token (7d) để renew access token
 */
function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

/**
 * Register new user
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Create user với role admin (default)
  // NOTE: Chỉ sp-admin mới có thể tạo admin accounts qua admin API
  // Register endpoint này tạo admin accounts (có thể restrict sau)
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      // systemRole defaults to "admin" in schema
    },
  });

  logger.info('User registered', { userId: user.id, email: user.email });

  // Generate tokens với role
  const jwtPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: (user as any).systemRole || 'admin', // systemRole exists in DB, TypeScript types may lag
  };

  const accessToken = generateAccessToken(jwtPayload);
  const refreshToken = generateRefreshToken(jwtPayload);

  // Store refresh token in Redis (với expiry)
  await redis.setex(
    `refresh_token:${user.id}`,
    REFRESH_TOKEN_EXPIRY,
    refreshToken
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user as any).systemRole || 'admin', // systemRole exists in DB, TypeScript types may lag
    },
  };
}

/**
 * Login user
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    logger.warn('Login attempt: User not found', {
      email: data.email,
      passwordLength: data.password?.length || 0,
      // Security: Không log password, chỉ log length để debug
    });
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isValid = await verifyPassword(data.password, user.password);
  if (!isValid) {
    logger.warn('Login attempt: Invalid password', {
      email: data.email,
      userId: user.id,
      passwordLength: data.password?.length || 0,
      // Security: Không log password thực
    });
    throw new Error('Invalid credentials');
  }

  logger.info('User logged in', { userId: user.id, email: user.email });

   // Fetch tenants that user belongs to
  const tenantUsers = await prisma.tenantUser.findMany({
    where: { userId: user.id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  // Generate tokens với role
  const jwtPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: (user as any).systemRole || 'admin', // systemRole exists in DB, TypeScript types may lag
  };

  const accessToken = generateAccessToken(jwtPayload);
  const refreshToken = generateRefreshToken(jwtPayload);

  // Store refresh token in Redis
  await redis.setex(
    `refresh_token:${user.id}`,
    REFRESH_TOKEN_EXPIRY,
    refreshToken
  );

  // Get wallet balances for the first tenant (or primary tenant)
  // If user has multiple tenants, use the first one (usually owner tenant)
  const primaryTenant = tenantUsers.find((tu) => tu.role === 'owner') || tenantUsers[0];
  
  let vndBalance = 0;
  let creditBalance = 0;
  
  if (primaryTenant) {
    try {
      vndBalance = await vndWalletService.getBalance(primaryTenant.tenant.id);
    } catch (error) {
      logger.warn('Failed to get VND balance', {
        tenantId: primaryTenant.tenant.id,
        error: error instanceof Error ? error.message : error,
      });
      // Continue with 0 balance if wallet doesn't exist yet
      vndBalance = 0;
    }
    
    try {
      creditBalance = await creditService.getBalance(primaryTenant.tenant.id);
    } catch (error) {
      logger.warn('Failed to get credit balance', {
        tenantId: primaryTenant.tenant.id,
        error: error instanceof Error ? error.message : error,
      });
      // Continue with 0 balance if wallet doesn't exist yet
      creditBalance = 0;
    }
  }

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user as any).systemRole || 'admin', // systemRole exists in DB, TypeScript types may lag
    },
    tenants: tenantUsers.map((tu) => ({
      id: tu.tenant.id,
      name: tu.tenant.name,
      slug: tu.tenant.slug,
      role: tu.role,
    })),
    wallet: {
      vndBalance,
      creditBalance,
    },
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JWTPayload;

    // Check if token exists in Redis
    const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const jwtPayload: JWTPayload = {
      userId: decoded.userId,
      email: decoded.email,
      tenantId: decoded.tenantId,
      role: decoded.role,
    };

    const accessToken = generateAccessToken(jwtPayload);

    return { accessToken };
  } catch (error) {
    logger.error('Refresh token error:', error);
    throw new Error('Invalid refresh token');
  }
}

/**
 * Logout user (invalidate refresh token)
 */
export async function logout(userId: string): Promise<void> {
  await redis.del(`refresh_token:${userId}`);
  logger.info('User logged out', { userId });
}

