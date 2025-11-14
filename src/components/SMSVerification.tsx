import { useState, useEffect, useCallback } from 'react';
import { Phone, Clock, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { firebasePhoneAuth } from '../services/firebasePhoneAuth';

interface SMSVerificationProps {
  phone: string;
  onVerified: () => void;
  onCancel: () => void;
}

export default function SMSVerification({ phone, onVerified, onCancel }: SMSVerificationProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const sendVerificationCode = useCallback(async () => {
    setIsSending(true);
    setError('');
    setSuccess('');
    
    try {
      // Format phone number for Firebase (+976XXXXXXXX)
      const formattedPhone = phone.startsWith('+') ? phone : `+976${phone}`;
      
      console.log('📱 Sending OTP via Firebase to:', formattedPhone);
      
      // Send OTP via Firebase (reCAPTCHA should already be initialized)
      const result = await firebasePhoneAuth.sendVerificationCode(formattedPhone);
      
      if (result.success) {
        setSuccess(result.message);
        setTimeLeft(300); // Reset timer
        console.log('✅ OTP sent successfully via Firebase');
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('❌ Send verification error:', error);
      const err = error as Error;
      setError(err.message || 'Код илгээхэд алдаа гарлаа');
    } finally {
      setIsSending(false);
    }
  }, [phone]);

  // Initialize reCAPTCHA on mount, then send verification code
  useEffect(() => {
    const initializeAndSend = async () => {
      try {
        console.log('🔄 Initializing reCAPTCHA...');
        
        // Initialize reCAPTCHA verifier (will auto-render when needed)
        firebasePhoneAuth.initRecaptcha('recaptcha-container');
        console.log('✅ reCAPTCHA verifier created');
        
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send verification code (reCAPTCHA will render automatically)
        await sendVerificationCode();
      } catch (error) {
        console.error('❌ reCAPTCHA initialization error:', error);
        const err = error as Error;
        setError(err.message || 'reCAPTCHA эхлүүлэхэд алдаа гарлаа');
      }
    };
    
    initializeAndSend();
    
    // Cleanup on unmount
    return () => {
      firebasePhoneAuth.clearRecaptcha();
    };
  }, [sendVerificationCode]);

  const verifyCode = async () => {
    if (code.length !== 6) {
      setError('6 оронтой код оруулна уу');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔐 Verifying OTP code via Firebase');
      
      // Verify OTP via Firebase
      const result = await firebasePhoneAuth.verifyCode(code);
      
      if (result.success) {
        setSuccess('✅ Утасны дугаар амжилттай баталгаажлаа!');
        console.log('👤 Firebase user:', result.user);
        
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('❌ Verify code error:', error);
      const err = error as Error;
      setError(err.message || 'Баталгаажуулахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Phone className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-text-main">
          Утасны дугаар баталгаажуулах
        </h3>
        <p className="text-sm text-text-main/70">
          <span className="font-medium">+976 {phone}</span> дугаарт баталгаажуулах код илгээгдлээ
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* reCAPTCHA container */}
      <div className="flex justify-center">
        <div id="recaptcha-container" className="flex justify-center"></div>
      </div>

      {/* Code Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-main">
          Баталгаажуулах код
        </label>
        <input
          type="text"
          name="verification-code"
          autoComplete="one-time-code"
          inputMode="numeric"
          value={code}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(value);
            setError('');
          }}
          className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main text-center text-lg font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="000000"
          maxLength={6}
        />
        <p className="text-xs text-text-main/60 text-center">
          6 оронтой код оруулна уу
        </p>
      </div>

      {/* Timer */}
      <div className="text-center">
        {timeLeft > 0 ? (
          <div className="flex items-center justify-center gap-2 text-sm text-text-main/70">
            <Clock className="w-4 h-4" />
            Код дахин авах: {formatTime(timeLeft)}
          </div>
        ) : (
          <button
            onClick={sendVerificationCode}
            disabled={isSending}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSending ? 'animate-spin' : ''}`} />
            {isSending ? 'Илгээж байна...' : 'Код дахин авах'}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-border-main rounded-md text-text-main hover:bg-gray-50 transition-colors"
        >
          Буцах
        </button>
        <button
          onClick={verifyCode}
          disabled={isLoading || code.length !== 6}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Шалгаж байна...' : 'Баталгаажуулах'}
        </button>
      </div>
    </div>
  );
}