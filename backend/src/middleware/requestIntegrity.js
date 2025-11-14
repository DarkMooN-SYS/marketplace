/**
 * Request Integrity Middleware
 * Validates request data integrity and prevents tampering
 */

import sanitizeHtml from 'sanitize-html';

/**
 * Validate amount fields in payment/wallet requests
 * Prevents negative amounts, NaN, and extremely large values
 */
export const validateAmount = (req, res, next) => {
  const { amount } = req.body;
  
  if (amount === undefined || amount === null) {
    return next();
  }
  
  const numAmount = Number(amount);
  
  // Check for invalid numbers
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return res.status(400).json({ 
      error: 'Invalid amount',
      message: 'Дүн буруу байна' 
    });
  }
  
  // Check for negative amounts
  if (numAmount < 0) {
    return res.status(400).json({ 
      error: 'Negative amount not allowed',
      message: 'Сөрөг дүн оруулах боломжгүй' 
    });
  }
  
  // Check for unreasonably large amounts (over 100 million)
  if (numAmount > 100000000) {
    return res.status(400).json({ 
      error: 'Amount too large',
      message: 'Дүн хэтэрхий их байна' 
    });
  }
  
  // Round to 2 decimal places to prevent precision attacks
  req.body.amount = Math.round(numAmount * 100) / 100;
  
  next();
};

/**
 * Validate user ownership for wallet operations
 */
export const validateWalletOwnership = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { userId } = req.body;
  
  // If userId is provided, it must match the authenticated user
  // Only admins can access other users' wallets
  if (userId && userId !== req.user.uid && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Та зөвхөн өөрийн хэтэвчийг ашиглах боломжтой' 
    });
  }
  
  next();
};

/**
 * Sanitize string inputs to prevent XSS - IMPROVED with sanitize-html library
 */
export const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Use robust HTML sanitization library
    return sanitizeHtml(str, {
      allowedTags: [], // No HTML tags allowed by default
      allowedAttributes: {},
      allowedSchemes: ['http', 'https', 'mailto'],
      allowProtocolRelative: false,
      // Remove all disallowed tags and attributes
      disallowedTagsMode: 'escape',
    });
  };
  
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    
    return sanitized;
  };
  
  try {
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
  } catch (error) {
    console.error('Sanitization error:', error);
    // Fail-safe: continue but log the error
  }
  
  next();
};

/**
 * Validate transaction integrity
 * Ensures transaction data hasn't been tampered with
 */
export const validateTransaction = (req, res, next) => {
  const { amount, type, description } = req.body;
  
  // Amount must be positive
  if (amount && amount <= 0) {
    return res.status(400).json({ 
      error: 'Invalid transaction amount',
      message: 'Гүйлгээний дүн буруу байна' 
    });
  }
  
  // Type must be valid
  const validTypes = ['deposit', 'withdrawal', 'purchase', 'refund', 'bonus', 'survey_reward'];
  if (type && !validTypes.includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid transaction type',
      message: 'Гүйлгээний төрөл буруу байна' 
    });
  }
  
  // Description must not be too long
  if (description && description.length > 500) {
    return res.status(400).json({ 
      error: 'Description too long',
      message: 'Тайлбар хэт урт байна' 
    });
  }
  
  next();
};

/**
 * Prevent double submission
 * Detects and blocks duplicate requests within a short time window
 */
const submissionCache = new Map();
const SUBMISSION_WINDOW = 5000; // 5 seconds

export const preventDoubleSubmission = (req, res, next) => {
  if (!req.user) {
    return next();
  }
  
  // Create a unique key based on user and request data
  const key = `${req.user.uid}:${req.method}:${req.path}:${JSON.stringify(req.body)}`;
  const now = Date.now();
  
  const lastSubmission = submissionCache.get(key);
  
  if (lastSubmission && (now - lastSubmission) < SUBMISSION_WINDOW) {
    return res.status(429).json({ 
      error: 'Duplicate submission',
      message: 'Хэт хурдан хүсэлт илгээж байна. Түр хүлээнэ үү.' 
    });
  }
  
  submissionCache.set(key, now);
  
  // Clean up old entries every minute
  if (submissionCache.size > 10000) {
    for (const [k, time] of submissionCache.entries()) {
      if (now - time > SUBMISSION_WINDOW) {
        submissionCache.delete(k);
      }
    }
  }
  
  next();
};
