import jwt from 'jsonwebtoken';
import { auth } from '../config/firebase.js';

// Verify Firebase ID token
export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify JWT token (for custom auth) - IMPROVED SECURITY
export const verifyJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'no_token',
        message: 'Нэвтрэх эрх шаардлагатай' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ 
        error: 'invalid_token',
        message: 'Токен буруу байна' 
      });
    }

    // SECURITY: Verify JWT with proper error handling
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // Only allow HMAC SHA-256
      maxAge: '24h' // Enforce token expiration
    });
    
    // SECURITY: Validate decoded token structure
    if (!decoded.uid || !decoded.role) {
      return res.status(401).json({ 
        error: 'invalid_token_payload',
        message: 'Токен буруу форматтай байна' 
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    // SECURITY: Specific error messages for debugging (server-side only)
    console.error('JWT verification error:', {
      name: error.name,
      message: error.message,
      path: req.path
    });
    
    // Generic error message for client (prevent information leakage)
    let message = 'Токен хүчингүй байна';
    if (error.name === 'TokenExpiredError') {
      message = 'Токены хугацаа дууссан байна. Дахин нэвтэрнэ үү.';
    }
    
    res.status(401).json({ 
      error: 'token_verification_failed',
      message 
    });
  }
};

// Check admin role - IMPROVED SECURITY
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'authentication_required',
      message: 'Нэвтрэх эрх шаардлагатай' 
    });
  }

  // SECURITY: Strict role check (prevent role manipulation)
  if (req.user.role !== 'admin') {
    console.warn('🚫 Unauthorized admin access attempt:', {
      userId: req.user.uid,
      role: req.user.role,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({ 
      error: 'admin_access_required',
      message: 'Админы эрх шаардлагатай' 
    });
  }

  next();
};