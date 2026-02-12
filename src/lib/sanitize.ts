/**
 * XSS Protection and Input Sanitization Utilities
 * 
 * Uses isomorphic-dompurify for robust HTML sanitization.
 */
import DOMPurify from 'isomorphic-dompurify';

/**
 * HTML entity encoding to prevent XSS
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
 * Uses DOMPurify to strip all HTML/script injection, then limits length
 */
export function sanitizeText(input: string, maxLength: number = 2000): string {
  if (typeof input !== 'string') return '';
  
  // DOMPurify with no allowed tags — strips everything to plain text
  const sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  
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
    "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.ergoplatform.com https://node.ergo.watch https://corsproxy.io https://cloudflareinsights.com https://www.google-analytics.com https://api.coingecko.com https://api.spectrum.fi",
    // frame-ancestors only works via HTTP header, not meta tag — set via Cloudflare headers instead
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}

/**
 * Enhanced input length validation with strict limits
 */
export const INPUT_LIMITS = {
  NAME: 100,
  TITLE: 200,
  DESCRIPTION: 2000,
  TASK_DESCRIPTION: 5000,
  MESSAGE: 1000,
  SKILL: 50,
  SKILLS_COUNT: 20,
  EMAIL: 255,
  URL: 500
} as const;

/**
 * Honeypot field detector - checks for bot-filled hidden fields
 */
export function detectHoneypotFields(formData: Record<string, unknown>): boolean {
  const honeypotFields = [
    'website', 'url', 'homepage', 'phone', 'telephone', 'mobile',
    'company', 'organization', 'business', '_token', '_honey',
    'bot_check', 'spam_check', 'hidden_field', 'do_not_fill'
  ];
  
  return honeypotFields.some(field => {
    const value = formData[field];
    return value && typeof value === 'string' && value.trim().length > 0;
  });
}

/**
 * Advanced spam pattern detection
 */
const ADVANCED_SPAM_PATTERNS = [
  /bitcoin.*double/i,
  /crypto.*investment.*guaranteed/i,
  /get.*rich.*quick/i,
  /make.*money.*fast/i,
  /binary.*options/i,
  /(.)\1{10,}/, // Repeated characters
  /[!?]{5,}/, // Excessive punctuation
] as const;

export function detectAdvancedSpam(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return ADVANCED_SPAM_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Form field validation with honeypot and spam detection
 */
export function validateFormSubmission(formData: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
  isSpam: boolean;
} {
  const errors: string[] = [];
  let isSpam = false;
  
  // Check honeypot fields
  if (detectHoneypotFields(formData)) {
    isSpam = true;
    errors.push('Automated submission detected');
  }
  
  // Check for spam in text fields
  const textFields = ['name', 'title', 'description', 'message', 'content'];
  for (const field of textFields) {
    const value = formData[field];
    if (value && typeof value === 'string') {
      if (detectAdvancedSpam(value)) {
        isSpam = true;
        errors.push(`Spam detected in ${field} field`);
      }
    }
  }
  
  // Check submission timing (too fast = bot)
  const submissionTime = formData._submissionTime;
  const pageLoadTime = formData._pageLoadTime;
  if (typeof submissionTime === 'number' && typeof pageLoadTime === 'number') {
    const fillTime = submissionTime - pageLoadTime;
    if (fillTime < 3000) { // Less than 3 seconds to fill form
      isSpam = true;
      errors.push('Form submitted too quickly');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    isSpam
  };
}