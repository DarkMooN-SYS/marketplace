/**
 * Input validation middleware for auth routes
 * Simple validation without external dependencies
 */

// Phone validation (8 digits)
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }
  if (!/^\d{8}$/.test(phone.trim())) {
    return { valid: false, error: 'Phone must be 8 digits' };
  }
  return { valid: true };
}

// Email validation
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
}

// Password validation (minimum 8 characters, at least one letter and one number)
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter (a-z or A-Z)' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number (0-9)' };
  }
  return { valid: true };
}

// Name validation
export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }
  if (name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  if (name.trim().length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' };
  }
  return { valid: true };
}

// Verification code validation (6 digits)
export function validateVerificationCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Verification code is required' };
  }
  if (!/^\d{6}$/.test(code.trim())) {
    return { valid: false, error: 'Verification code must be 6 digits' };
  }
  return { valid: true };
}

/**
 * Middleware to validate registration input
 */
export function validateRegistration(req, res, next) {
  const { phone, password, name } = req.body;

  console.log(`📋 [Validation] Registration attempt - Phone: ${phone?.slice(0, 4)}****, Password length: ${password?.length || 0}, Name: ${name || 'N/A'}`);

  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    console.log(`❌ [Validation] Phone validation failed: ${phoneValidation.error}`);
    return res.status(400).json({ 
      error: 'validation_failed', 
      message: phoneValidation.error 
    });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    console.log(`❌ [Validation] Password validation failed: ${passwordValidation.error}`);
    return res.status(400).json({ 
      error: 'validation_failed', 
      message: passwordValidation.error 
    });
  }

  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    console.log(`❌ [Validation] Name validation failed: ${nameValidation.error}`);
    return res.status(400).json({ 
      error: 'validation_failed', 
      message: nameValidation.error 
    });
  }

  console.log(`✅ [Validation] Registration validation passed`);
  next();
}

/**
 * Middleware to validate login input
 */
export function validateLogin(req, res, next) {
  const { phone, password } = req.body;

  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    return res.status(400).json({ 
      error: 'validation_failed', 
      message: phoneValidation.error 
    });
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ 
      error: 'validation_failed', 
      message: 'Password is required' 
    });
  }

  next();
}

/**
 * Middleware to validate phone verification input
 */
export function validatePhoneVerification(req, res, next) {
  const { phone } = req.body;

  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    return res.status(400).json({ 
      error: 'validation_failed', 
      message: phoneValidation.error 
    });
  }

  next();
}

/**
 * Middleware to validate verification code
 */
export function validateCodeVerification(req, res, next) {
  const { phone, code } = req.body;

  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    return res.status(400).json({ 
      error: 'validation_failed', 
      message: phoneValidation.error 
    });
  }

  const codeValidation = validateVerificationCode(code);
  if (!codeValidation.valid) {
    return res.status(400).json({ 
      error: 'validation_failed', 
      message: codeValidation.error 
    });
  }

  next();
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove inline event handlers
}
