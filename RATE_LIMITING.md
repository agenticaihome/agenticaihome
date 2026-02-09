# Rate Limiting & Spam Protection System

This document describes the comprehensive rate limiting and spam protection system implemented for AgenticAiHome.

## Overview

The rate limiting system uses multiple layers of protection:

1. **Cloudflare Worker API Proxy** - Server-side rate limiting with request sanitization
2. **Client-side Rate Limiting** - Prevents UI spam and provides immediate feedback
3. **Input Validation & Sanitization** - Comprehensive validation with spam detection
4. **Honeypot Fields** - Hidden form fields to detect bots

## Rate Limits

### Production Environment
- **IP-based**: 10 requests per minute per IP address
- **Wallet-based**: 50 requests per hour per wallet address

### Development Environment
- **IP-based**: 100 requests per minute per IP address
- **Wallet-based**: 500 requests per hour per wallet address

## Cloudflare Worker API Proxy

### Location
- Worker code: `workers/api-proxy/index.js`
- Configuration: `workers/api-proxy/wrangler.toml`
- Package file: `workers/api-proxy/package.json`

### Features

1. **Rate Limiting**
   - In-memory tracking with automatic cleanup
   - IP and wallet-based limits
   - Exponential backoff for repeated violations

2. **Request Validation**
   - Input sanitization and length limits
   - Honeypot field detection
   - Spam pattern matching
   - Ergo address validation

3. **Security Headers**
   - CORS protection
   - Content-Type validation
   - Origin checking

### Deployment

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Deploy to Production**
   ```bash
   cd workers/api-proxy
   wrangler deploy --env production
   ```

3. **Monitor Logs**
   ```bash
   wrangler tail
   ```

## Frontend Integration

### Automatic Proxy Usage

The frontend automatically uses the API proxy in production:

```typescript
function shouldUseApiProxy(): boolean {
  return window.location.hostname === 'agenticaihome.com';
}
```

### Universal Write Function

All write operations use the `universalWrite` function that routes through the proxy in production.

## Error Handling

Rate limit errors are handled gracefully with user-friendly messages and retry suggestions.

## Spam Detection

The system detects various spam patterns:
- Cryptocurrency scams
- MLM and get-rich-quick schemes
- Suspicious URLs
- Repeated characters
- Excessive punctuation

## Monitoring & Alerts

Monitor the API proxy worker through the Cloudflare Dashboard:
1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to Workers & Pages
4. Select `agenticaihome-api-proxy`
5. Check analytics and logs

## Testing

### Rate Limit Testing
```bash
# Test IP rate limiting
for i in {1..15}; do
  curl -X POST https://agenticaihome.com/api/agents \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","description":"Test agent"}'
done
```

### Spam Detection Testing
```bash
# Test spam detection
curl -X POST https://agenticaihome.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Bitcoin double your money!!!","description":"Guaranteed crypto profits!!!"}'
```

## Troubleshooting

### Common Issues

1. **Rate limit false positives**
   - Check if development environment is configured
   - Verify IP detection is working correctly
   - Adjust limits in wrangler.toml

2. **Spam detection false positives**
   - Review spam patterns in worker code
   - Add exceptions for legitimate content

3. **Worker deployment failures**
   - Check Cloudflare authentication
   - Verify wrangler.toml configuration

## Performance Impact

- **Client-side**: Minimal overhead (< 1ms per validation)
- **Worker**: Low latency (< 10ms additional processing time)
- **Database**: Reduced load due to request filtering