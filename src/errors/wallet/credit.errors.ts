/**
 * Credit Error Classes
 * 
 * WHY: Specific error types for credit operations
 * - Better error handling
 * - Clear error messages
 * - Type-safe error catching
 */

export class InsufficientCreditsError extends Error {
  constructor(
    public tenantId: string,
    public required: number,
    public available: number,
    message?: string
  ) {
    super(
      message ||
        `Insufficient credits. Required: ${required}, Available: ${available}`
    );
    this.name = 'InsufficientCreditsError';
  }
}

export class CreditOperationError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'CreditOperationError';
    if (cause) {
      this.stack = cause.stack;
    }
  }
}

export class CreditWalletNotFoundError extends Error {
  constructor(public tenantId: string) {
    super(`Credit wallet not found for tenant: ${tenantId}`);
    this.name = 'CreditWalletNotFoundError';
  }
}

