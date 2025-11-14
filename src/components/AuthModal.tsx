import React, { useState } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import SMSVerification from './SMSVerification';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
  onModeChange: (mode: 'login' | 'signup') => void;
}

export default function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const { login, signup, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    try {
      if (mode === 'login') {
        await login(formData.phone, formData.password);
        onClose();
        setFormData({ name: '', phone: '', password: '', confirmPassword: '' });
        setErrorMessage('');
      } else {
        // Signup flow
        // Validate password requirements
        if (formData.password.length < 8) {
          setErrorMessage('Нууц үг дор хаяж 8 тэмдэгт байх ёстой');
          return;
        }
        if (!/[a-zA-Z]/.test(formData.password)) {
          setErrorMessage('Нууц үг дор хаяж нэг үсэг (a-z, A-Z) агуулах ёстой');
          return;
        }
        if (!/\d/.test(formData.password)) {
          setErrorMessage('Нууц үг дор хаяж нэг тоо (0-9) агуулах ёстой');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setErrorMessage('Нууц үгс таарахгүй байна');
          return;
        }
        
        // Show verification step for signup
        setShowVerification(true);
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Алдаа гарлаа';
      setErrorMessage(errorMsg);
    }
  };

  const handleVerificationSuccess = async () => {
    try {
      // Phone is verified, proceed with signup
      await signup(formData.name, formData.phone, formData.password, true);
      onClose();
      setFormData({ name: '', phone: '', password: '', confirmPassword: '' });
      setErrorMessage('');
      setShowVerification(false);
    } catch (error) {
      console.error('Signup error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Бүртгэлд алдаа гарлаа';
      setErrorMessage(errorMsg);
      setShowVerification(false);
    }
  };

  const handleVerificationCancel = () => {
    setShowVerification(false);
    setErrorMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-main rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-main">
          <h2 className="text-2xl font-bold text-text-main">
            {showVerification ? 'Утас баталгаажуулах' : (mode === 'login' ? 'Тавтай морил' : 'Бүртгэл үүсгэх')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-text-main hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showVerification ? (
            <SMSVerification
              phone={formData.phone}
              onVerified={handleVerificationSuccess}
              onCancel={handleVerificationCancel}
            />
          ) : (
            <div>
              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                  <p>{errorMessage}</p>
                  {errorMessage.includes('бүртгэлгүй байна') && mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        onModeChange('signup');
                        setErrorMessage('');
                      }}
                      className="mt-2 text-blue-600 hover:text-blue-800 font-medium underline"
                    >
                      Одоо бүртгүүлэх
                    </button>
                  )}
                  {errorMessage.includes('аль хэдийн бүртгэгдсэн байна') && mode === 'signup' && (
                    <button
                      type="button"
                      onClick={() => {
                        onModeChange('login');
                        setErrorMessage('');
                      }}
                      className="mt-2 text-blue-600 hover:text-blue-800 font-medium underline"
                    >
                      Нэвтрэх хэсэгрүү очих
                    </button>
                  )}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Бүтэн нэр
                    </label>
                    <input
                      type="text"
                      name="name"
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Таны бүтэн нэрийг оруулна уу"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Утасны дугаар
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border-main bg-gray-50 text-gray-500 text-sm">+976</span>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      pattern="[0-9]{8}"
                      maxLength={8}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0,8) })}
                      className="w-full px-3 py-2 border border-border-main rounded-r-md bg-bg-main text-text-main placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Утасны дугаараа оруулна уу"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-main mb-2">
                    Нууц үг
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-border-main rounded-md bg-bg-main text-text-main placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Нууц үгээ оруулна уу"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <p className="font-medium">Нууц үгийн шаардлага:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li className={formData.password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
                          Дор хаяж 8 тэмдэгт
                        </li>
                        <li className={/[a-zA-Z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                          Дор хаяж нэг үсэг (a-z, A-Z)
                        </li>
                        <li className={/\d/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                          Дор хаяж нэг тоо (0-9)
                        </li>
                      </ul>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Жишээ: Test1234, MyPass99
                      </p>
                    </div>
                  )}
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-2">
                      Нууц үг дахин оруулах
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-border-main rounded-md bg-bg-main text-text-main placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Нууц үгээ дахин оруулна уу"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      {mode === 'login' ? 'Нэвтэрч байна...' : 'Бүртгүүлж байна...'}
                    </div>
                  ) : (
                    mode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="mt-6 text-center">
                <p className="text-sm text-text-main">
                  {mode === 'login' ? "Бүртгэлгүй юу? " : 'Бүртгэлтэй юу? '}
                  <button
                    onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    {mode === 'login' ? 'Бүртгүүлэх' : 'Нэвтрэх'}
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}