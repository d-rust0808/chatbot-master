/**
 * Response Processor Service
 * 
 * WHY: Post-process AI responses
 * - Formatting
 * - Markdown support
 * - Entity extraction
 * - Response validation
 * - Quality checks
 */

// Response processor - no logger needed for now

/**
 * Response processing options
 */
export interface ResponseProcessingOptions {
  formatMarkdown?: boolean;
  extractEntities?: boolean;
  validateResponse?: boolean;
  maxLength?: number;
}

/**
 * Processed response
 */
export interface ProcessedResponse {
  content: string;
  entities?: Record<string, string>;
  isValid: boolean;
  warnings?: string[];
}

/**
 * Response Processor Service
 * WHY: Centralized response processing
 */
export class ResponseProcessorService {
  /**
   * Process AI response
   */
  async processResponse(
    rawResponse: string,
    options: ResponseProcessingOptions = {}
  ): Promise<ProcessedResponse> {
    let content = rawResponse;
    const warnings: string[] = [];

    // 1. Basic cleaning
    content = this.cleanResponse(content);

    // 2. Format markdown (nếu cần)
    if (options.formatMarkdown) {
      content = this.formatMarkdown(content);
    }

    // 3. Validate response
    let isValid = true;
    if (options.validateResponse) {
      const validation = this.validateResponse(content, options.maxLength);
      isValid = validation.isValid;
      if (validation.warnings) {
        warnings.push(...validation.warnings);
      }
    }

    // 4. Extract entities (nếu cần)
    let entities: Record<string, string> | undefined;
    if (options.extractEntities) {
      entities = this.extractEntitiesFromResponse(content);
    }

    return {
      content,
      entities,
      isValid,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Clean response
   * WHY: Remove unwanted characters, normalize
   */
  private cleanResponse(response: string): string {
    return response
      .trim()
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/\s{2,}/g, ' '); // Max 1 space
  }

  /**
   * Format markdown
   * WHY: Ensure proper markdown formatting
   */
  private formatMarkdown(content: string): string {
    // Basic markdown formatting
    // - Ensure proper line breaks
    // - Format lists
    // - Format bold/italic

    // Format lists (ensure proper spacing)
    content = content.replace(/(\n)([-*])\s+/g, '\n$2 ');

    // Format numbered lists
    content = content.replace(/(\n)(\d+)\.\s+/g, '\n$2. ');

    return content;
  }

  /**
   * Validate response
   * WHY: Check response quality
   */
  private validateResponse(
    response: string,
    maxLength?: number
  ): { isValid: boolean; warnings?: string[] } {
    const warnings: string[] = [];

    // Check length
    if (maxLength && response.length > maxLength) {
      warnings.push(`Response too long (${response.length} > ${maxLength} chars)`);
    }

    // Check for empty response
    if (response.trim().length === 0) {
      return { isValid: false, warnings: ['Response is empty'] };
    }

    // Check for error patterns
    const errorPatterns = [
      /sorry.*error/i,
      /cannot.*process/i,
      /internal.*error/i,
    ];

    for (const pattern of errorPatterns) {
      if (pattern.test(response)) {
        warnings.push('Response may contain error message');
        break;
      }
    }

    // Check for incomplete response
    if (response.endsWith('...') || response.endsWith('…')) {
      warnings.push('Response may be incomplete');
    }

    return {
      isValid: warnings.length === 0,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Extract entities từ response
   * WHY: Extract important info từ AI response
   */
  private extractEntitiesFromResponse(response: string): Record<string, string> {
    const entities: Record<string, string> = {};

    // Extract phone numbers (Vietnamese format)
    const phoneRegex = /(\+84|0)[3-9]\d{8,9}/g;
    const phones = response.match(phoneRegex);
    if (phones && phones.length > 0) {
      entities.phone = phones[0];
    }

    // Extract email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = response.match(emailRegex);
    if (emails && emails.length > 0) {
      entities.email = emails[0];
    }

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = response.match(urlRegex);
    if (urls && urls.length > 0) {
      entities.url = urls[0];
    }

    return entities;
  }

  /**
   * Format response cho platform
   * WHY: Platform-specific formatting
   */
  formatForPlatform(
    content: string,
    platform: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'zalo'
  ): string {
    // WhatsApp supports markdown
    if (platform === 'whatsapp') {
      return content;
    }

    // Facebook/Instagram: Convert markdown to plain text
    if (platform === 'facebook' || platform === 'instagram') {
      return this.markdownToPlainText(content);
    }

    // Default: return as is
    return content;
  }

  /**
   * Convert markdown to plain text
   */
  private markdownToPlainText(markdown: string): string {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/`(.*?)`/g, '$1') // Code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
      .replace(/^#{1,6}\s+(.*)$/gm, '$1') // Headers
      .replace(/^[-*]\s+(.*)$/gm, '• $1') // Lists
      .replace(/^\d+\.\s+(.*)$/gm, '$1. $1'); // Numbered lists
  }
}

// Export singleton instance
export const responseProcessor = new ResponseProcessorService();

