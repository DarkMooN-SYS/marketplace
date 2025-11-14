import { db } from '../config/firebase.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Increment failed login attempts for a user
 * Lock account if max attempts exceeded
 */
export async function incrementFailedLogin(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return;
    }
    
    const userData = userDoc.data();
    const failedAttempts = (userData.failedLoginAttempts || 0) + 1;
    
    const updateData = {
      failedLoginAttempts: failedAttempts,
      lastFailedLoginAt: new Date(),
    };
    
    // Lock account if max attempts exceeded
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      updateData.lockUntil = new Date(Date.now() + LOCKOUT_DURATION);
      console.warn(`🔒 Account locked for user ${userId} - ${failedAttempts} failed attempts`);
    }
    
    await userRef.update(updateData);
    
    return {
      failedAttempts,
      isLocked: failedAttempts >= MAX_FAILED_ATTEMPTS,
      lockUntil: updateData.lockUntil,
    };
  } catch (error) {
    console.error('Error incrementing failed login:', error);
    throw error;
  }
}

/**
 * Reset failed login attempts after successful login
 */
export async function resetFailedLogin(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockUntil: null,
    });
    
    console.log(`✅ Failed login counter reset for user ${userId}`);
  } catch (error) {
    console.error('Error resetting failed login:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Check if account is currently locked
 */
export async function isAccountLocked(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    const userData = userDoc.data();
    
    if (!userData.lockUntil) {
      return false;
    }
    
    const lockUntil = userData.lockUntil.toDate ? userData.lockUntil.toDate() : new Date(userData.lockUntil);
    const isLocked = lockUntil > new Date();
    
    // Auto-unlock if lock period expired
    if (!isLocked && userData.lockUntil) {
      await db.collection('users').doc(userId).update({
        lockUntil: null,
        failedLoginAttempts: 0,
      });
    }
    
    return isLocked;
  } catch (error) {
    console.error('Error checking account lock:', error);
    return false;
  }
}

/**
 * Get remaining lockout time in minutes
 */
export async function getRemainingLockoutTime(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return 0;
    }
    
    const userData = userDoc.data();
    
    if (!userData.lockUntil) {
      return 0;
    }
    
    const lockUntil = userData.lockUntil.toDate ? userData.lockUntil.toDate() : new Date(userData.lockUntil);
    const remainingMs = lockUntil.getTime() - Date.now();
    
    if (remainingMs <= 0) {
      return 0;
    }
    
    return Math.ceil(remainingMs / (60 * 1000)); // Convert to minutes
  } catch (error) {
    console.error('Error getting lockout time:', error);
    return 0;
  }
}

/**
 * Structured logging for authentication events
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SECURITY: 'SECURITY'
};

export function logAuthEvent(level, event, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    event,
    ...metadata
  };

  const prefix = level === LOG_LEVELS.SECURITY ? '🔐' : 
                 level === LOG_LEVELS.ERROR ? '❌' : 
                 level === LOG_LEVELS.WARN ? '⚠️' : 'ℹ️';

  console.log(`${prefix} [${level}] ${event}:`, JSON.stringify(metadata, null, 2));

  // TODO: Send to logging service (Sentry, Datadog, Cloud Logging)
  return logEntry;
}

export const authLogger = {
  info: (event, metadata) => logAuthEvent(LOG_LEVELS.INFO, event, metadata),
  warn: (event, metadata) => logAuthEvent(LOG_LEVELS.WARN, event, metadata),
  error: (event, metadata) => logAuthEvent(LOG_LEVELS.ERROR, event, metadata),
  security: (event, metadata) => logAuthEvent(LOG_LEVELS.SECURITY, event, metadata)
};

export function logLoginAttempt(success, metadata) {
  const event = success ? 'login_success' : 'login_failed';
  const level = success ? LOG_LEVELS.INFO : LOG_LEVELS.SECURITY;
  
  return logAuthEvent(level, event, {
    success,
    phone: metadata.phone ? `***${metadata.phone.slice(-4)}` : 'unknown',
    ip: metadata.ip,
    userAgent: metadata.userAgent,
    reason: metadata.reason,
    timestamp: new Date().toISOString()
  });
}

export function logRegistrationAttempt(success, metadata) {
  const event = success ? 'registration_success' : 'registration_failed';
  const level = success ? LOG_LEVELS.INFO : LOG_LEVELS.WARN;
  
  return logAuthEvent(level, event, {
    success,
    phone: metadata.phone ? `***${metadata.phone.slice(-4)}` : 'unknown',
    ip: metadata.ip,
    reason: metadata.reason,
    timestamp: new Date().toISOString()
  });
}

export function logSuspiciousActivity(type, metadata) {
  return logAuthEvent(LOG_LEVELS.SECURITY, 'suspicious_activity', {
    type,
    ...metadata,
    timestamp: new Date().toISOString()
  });
}

/**
 * reCAPTCHA verification (requires axios)
 */
export async function verifyRecaptcha(token, expectedAction = null) {
  try {
    const axios = await import('axios').then(m => m.default);
    
    if (!process.env.RECAPTCHA_SECRET_KEY) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  reCAPTCHA not configured, skipping verification');
        return { success: true, score: 1.0, dev: true };
      }
      throw new Error('RECAPTCHA_SECRET_KEY not configured');
    }

    if (!token) {
      return { success: false, error: 'recaptcha_token_missing' };
    }

    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token
        }
      }
    );

    const { success, score, action, 'error-codes': errorCodes } = response.data;

    if (!success) {
      return { success: false, error: 'recaptcha_verification_failed', errorCodes };
    }

    if (score !== undefined && score < 0.5) {
      logSuspiciousActivity('low_recaptcha_score', { score, action });
      return { success: false, error: 'recaptcha_score_too_low', score };
    }

    if (expectedAction && action !== expectedAction) {
      return { success: false, error: 'recaptcha_action_mismatch', expected: expectedAction, actual: action };
    }

    return { success: true, score, action };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { success: false, error: 'recaptcha_error', message: error.message };
  }
}
