/**
 * Response Format Utility
 * 
 * WHY: Đảm bảo format response nhất quán cho tất cả API endpoints
 * - Analytics endpoints cần format chuẩn với data, summary, api_version, provider
 * - Tuân theo API Design & Documentation rules
 */

/**
 * Standard API response format
 * WHY: Tuân theo API Design & Documentation rules - consistent response format
 */
export interface StandardApiResponse<T = unknown> {
  data?: T;
  summary?: Record<string, unknown>;
  status: number;
  message: string;
  api_version: string;
  provider: string;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Format analytics response với chuẩn format
 * WHY: Analytics endpoints cần format nhất quán với status và message
 */
export function formatAnalyticsResponse<T>(
  data: T,
  summary?: Record<string, unknown>,
  status: number = 200,
  message: string = 'Success',
  additionalFields?: Record<string, unknown>
): StandardApiResponse<T> {
  const response: StandardApiResponse<T> = {
    data,
    status,
    message,
    api_version: 'v1',
    provider: 'cdudu',
  };

  if (summary) {
    response.summary = summary;
  }

  if (additionalFields) {
    Object.assign(response, additionalFields);
  }

  return response;
}

/**
 * Format success response
 * WHY: Standard success response format với status và message
 */
export function formatSuccessResponse<T>(
  data: T,
  status: number = 200,
  message: string = 'Success',
  meta?: Record<string, unknown>
): StandardApiResponse<T> {
  const response: StandardApiResponse<T> = {
    data,
    status,
    message,
    api_version: 'v1',
    provider: 'cdudu',
  };

  if (meta) {
    Object.assign(response, { meta });
  }

  return response;
}

/**
 * Format error response
 * WHY: Standard error response format (tuân theo Error Handling rules)
 * Format: { status, message, error: { code, details }, api_version, provider }
 */
export function formatErrorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: unknown,
  requestId?: string
): {
  status: number;
  message: string;
  error: {
    code: string;
    details?: unknown;
    requestId?: string;
  };
  api_version: string;
  provider: string;
} {
  const error: {
    code: string;
    details?: unknown;
    requestId?: string;
  } = {
    code,
  };

  if (details !== undefined) {
    error.details = details;
  }

  if (requestId !== undefined) {
    error.requestId = requestId;
  }

  return {
    status,
    message,
    error,
    api_version: 'v1',
    provider: 'cdudu',
  };
}

