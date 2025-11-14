/**
 * Firebase Phone Authentication Service
 * Client-side phone verification using Firebase
 */

import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../config/firebase';

class FirebasePhoneAuthService {
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private confirmationResult: ConfirmationResult | null = null;

  /**
   * Initialize reCAPTCHA verifier
   * @param elementId - ID of the div element for reCAPTCHA
   */
  initRecaptcha(elementId: string) {
    if (!auth) {
      throw new Error('Firebase not configured. Please use backend SMS verification.');
    }
    
    // Clear any existing verifier first
    if (this.recaptchaVerifier) {
      console.log('🔄 Clearing existing reCAPTCHA verifier');
      try {
        this.recaptchaVerifier.clear();
      } catch (error) {
        console.warn('⚠️ Error clearing old verifier:', error);
      }
      this.recaptchaVerifier = null;
    }
    
    try {
      console.log('🔐 Initializing reCAPTCHA on element:', elementId);
      
      // Clear the container element
      const container = document.getElementById(elementId);
      if (!container) {
        throw new Error(`Element with id "${elementId}" not found`);
      }
      container.innerHTML = ''; // Clear any existing reCAPTCHA widgets
      
      // Create RecaptchaVerifier following Firebase v9+ modular syntax
      this.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        elementId,
        {
          'size': 'invisible', // Use invisible for better UX
          'callback': (response: string) => {
            console.log('✅ reCAPTCHA resolved:', response);
          },
          'expired-callback': () => {
            console.warn('⚠️ reCAPTCHA expired, please try again');
            // Clear and reinitialize on expiration
            this.clearRecaptcha();
          }
        }
      );
      
      console.log('✅ reCAPTCHA verifier created successfully');
    } catch (error) {
      console.error('❌ Failed to create reCAPTCHA verifier:', error);
      throw error;
    }
    
    return this.recaptchaVerifier;
  }

  /**
   * Send verification code to phone number
   * @param phoneNumber - Phone number in E.164 format (e.g., +976XXXXXXXX)
   */
  async sendVerificationCode(phoneNumber: string) {
    try {
      if (!auth) {
        throw new Error('Firebase not configured');
      }

      if (!this.recaptchaVerifier) {
        throw new Error('reCAPTCHA not initialized');
      }

      // Ensure phone number is in E.164 format
      const formattedPhone = phoneNumber.startsWith('+976') 
        ? phoneNumber 
        : `+976${phoneNumber.replace(/\D/g, '')}`;

      console.log('Sending verification code to:', formattedPhone);

      this.confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        this.recaptchaVerifier
      );

      return {
        success: true,
        message: 'Баталгаажуулах код амжилттай илгээгдлээ'
      };
    } catch (error: unknown) {
      console.error('Firebase phone auth error:', error);
      
      // Handle specific Firebase errors
      const firebaseError = error as { code?: string };
      let message = 'SMS илгээхэд алдаа гарлаа';
      if (firebaseError.code === 'auth/invalid-phone-number') {
        message = 'Утасны дугаар буруу байна';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        message = 'Хэт олон удаа оролдлоо. Түр хүлээнэ үү';
      } else if (firebaseError.code === 'auth/quota-exceeded') {
        message = 'SMS илгээх лимит хэтэрсэн';
      }

      return {
        success: false,
        message,
        error: firebaseError.code
      };
    }
  }

  /**
   * Verify the code entered by user
   * @param code - 6-digit verification code
   */
  async verifyCode(code: string) {
    try {
      if (!this.confirmationResult) {
        throw new Error('No confirmation result. Send verification code first.');
      }

      const result = await this.confirmationResult.confirm(code);
      const user = result.user;

      return {
        success: true,
        message: 'Утасны дугаар амжилттай баталгаажлаа',
        user: {
          uid: user.uid,
          phoneNumber: user.phoneNumber
        }
      };
    } catch (error: unknown) {
      console.error('Code verification error:', error);
      
      const firebaseError = error as { code?: string };
      let message = 'Баталгаажуулахад алдаа гарлаа';
      if (firebaseError.code === 'auth/invalid-verification-code') {
        message = 'Баталгаажуулах код буруу байна';
      } else if (firebaseError.code === 'auth/code-expired') {
        message = 'Кодны хугацаа дууссан. Дахин код авна уу';
      }

      return {
        success: false,
        message,
        error: firebaseError.code
      };
    }
  }

  /**
   * Clear reCAPTCHA verifier and clean up DOM
   */
  clearRecaptcha() {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
        console.log('🧹 reCAPTCHA cleared');
      } catch (error) {
        console.warn('⚠️ Error clearing reCAPTCHA:', error);
      }
      this.recaptchaVerifier = null;
    }
    
    // Clean up DOM element
    const container = document.getElementById('recaptcha-container');
    if (container) {
      container.innerHTML = '';
    }
    
    this.confirmationResult = null;
  }
}

export const firebasePhoneAuth = new FirebasePhoneAuthService();
