/**
 * Authentication types
 * 
 * WHY: Type-safe authentication
 * - JWT payload structure
 * - Request extensions
 * - Response types
 */

import { FastifyRequest } from 'fastify';

// JWT Payload structure
export interface JWTPayload {
  userId: string;
  email: string;
  tenantId?: string; // Optional: có thể có nhiều tenants
  role?: string;
  iat?: number;
  exp?: number;
}

// Extended FastifyRequest với user info
export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload;
}

// Login request body
export interface LoginRequest {
  email: string;
  password: string;
}

// Register request body
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

// Auth response
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role?: string;
  };
  tenants?: {
    id: string;
    name: string;
    slug: string;
    role: string;
  }[];
  wallet?: {
    vndBalance: number;
    creditBalance: number;
  };
}

