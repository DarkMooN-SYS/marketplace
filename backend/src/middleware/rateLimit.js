import rateLimit from 'express-rate-limit';

// Development mode check
const isDevelopment = process.env.NODE_ENV === 'development';

// SECURITY: Authentication rate limiter (login, register, password reset)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 8, // Development: 100 requests, Production: 8 requests per 15 minutes
  message: { 
    error: 'too_many_auth_attempts',
    message: 'Хэт олон оролдлого хийсэн байна. 15 минутын дараа дахин оролдоно уу.' 
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false, // Count failed requests too
  // SECURITY: Handler for rate limit exceeded
  handler: (req, res) => {
    console.warn('🚫 Rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
      mode: isDevelopment ? 'development' : 'production'
    });
    res.status(429).json({
      error: 'too_many_requests',
      message: 'Хэт олон оролдлого хийсэн байна. Түр хүлээнэ үү.'
    });
  }
});

// SECURITY: General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 500 : 100, // Development: 500, Production: 100 requests per minute
  message: { 
    error: 'too_many_requests',
    message: 'Хэт олон хүсэлт илгээж байна. Түр хүлээнэ үү.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// SECURITY: Strict rate limiter for sensitive operations (wallet, payments)
export const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDevelopment ? 50 : 10, // Development: 50, Production: 10 requests per 5 minutes
  message: { 
    error: 'rate_limit_exceeded',
    message: 'Хэт олон гүйлгээ хийх оролдлого хийлээ. 5 минутын дараа дахин оролдоно уу.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.error('🚨 Strict rate limit exceeded:', {
      userId: req.user?.uid,
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString(),
      mode: isDevelopment ? 'development' : 'production'
    });
    res.status(429).json({
      error: 'too_many_transactions',
      message: 'Хэт олон гүйлгээ хийх оролдлого хийлээ. Түр хүлээнэ үү.'
    });
  }
});

// SECURITY: Admin operations rate limiter
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Higher limit for admin operations
  message: { 
    error: 'admin_rate_limit',
    message: 'Админ хүсэлт хэт олон байна' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Skip successful admin operations
});
