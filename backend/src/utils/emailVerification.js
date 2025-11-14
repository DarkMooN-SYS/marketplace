import crypto from 'crypto';
import { db } from '../config/firebase.js';

/**
 * Email verification utilities
 */

// Generate email verification token
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Store verification token for user
export async function createEmailVerificationToken(userId, email) {
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.collection('emailVerifications').add({
    userId,
    email,
    token,
    expiresAt: expiresAt.toISOString(),
    verified: false,
    createdAt: new Date().toISOString()
  });

  return token;
}

// Verify email token
export async function verifyEmailToken(token) {
  try {
    const snapshot = await db.collection('emailVerifications')
      .where('token', '==', token)
      .where('verified', '==', false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: 'invalid_token' };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check expiry
    if (new Date(data.expiresAt) < new Date()) {
      return { success: false, error: 'token_expired' };
    }

    // Mark as verified
    await doc.ref.update({ 
      verified: true, 
      verifiedAt: new Date().toISOString() 
    });

    // Update user document
    if (data.userId) {
      await db.collection('users').doc(data.userId).update({
        emailVerified: true,
        email: data.email
      });
    }

    return { 
      success: true, 
      userId: data.userId,
      email: data.email 
    };
  } catch (error) {
    console.error('Email verification error:', error);
    return { success: false, error: 'verification_failed' };
  }
}

/**
 * Send verification email (placeholder - integrate with your email service)
 * For production, use SendGrid, AWS SES, or similar
 */
export async function sendVerificationEmail(email, token) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  // TODO: Integrate with actual email service
  console.log(`📧 Verification email for ${email}:`);
  console.log(`   URL: ${verificationUrl}`);
  console.log(`   Token: ${token}`);
  
  // In production, replace with:
  // await emailService.send({
  //   to: email,
  //   subject: '3say - Email Verification',
  //   html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`
  // });

  return { success: true, url: verificationUrl };
}

/**
 * Password reset utilities
 */

export async function createPasswordResetToken(userId, email) {
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.collection('passwordResets').add({
    userId,
    email,
    token,
    expiresAt: expiresAt.toISOString(),
    used: false,
    createdAt: new Date().toISOString()
  });

  return token;
}

export async function verifyPasswordResetToken(token) {
  try {
    const snapshot = await db.collection('passwordResets')
      .where('token', '==', token)
      .where('used', '==', false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: 'invalid_token' };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    if (new Date(data.expiresAt) < new Date()) {
      return { success: false, error: 'token_expired' };
    }

    return { 
      success: true, 
      userId: data.userId,
      email: data.email,
      resetDoc: doc 
    };
  } catch (error) {
    console.error('Password reset verification error:', error);
    return { success: false, error: 'verification_failed' };
  }
}
