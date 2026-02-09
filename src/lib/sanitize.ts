/**
 * XSS Protection and Input Sanitization Utilities
 * 
 * CRITICAL: These functions prevent malicious script injection
 * but are basic implementations. Production should use DOMPurify.
 */

/**
 * Basic HTML entity encoding to prevent XSS
 * This is a minimal implementation - use DOMPurify in production
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize user input for agent/task descriptions
 * Removes potentially dangerous characters and limits length
 */
export function sanitizeText(input: string, maxLength: number = 2000): string {
  if (typeof input !== 'string') return '';
  
  // Remove potential script tags and dangerous patterns
  let sanitized = input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '');
  
  // Escape HTML entities
  sanitized = escapeHtml(sanitized);
  
  // Limit length
  return sanitized.trim().slice(0, maxLength);
}

/**
 * Sanitize skill tags - very strict validation
 */
export function sanitizeSkill(skill: string): string {
  if (typeof skill !== 'string') return '';
  
  // Allow only alphanumeric, spaces, hyphens, and basic punctuation
  return skill
    .replace(/[^a-zA-Z0-9\s\-_\.]/g, '')
    .trim()
    .slice(0, 50);
}

/**
 * Sanitize numeric inputs
 */
export function sanitizeNumber(input: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
  const num = parseFloat(input);
  if (isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

/**
 * Validate and sanitize Ergo address
 */
export function sanitizeErgoAddress(address: string): string {
  if (typeof address !== 'string') return '';
  
  // Remove whitespace and invalid characters
  const cleaned = address.trim().replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
  
  // Must start with 9 and be correct length
  if (!cleaned.startsWith('9') || cleaned.length < 51 || cleaned.length > 52) {
    return '';
  }
  
  return cleaned;
}

/**
 * Sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  const cleaned = email.trim().toLowerCase();
  
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return emailRegex.test(cleaned) ? cleaned : '';
}

/**
 * Rate limiting helper - track API calls per IP/user
 */
export class RateLimiter {
  private calls: Map<string, { count: number; resetTime: number }> = new Map();
  private maxCalls: number;
  private windowMs: number;

  constructor(maxCalls: number = 100, windowMs: number = 60000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userCalls = this.calls.get(identifier);

    if (!userCalls || now > userCalls.resetTime) {
      this.calls.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (userCalls.count >= this.maxCalls) {
      return false;
    }

    userCalls.count++;
    return true;
  }

  getRetryAfter(identifier: string): number {
    const userCalls = this.calls.get(identifier);
    if (!userCalls) return 0;
    
    return Math.max(0, userCalls.resetTime - Date.now());
  }
}

/**
 * Content Security Policy generator for production
 */
export function generateCSP(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Note: 'unsafe-inline' should be removed in production
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.ergoplatform.com https://node.ergo.watch https://corsproxy.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}