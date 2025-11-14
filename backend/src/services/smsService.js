/**
 * SMS Verification Service
 * 
 * PRODUCTION INTEGRATION OPTIONS:
 * 
 * 1. INTERNATIONAL PROVIDERS:
 *    - Twilio: https://www.twilio.com
 *    - AWS SNS: https://aws.amazon.com/sns/
 *    - Firebase Phone Auth: https://firebase.google.com/docs/auth/web/phone-auth
 */

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

// In production, use Redis or database (Firestore, MongoDB, etc.)
const verificationCodes = new Map(); 

export const smsService = {
  async sendVerificationCode(phone) {
    try {
      // Check rate limiting (prevent spam)
      const existing = verificationCodes.get(phone);
      if (existing && (Date.now() - existing.sentAt) < 60000) { // 1 minute cooldown
        return {
          success: false,
          message: 'Дахин код авахаас өмнө 1 минут хүлээнэ үү'
        };
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      
      // Store verification code
      verificationCodes.set(phone, {
        code,
        expiresAt,
        sentAt: Date.now(),
        attempts: 0,
        maxAttempts: 3
      });

      // 📱 PRODUCTION: Replace with real SMS provider
      if (process.env.SMS_PROVIDER === 'twilio') {
        // await sendViaTwilio(phone, code);
      } else if (process.env.SMS_PROVIDER === 'skytel') {
        // await sendViaSkytel(phone, code);
      } else {
        // Development mode - log to console
        console.log(`\n${'='.repeat(60)}`);
        console.log(`� SMS VERIFICATION CODE`);
        console.log(`${'='.repeat(60)}`);
        console.log(`📞 Phone: ${phone}`);
        console.log(`🔢 Code: ${code}`);
        console.log(`⏰ Expires: ${expiresAt.toLocaleTimeString('mn-MN')}`);
        console.log(`⏱️  Valid for: 5 minutes`);
        console.log(`${'='.repeat(60)}\n`);
      }
      
      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        message: 'Баталгаажуулах код амжилттай илгээгдлээ',
        // ⚠️ SECURITY: Only return code in development mode
        testCode: process.env.NODE_ENV === 'development' ? code : undefined
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        message: 'SMS илгээхэд алдаа гарлаа. Дахин оролдоно уу.'
      };
    }
  },

  verifyCode(phone, inputCode) {
    const stored = verificationCodes.get(phone);
    
    if (!stored) {
      return {
        success: false,
        message: 'Баталгаажуулах код олдсонгүй. Дахин код авна уу.'
      };
    }

    if (new Date() > stored.expiresAt) {
      verificationCodes.delete(phone);
      return {
        success: false,
        message: 'Баталгаажуулах кодын хугацаа дууссан. Дахин код авна уу.'
      };
    }

    if (stored.attempts >= stored.maxAttempts) {
      verificationCodes.delete(phone);
      return {
        success: false,
        message: 'Хэт олон буруу оролдлого. Дахин код авна уу.'
      };
    }

    if (stored.code !== inputCode) {
      stored.attempts++;
      return {
        success: false,
        message: `Буруу код. ${stored.maxAttempts - stored.attempts} оролдлого үлдлээ.`
      };
    }

    // Success - remove the code
    verificationCodes.delete(phone);
    return {
      success: true,
      message: 'Утасны дугаар амжилттай баталгаажлаа'
    };
  },

  // Clean up expired codes
  cleanup() {
    const now = new Date();
    for (const [phone, data] of verificationCodes.entries()) {
      if (now > data.expiresAt) {
        verificationCodes.delete(phone);
      }
    }
  }
};

// Cleanup expired codes every 10 minutes
setInterval(() => {
  smsService.cleanup();
}, 10 * 60 * 1000);