/**
 * 🔒 COMPREHENSIVE SECURITY MIDDLEWARE
 * Protects against various attacks: XSS, Injection, DDoS, etc.
 */

import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';

// ============================================================================
// 1. INPUT SANITIZATION & VALIDATION
// ============================================================================

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags and script content
  const sanitized = xss(input, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
  
  return sanitized.trim();
}

/**
 * Recursively sanitize object properties
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key]);
    } else if (typeof obj[key] === 'object') {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}

/**
 * Middleware: Sanitize request body, query, params
 */
export const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

// ============================================================================
// 2. REQUEST SIZE LIMITS (Anti-DDoS)
// ============================================================================

/**
 * Validate request body size
 */
export const validateRequestSize = (maxSizeKB = 100) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxBytes = maxSizeKB * 1024;
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'payload_too_large',
        message: `Request body exceeds ${maxSizeKB}KB limit`,
        maxSize: `${maxSizeKB}KB`
      });
    }
    
    next();
  };
};

/**
 * Validate array/object field limits
 */
export const validateArraySize = (maxItems = 100) => {
  return (req, res, next) => {
    const checkArraySize = (obj, path = '') => {
      for (const key in obj) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (Array.isArray(obj[key])) {
          if (obj[key].length > maxItems) {
            return {
              valid: false,
              field: fullPath,
              size: obj[key].length
            };
          }
          // Check nested arrays
          const result = checkArraySize(obj[key], fullPath);
          if (!result.valid) return result;
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          const result = checkArraySize(obj[key], fullPath);
          if (!result.valid) return result;
        }
      }
      return { valid: true };
    };
    
    if (req.body) {
      const result = checkArraySize(req.body);
      if (!result.valid) {
        return res.status(400).json({
          error: 'array_too_large',
          message: `Field "${result.field}" exceeds ${maxItems} items limit`,
          field: result.field,
          size: result.size,
          maxSize: maxItems
        });
      }
    }
    
    next();
  };
};

// ============================================================================
// 3. ENHANCED RATE LIMITING (Anti-DDoS & Brute-Force)
// ============================================================================

/**
 * Global rate limiter - applies to all routes
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per IP per 15 min
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Too many requests, please slow down',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Strict rate limiter - for sensitive endpoints (auth, payment, wallet)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP per 15 min
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many attempts, please try again later'
  },
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Too many attempts from this IP',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Survey submission rate limiter - prevent duplicate rewards
 */
export const surveySubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 survey submissions per hour per IP
  message: {
    error: 'survey_rate_limit',
    message: 'Too many survey submissions, please try again later'
  },
  skipSuccessfulRequests: true, // Only count failed attempts
  handler: (req, res) => {
    res.status(429).json({
      error: 'survey_rate_limit',
      message: 'You have submitted too many surveys. Please wait before submitting more.',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

/**
 * Per-user rate limiter (requires authentication)
 */
export const createUserRateLimiter = (maxRequests = 100, windowMinutes = 15) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise fall back to IP
      return req.user?.uid || req.ip;
    },
    message: {
      error: 'user_rate_limit',
      message: 'Too many requests from your account'
    }
  });
};

// ============================================================================
// 4. DUPLICATE SUBMISSION PREVENTION
// ============================================================================

/**
 * Prevent duplicate survey submissions
 * Tracks user+survey combinations in memory (use Redis in production)
 */
const submissionCache = new Map();

export const preventDuplicateSubmission = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    const surveyId = req.params.id;
    
    if (!userId || !surveyId) {
      return next();
    }
    
    const cacheKey = `${userId}:${surveyId}`;
    
    // Check if already submitted recently (1 hour cooldown)
    const lastSubmission = submissionCache.get(cacheKey);
    if (lastSubmission && (Date.now() - lastSubmission) < 3600000) {
      return res.status(429).json({
        error: 'duplicate_submission',
        message: 'You have already submitted this survey recently',
        cooldownRemaining: Math.ceil((3600000 - (Date.now() - lastSubmission)) / 1000) + 's'
      });
    }
    
    // Mark as submitted
    submissionCache.set(cacheKey, Date.now());
    
    // Cleanup old entries (every 1000 submissions)
    if (submissionCache.size > 1000) {
      const now = Date.now();
      for (const [key, timestamp] of submissionCache.entries()) {
        if (now - timestamp > 3600000) {
          submissionCache.delete(key);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Duplicate submission check error:', error);
    next(); // Fail open - don't block legitimate requests
  }
};

// ============================================================================
// 5. PAYMENT VERIFICATION HELPERS
// ============================================================================

/**
 * Verify payment webhook signature
 */
export function verifyPaymentSignature(payload, signature, secret) {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount, min = 1000, max = 10000000) {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { valid: false, error: 'Invalid amount format' };
  }
  
  if (numAmount < min) {
    return { valid: false, error: `Minimum amount is ${min}₮` };
  }
  
  if (numAmount > max) {
    return { valid: false, error: `Maximum amount is ${max}₮` };
  }
  
  return { valid: true, amount: numAmount };
}

// ============================================================================
// 6. AUTHORIZATION HELPERS
// ============================================================================

/**
 * Check if user is admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Admin access required'
    });
  }
  next();
};

/**
 * Check if user owns the resource
 */
export const requireOwnership = (userIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      const resourceUserId = req.body[userIdField] || req.params[userIdField];
      const currentUserId = req.user?.uid;
      
      // Admin can access any resource
      if (req.user?.role === 'admin') {
        return next();
      }
      
      // Check ownership
      if (resourceUserId !== currentUserId) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'You can only access your own resources'
        });
      }
      
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

// ============================================================================
// 7. CLEANUP FUNCTIONS
// ============================================================================

/**
 * Periodic cleanup of submission cache
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of submissionCache.entries()) {
    if (now - timestamp > 3600000) {
      submissionCache.delete(key);
    }
  }
}, 300000); // Every 5 minutes

export default {
  sanitizeRequest,
  validateRequestSize,
  validateArraySize,
  globalRateLimiter,
  strictRateLimiter,
  surveySubmissionLimiter,
  createUserRateLimiter,
  preventDuplicateSubmission,
  verifyPaymentSignature,
  validatePaymentAmount,
  requireAdmin,
  requireOwnership
};
