import express from 'express';
import { auth } from '../config/firebase.js';
import { db } from '../config/firebase.js';
import admin from '../config/firebase.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { smsService } from '../services/smsService.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { verifyAppCheck } from '../middleware/appCheck.js';
import { 
  validateRegistration, 
  validateLogin, 
  validatePhoneVerification,
  validateCodeVerification 
} from '../middleware/validation.js';
import {
  logLoginAttempt,
  logRegistrationAttempt,
  logSuspiciousActivity,
  authLogger
} from '../utils/loginSecurity.js';
import {
  createEmailVerificationToken,
  verifyEmailToken,
  sendVerificationEmail
} from '../utils/emailVerification.js';

const router = express.Router();

// Helper function to detect device type from user agent
function detectDeviceType(userAgent) {
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    return 'Mobile';
  }
  return 'Desktop';
}

// Helper function to extract device name from user agent
function extractDeviceName(userAgent) {
  const ua = userAgent.toLowerCase();
  
  // Browser detection
  let browser = 'Unknown Browser';
  if (ua.includes('chrome') && !ua.includes('edge')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edge')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  
  // OS detection
  let os = 'Unknown OS';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  return `${browser} on ${os}`;
}

// Failed login helpers: store counters on user document
async function incrementFailedLogin(userDoc) {
  try {
    const data = userDoc.data();
    const failed = (data.failedAttempts || 0) + 1;
    const updates = { failedAttempts: failed };
    if (failed >= 5) {
      // lock account for 15 minutes
      updates.lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    await userDoc.ref.update(updates);
  } catch (err) {
    console.error('Failed to increment failed login:', err);
  }
}

async function resetFailedLogin(userDoc) {
  try {
    await userDoc.ref.update({ failedAttempts: 0, lockUntil: null });
  } catch (err) {
    console.error('Failed to reset failed login:', err);
  }
}

// Send verification code
router.post('/send-verification', verifyAppCheck, authLimiter, validatePhoneVerification, async (req, res) => {
  try {
    const { phone } = req.body;

    authLogger.info('sms_verification_requested', { 
      phone: `***${phone.slice(-4)}`, 
      ip: req.ip 
    });

    const result = await smsService.sendVerificationCode(phone);
    
    if (result.success) {
      res.json({
        message: result.message,
        testCode: process.env.NODE_ENV === 'development' ? result.testCode : undefined
      });
    } else {
      authLogger.warn('sms_send_failed', { phone: `***${phone.slice(-4)}` });
      res.status(500).json({
        error: 'SMS failed',
        message: result.message
      });
    }
  } catch (error) {
    authLogger.error('sms_verification_error', { error: error.message });
    res.status(500).json({ 
      error: 'Server error',
      message: 'Серверийн алдаа гарлаа' 
    });
  }
});

// Verify code
router.post('/verify-code', verifyAppCheck, authLimiter, validateCodeVerification, async (req, res) => {
  try {
    const { phone, code } = req.body;

    const result = smsService.verifyCode(phone, code);
    
    if (result.success) {
      authLogger.info('phone_verified', { phone: `***${phone.slice(-4)}` });
      res.json({
        message: result.message,
        verified: true
      });
    } else {
      authLogger.warn('phone_verification_failed', { phone: `***${phone.slice(-4)}` });
      res.status(400).json({
        error: 'Verification failed',
        message: result.message,
        verified: false
      });
    }
  } catch (error) {
    authLogger.error('verify_code_error', { error: error.message });
    res.status(500).json({ 
      error: 'Server error',
      message: 'Серверийн алдаа гарлаа' 
    });
  }
});

// Register user
router.post('/register', verifyAppCheck, authLimiter, validateRegistration, async (req, res) => {
  try {
    const { phone, password, name, verified, email } = req.body;

    console.log(`📝 [Register Attempt] Phone: ${phone.slice(0, 4)}****, Name: ${name}`);

    // SECURITY: Require phone verification in production
    if (process.env.NODE_ENV === 'production' && verified !== true) {
      authLogger.warn('registration_without_phone_verification', { 
        phone: `***${phone.slice(-4)}`,
        ip: req.ip
      });
      return res.status(400).json({
        error: 'phone_verification_required',
        message: 'Утасны дугаараа баталгаажуулна уу'
      });
    }
    
    // Optional: Warn in development if not verified
    if (process.env.NODE_ENV === 'development' && verified !== true) {
      authLogger.warn('registration_without_phone_verification_dev', { 
        phone: `***${phone.slice(-4)}` 
      });
    }

    // Check if user already exists (do not reveal too much information)
    const existingUserQuery = await db.collection('users')
      .where('phone', '==', phone)
      .get();

    if (!existingUserQuery.empty) {
      // SECURITY: Generic message to prevent user enumeration attacks
      logRegistrationAttempt(false, { 
        phone: `***${phone.slice(-4)}`, 
        ip: req.ip, 
        reason: 'phone_exists' 
      });
      return res.status(400).json({ 
        error: 'registration_failed',
        message: 'Бүртгэл үүсгэх амжилтгүй боллоо' // Generic error message
      });
    }

    console.log(`🔐 [Register] Hashing password...`);
    // Hash password with strong salt rounds (10 is secure)
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`✅ [Register] Password hashed successfully`);

    // Create user document with additional profile fields
    const { 
      dateOfBirth, 
      gender, 
      city, 
      district, 
      address, 
      occupation, 
      company, 
      education, 
      monthlyIncome, 
      interests, 
      maritalStatus, 
      hasChildren, 
      childrenCount, 
      acceptMarketing, 
      preferredContactMethod 
    } = req.body;

    const userDoc = await db.collection('users').add({
      // Basic info
      name,
      phone,
      password: hashedPassword,
      email: email || null,
      emailVerified: false,
      avatar: null,
      role: 'user',
      createdAt: new Date().toISOString(),
      balance: 0,
      points: 0,
      membershipLevel: 'bronze',
      status: 'active',
      failedAttempts: 0,
      lockUntil: null,
      
      // Profile details (optional during registration)
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      city: city || null,
      district: district || null,
      address: address || null,
      occupation: occupation || null,
      company: company || null,
      education: education || null,
      monthlyIncome: monthlyIncome || null,
      interests: interests || [],
      maritalStatus: maritalStatus || null,
      hasChildren: hasChildren || false,
      childrenCount: childrenCount || 0,
      acceptMarketing: acceptMarketing || false,
      preferredContactMethod: preferredContactMethod || 'app_notification',
      
      // Profile completion tracking
      profileCompleted: false,
      profileCompletedAt: null
    });

    // Send email verification if email provided
    if (email) {
      try {
        const verifyToken = await createEmailVerificationToken(userDoc.id, email);
        await sendVerificationEmail(email, verifyToken);
        authLogger.info('email_verification_sent', { 
          userId: userDoc.id, 
          email: `***${email.split('@')[1]}` 
        });
      } catch (emailError) {
        authLogger.error('email_verification_send_failed', { error: emailError.message });
      }
    }

    logRegistrationAttempt(true, { 
      phone: `***${phone.slice(-4)}`, 
      ip: req.ip, 
      userId: userDoc.id 
    });

    // SECURITY: Do not return sensitive data (userId, email details)
    res.status(201).json({
      message: 'Бүртгэл амжилттай үүслээ',
      success: true
      // Removed: userId (prevents user enumeration)
      // Removed: emailVerificationSent (information leakage)
    });

  } catch (error) {
    authLogger.error('registration_error', { error: error.message, ip: req.ip });
    // SECURITY: Generic error message only
    res.status(400).json({ 
      error: 'registration_failed',
      message: 'Бүртгэл үүсгэх амжилтгүй боллоо'
    });
  }
});

// Login user
router.post('/login', verifyAppCheck, authLimiter, validateLogin, async (req, res) => {
  try {
    const { phone, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent') || '';

    console.log(`🔑 [Login Attempt] Phone: ${phone.slice(0, 4)}****`);

    // Find user by phone
    const userQuery = await db.collection('users')
      .where('phone', '==', phone)
      .get();

    if (userQuery.empty) {
      // SECURITY: Generic message to prevent user enumeration attacks
      // Do NOT reveal whether user exists or not
      logLoginAttempt(false, { phone: `***${phone.slice(-4)}`, ip, userAgent, reason: 'user_not_found' });
      return res.status(401).json({ 
        error: 'authentication_failed',
        message: 'Утасны дугаар эсвэл нууц үг буруу байна'
      });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    
    console.log(`✅ [Login] User found: ${userDoc.id}, has password: ${!!userData.password}`);

    // SECURITY: Check for account lockout (failed login protection)
    if (userData.lockUntil && new Date(userData.lockUntil) > new Date()) {
      logSuspiciousActivity('login_attempt_while_locked', { 
        phone: `***${phone.slice(-4)}`, 
        ip 
      });
      return res.status(403).json({ 
        error: 'account_locked', 
        message: 'Таны данс түр хугацаагаар түгжигдсэн байна. 15 минутын дараа дахин оролдоно уу.' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, userData.password);
    console.log(`🔐 [Login] Password check: ${isValidPassword ? 'VALID ✅' : 'INVALID ❌'}`);
    
    if (!isValidPassword) {
      // SECURITY: Increment failed attempts, lock after 5 failed attempts
      await incrementFailedLogin(userDoc);
      logLoginAttempt(false, { phone: `***${phone.slice(-4)}`, ip, userAgent, reason: 'invalid_password' });
      return res.status(401).json({ 
        error: 'authentication_failed',
        message: 'Утасны дугаар эсвэл нууц үг буруу байна'
      });
    }

    // Reset failed attempts on successful login
    await resetFailedLogin(userDoc);

    // SECURITY: Generate JWT token with proper expiration
    const token = jwt.sign(
      { 
        uid: userDoc.id,
        phone: userData.phone,
        role: userData.role || 'user'
        // SECURITY: Do not include sensitive data (password hash, email, etc.)
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Token expires in 24 hours
    );

    // Create or update session for device tracking
    try {
      const deviceType = detectDeviceType(userAgent);
      const deviceName = extractDeviceName(userAgent);
      
      const existingSessionQuery = await db.collection('sessions')
        .where('userId', '==', userDoc.id)
        .where('userAgent', '==', userAgent)
        .limit(1)
        .get();
      
      if (!existingSessionQuery.empty) {
        const existingSessionDoc = existingSessionQuery.docs[0];
        await existingSessionDoc.ref.update({
          lastActivity: new Date().toISOString(),
          ip: ip
        });
      } else {
        await db.collection('sessions').add({
          userId: userDoc.id,
          deviceType,
          deviceName,
          location: 'Unknown',
          ip: ip,
          userAgent,
          lastActivity: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }
    } catch (sessionError) {
      authLogger.error('session_creation_error', { error: sessionError.message });
    }

    logLoginAttempt(true, { phone: `***${phone.slice(-4)}`, ip, userAgent, userId: userDoc.id });

    // SECURITY: Return only necessary user data (no sensitive info)
    res.json({
      token,
      user: {
        id: userDoc.id,
        name: userData.name,
        avatar: userData.avatar,
        role: userData.role || 'user',
        balance: userData.balance || 0,
        membershipLevel: userData.membershipLevel || 'bronze',
        emailVerified: userData.emailVerified || false
        // SECURITY: Removed phone number from response (prevents data leakage)
        // SECURITY: Removed points, email, etc. (fetch separately if needed)
      }
    });

  } catch (error) {
    authLogger.error('login_error', { error: error.message, ip: req.ip });
    // SECURITY: Generic error message only
    res.status(401).json({ 
      error: 'login_failed',
      message: 'Нэвтрэх үед алдаа гарлаа' 
    });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    const userData = userDoc.data();

    res.json({
      user: {
        id: decoded.uid,
        email: decoded.email,
        name: userData?.name,
        phone: userData?.phone,
        avatar: userData?.avatar,
        role: userData?.role || 'user',
        balance: userData?.balance || 0,
        membershipLevel: userData?.membershipLevel || 'bronze'
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Verify email with token
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        error: 'token_missing',
        message: 'Verification token is required' 
      });
    }

    const result = await verifyEmailToken(token);

    if (result.success) {
      authLogger.info('email_verified', { 
        userId: result.userId, 
        email: `***${result.email.split('@')[1]}` 
      });
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Email verification failed'
      });
    }

  } catch (error) {
    authLogger.error('email_verification_error', { error: error.message });
    res.status(500).json({ 
      error: 'verification_error',
      message: 'Email verification error'
    });
  }
});

export default router;