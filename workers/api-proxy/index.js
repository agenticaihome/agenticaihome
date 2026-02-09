/**
 * Cloudflare Worker: API Proxy with Rate Limiting
 * 
 * This worker sits between the AgenticAiHome frontend and Supabase,
 * providing server-side rate limiting and spam protection.
 */

const CONFIG = {
  IP_LIMIT_PER_MINUTE: 10,
  WALLET_LIMIT_PER_HOUR: 50,
  SUPABASE_URL: 'https://thjialaevqwyiyyhbdxk.supabase.co',
  SUPABASE_KEY: 'sb_publishable_d700Fgssg8ldOkwnLamEcg_g4fPKv8q',
  MAX_TEXT_LENGTH: 2000,
  SPAM_PATTERNS: [
    /casino/i,
    /crypto.*investment/i,
    /get.*rich.*quick/i,
    /viagra/i,
    /bitcoin.*mining/i,
  ]
};

class RateLimiter {
  constructor() {
    this.ipLimits = new Map();
    this.walletLimits = new Map();
  }
  
  cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.ipLimits) {
      if (now - data.windowStart > 60000) {
        this.ipLimits.delete(ip);
      }
    }
    for (const [wallet, data] of this.walletLimits) {
      if (now - data.windowStart > 3600000) {
        this.walletLimits.delete(wallet);
      }
    }
  }
  
  checkIPLimit(ip) {
    this.cleanup();
    const now = Date.now();
    const ipData = this.ipLimits.get(ip);
    
    if (!ipData) {
      this.ipLimits.set(ip, { count: 1, windowStart: now });
      return { allowed: true, retryAfter: null };
    }
    
    if (now - ipData.windowStart > 60000) {
      this.ipLimits.set(ip, { count: 1, windowStart: now });
      return { allowed: true, retryAfter: null };
    }
    
    if (ipData.count >= CONFIG.IP_LIMIT_PER_MINUTE) {
      const retryAfter = Math.ceil((60000 - (now - ipData.windowStart)) / 1000);
      return { allowed: false, retryAfter };
    }
    
    ipData.count++;
    return { allowed: true, retryAfter: null };
  }
  
  checkWalletLimit(wallet) {
    if (!wallet) return { allowed: true, retryAfter: null };
    this.cleanup();
    const now = Date.now();
    const walletData = this.walletLimits.get(wallet);
    
    if (!walletData) {
      this.walletLimits.set(wallet, { count: 1, windowStart: now });
      return { allowed: true, retryAfter: null };
    }
    
    if (now - walletData.windowStart > 3600000) {
      this.walletLimits.set(wallet, { count: 1, windowStart: now });
      return { allowed: true, retryAfter: null };
    }
    
    if (walletData.count >= CONFIG.WALLET_LIMIT_PER_HOUR) {
      const retryAfter = Math.ceil((3600000 - (now - walletData.windowStart)) / 1000);
      return { allowed: false, retryAfter };
    }
    
    walletData.count++;
    return { allowed: true, retryAfter: null };
  }
}

const rateLimiter = new RateLimiter();

function sanitizeText(input, maxLength = CONFIG.MAX_TEXT_LENGTH) {
  if (typeof input !== 'string') return '';
  let sanitized = input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  return sanitized.trim().slice(0, maxLength);
}

function extractWalletAddress(body) {
  if (body.ownerAddress) return body.ownerAddress;
  if (body.creatorAddress) return body.creatorAddress;
  if (body.ergoAddress) return body.ergoAddress;
  return null;
}

function detectSpam(text) {
  if (!text || typeof text !== 'string') return false;
  return CONFIG.SPAM_PATTERNS.some(pattern => pattern.test(text));
}

function validateRequest(body) {
  const errors = [];
  const sanitized = { ...body };
  
  // Check for honeypot fields
  if (body.website || body.phone || body.company || body._token) {
    errors.push('Bot detected');
    return { valid: false, errors, sanitized };
  }
  
  // Sanitize text fields
  if (body.name) {
    sanitized.name = sanitizeText(body.name, 100);
    if (detectSpam(sanitized.name)) {
      errors.push('Spam detected in name field');
    }
  }
  
  if (body.description) {
    sanitized.description = sanitizeText(body.description, 2000);
    if (detectSpam(sanitized.description)) {
      errors.push('Spam detected in description field');
    }
  }
  
  return { valid: errors.length === 0, errors, sanitized };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST' || !new URL(request.url).pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 });
    }
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://agenticaihome.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info',
      'Access-Control-Max-Age': '86400',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const body = await request.json();
      const walletAddress = extractWalletAddress(body);
      
      // Check rate limits
      const ipCheck = rateLimiter.checkIPLimit(clientIP);
      if (!ipCheck.allowed) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${ipCheck.retryAfter} seconds.`
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (walletAddress) {
        const walletCheck = rateLimiter.checkWalletLimit(walletAddress);
        if (!walletCheck.allowed) {
          return new Response(JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests from this wallet. Try again in ${Math.ceil(walletCheck.retryAfter / 60)} minutes.`
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Validate request
      const validation = validateRequest(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Forward to Supabase
      const url = new URL(request.url);
      const endpoint = url.pathname.replace('/api/', '');
      const supabaseUrl = `${CONFIG.SUPABASE_URL}/rest/v1/${endpoint}`;
      
      const supabaseRequest = new Request(supabaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(validation.sanitized)
      });
      
      const supabaseResponse = await fetch(supabaseRequest);
      const responseBody = await supabaseResponse.text();
      
      return new Response(responseBody, {
        status: supabaseResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: 'Something went wrong'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};