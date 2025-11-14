/**
 * Security Headers Middleware
 * Protects against common web vulnerabilities
 */

export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking attacks (only works via HTTP headers, not <meta>)
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent information leakage
  res.removeHeader('X-Powered-By');
  
  // Content Security Policy - IMPROVED: removed unsafe-inline/unsafe-eval where possible
  // Note: If you need inline scripts, use nonce-based CSP in production
  const isDev = process.env.NODE_ENV !== 'production';
  
  // Development: Allow localhost connections for API testing
  const connectSrc = isDev 
    ? `'self' http://localhost:* ws://localhost:* wss://localhost:* https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com`
    : `'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com`;
  
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; ` +
    `script-src 'self'${isDev ? " 'unsafe-inline' 'unsafe-eval'" : ''}; ` +
    `style-src 'self' 'unsafe-inline'; ` +
    `img-src 'self' data: https: blob:; ` +
    `font-src 'self' data:; ` +
    `connect-src ${connectSrc}; ` +
    `frame-ancestors 'none'; ` +
    `object-src 'none'; ` +
    `base-uri 'self'; ` +
    `form-action 'self';` +
    (isDev ? '' : ' upgrade-insecure-requests;') // Only in production
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  
  next();
};

/**
 * Strict Transport Security (HTTPS only)
 * Enable this only in production with HTTPS
 */
export const hstsHeader = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
};
