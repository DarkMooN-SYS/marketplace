import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { profileApi } from '../../api/profileApi';
import { formatDate } from '../../utils/dateHelpers';
import api from '../../api/adminApi';
import { useAuth } from '../../hooks/useAuth';

interface Device {
  id: string;
  type: string;
  lastLogin: string;
  location: string;
  deviceName?: string;
  userAgent?: string;
  ip?: string;
}

const passwordTips = [
  '1 том үсэг, 1 тоо, 1 тусгай тэмдэгт заавал агуулсан байх',
  '8 тэмдэгтээс дээш урттай байвал илүү найдвартай',
  'Өмнөх хэрэглэдэг нууц үгийн хэсгээ давтаж болохгүй',
];

const Security: React.FC = () => {
  const { logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [logoutAllMsg, setLogoutAllMsg] = useState('');
  const [loadingDevices, setLoadingDevices] = useState(true);

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError('Бүх талбарыг бөглөнө үү');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Шинэ нууц үг таарахгүй байна');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Шинэ нууц үг 8-аас доошгүй урттай байх ёстой');
      return;
    }

    setChangingPassword(true);
    setPasswordError('');

    try {
      await profileApi.changePassword(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordChanged(true);
      setTimeout(() => setPasswordChanged(false), 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Нууц үг солиход алдаа гарлаа';
      if (errorMessage.includes('incorrect')) {
        setPasswordError('Хуучин нууц үг буруу байна');
      } else {
        setPasswordError(errorMessage);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEnable2FA = () => {
    setTwoFAEnabled(true);
    setTimeout(() => setTwoFAEnabled(false), 2200);
  };

  const handleLogoutAll = async () => {
    try {
      // Delete all sessions from backend
      await api.sessions.deleteAll();
      
      // Clear cache and state
      setDevices([]);
      localStorage.removeItem('cachedSessions');
      setLogoutAllMsg('Бүх төхөөрөмжөөс гарч байна...');
      
      // Wait a moment then logout and redirect to home
      setTimeout(() => {
        logout(); // This will clear token
        window.location.href = '/#home'; // Redirect to home and refresh
      }, 1000);
    } catch (error) {
      console.error('Error logging out from all devices:', error);
      setLogoutAllMsg('Алдаа гарлаа');
      setTimeout(() => setLogoutAllMsg(''), 2200);
    }
  };

  const handleLogoutDevice = async (id: string) => {
    try {
      // Check if this is the current device by comparing user agent
      const currentUserAgent = navigator.userAgent;
      const device = devices.find(d => d.id === id);
      const isCurrentDevice = device?.userAgent === currentUserAgent;

      // Delete session from backend
      await api.sessions.deleteSession(id);
      
      if (isCurrentDevice) {
        // If logging out from current device, do full logout
        setDevices([]);
        localStorage.removeItem('cachedSessions');
        setTimeout(() => {
          logout();
          window.location.href = '/#home';
        }, 500);
      } else {
        // Just remove from the list if it's another device
        const updatedDevices = devices.filter((d) => d.id !== id);
        setDevices(updatedDevices);
        
        // Update cache
        localStorage.setItem('cachedSessions', JSON.stringify(updatedDevices));
      }
    } catch (error) {
      console.error('Error logging out device:', error);
    }
  };

  // Load devices from backend with caching
  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoadingDevices(true);
        
        // Load cached sessions first for instant display
        const cached = localStorage.getItem('cachedSessions');
        if (cached) {
          try {
            setDevices(JSON.parse(cached));
          } catch (e) {
            console.error('Failed to parse cached sessions:', e);
          }
        }
        
        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        if (!token) {
          // Silent fallback to cached data
          setLoadingDevices(false);
          return;
        }
        
        // Fetch fresh data from backend
        const sessions = await api.sessions.getAll();
        setDevices(sessions);
        
        // Update cache
        localStorage.setItem('cachedSessions', JSON.stringify(sessions));
      } catch (error) {
        console.error('Error loading devices:', error);
      } finally {
        setLoadingDevices(false);
      }
    };

    loadDevices();
  }, []);

  const securityScore = useMemo(() => {
    let score = 40;
    if (twoFAEnabled) score += 30;
    if (devices.length <= 2) score += 10;
    if (!passwordError && !passwordChanged && newPassword.length >= 8) score += 20;
    return Math.min(score, 100);
  }, [devices.length, newPassword.length, passwordChanged, passwordError, twoFAEnabled]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--color-border-main)] bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/70 text-white shadow-lg px-6 py-6 sm:px-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Аюулгүй байдлын статус</p>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                {securityScore >= 70 ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-300" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-amber-300" />
                )}
              </span>
              <div>
                <h3 className="text-2xl font-semibold">{securityScore}%</h3>
                <p className="text-sm text-white/70">
                  Профайлаа бүрэн хамгаалахын тулд доорх алхмуудыг гүйцэтгэсэн эсэхээ шалгаарай.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 text-xs text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Найдвартай нууц үг ашиглах
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> 2 шатлалт баталгаажуулалт идэвхтэй байлгах
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
        <article className="rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] dark:bg-slate-900 shadow-md px-5 py-6 space-y-5">
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-500" />
                Нууц үг солих
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                Хамгийн сүүлд нууц үгээ {passwordChanged ? 'саяхан' : '3 долоо хоногийн өмнө'} шинэчилсэн байна.
              </p>
            </div>
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-500/20 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-900/40 dark:text-blue-200"
              title="Шифрлэгдсэн"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Шифрлэгдсэн</span>
            </span>
          </header>

          <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="space-y-3">
            {/* Hidden username field for accessibility - prevents password form warning */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              style={{ display: 'none' }}
              tabIndex={-1}
              aria-hidden="true"
            />
            
            <div className="relative">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300 block mb-2" htmlFor="old-password">
                Хуучин нууц үг
              </label>
              <input
                id="old-password"
                name="old-password"
                type={showOld ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-[var(--color-border-main)] bg-white/90 dark:bg-slate-900/60 px-4 py-3 text-sm text-[var(--color-text-main)] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60 pr-12"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-10 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setShowOld((v) => !v)}
              >
                {showOld ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300 block mb-2" htmlFor="new-password">
                  Шинэ нууц үг
                </label>
                <input
                  id="new-password"
                  name="new-password"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Шинэ нууц үг"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-[var(--color-border-main)] bg-white/90 dark:bg-slate-900/60 px-4 py-3 text-sm text-[var(--color-text-main)] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60 pr-12"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-10 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  onClick={() => setShowNew((v) => !v)}
                >
                  {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="relative">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300 block mb-2" htmlFor="confirm-password">
                  Баталгаажуулах
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Дахин оруулна уу"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-[var(--color-border-main)] bg-white/90 dark:bg-slate-900/60 px-4 py-3 text-sm text-[var(--color-text-main)] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60 pr-12"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-10 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1 text-xs text-slate-500 dark:text-slate-300">
                {passwordTips.map((tip) => (
                  <p key={tip} className="inline-flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-blue-500" />
                    {tip}
                  </p>
                ))}
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 md:px-5 py-2 text-sm md:text-base font-semibold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>Солж байна...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 flex-shrink-0" />
                    {/* <span>Солих</span> */}
                  </>
                )}
              </button>
            </div>
          </form>

          {passwordError && (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-400/60 px-4 py-2 text-sm text-rose-600 dark:text-rose-300">
              <AlertCircle className="h-4 w-4" />
              {passwordError}
            </div>
          )}
          {passwordChanged && (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-400/60 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Нууц үг амжилттай солигдлоо!
            </div>
          )}
        </article>

        <article className="space-y-5">
          <div className="rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] dark:bg-slate-900 shadow-md px-5 py-6">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                2 шатлалт баталгаажуулалт
              </h3>
              <span className={`inline-flex h-2 w-2 rounded-full ${twoFAEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </header>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              2FA идэвхжүүлснээр бүртгэлд нэвтрэх үед төхөөрөмжид илгээгдэх OTP кодыг баталгаажуулна.
            </p>
            <button
              className={`mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border-main)] px-4 md:px-5 py-2 text-sm md:text-base font-semibold transition ${
                twoFAEnabled
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-[var(--color-bg-main)] text-slate-600 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
              onClick={handleEnable2FA}
              disabled={twoFAEnabled}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              {twoFAEnabled ? 'Идэвхжсэн' : 'Идэвхжүүлэх'}
            </button>
            {twoFAEnabled && (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                2FA амжилттай идэвхжлээ!
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] dark:bg-slate-900 shadow-md px-5 py-6 space-y-4">
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-500" />
                Нэвтэрсэн төхөөрөмжүүд
              </h3>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">{devices.length} идэвхтэй</span>
            </header>

            <ul className="space-y-3">
              {loadingDevices ? (
                <li className="rounded-2xl border border-dashed border-[var(--color-border-main)]/60 bg-white/70 dark:bg-slate-900/60 px-4 py-5 text-center text-xs text-slate-500 dark:text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                  Төхөөрөмжүүдийг ачаалж байна...
                </li>
              ) : devices.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-[var(--color-border-main)]/60 bg-white/70 dark:bg-slate-900/60 px-4 py-5 text-center text-xs text-slate-500 dark:text-slate-300">
                  Одоогоор идэвхтэй төхөөрөмж байхгүй.
                </li>
              ) : (
                devices.map((device) => (
                  <li
                    key={device.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-main)] bg-white/80 dark:bg-slate-900/70 px-4 py-3 text-sm text-[var(--color-text-main)] dark:text-white"
                  >
                    <div>
                      <p className="font-semibold">{device.deviceName || device.type}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        {device.location} · Сүүлийн нэвтрэлт: {formatDate(device.lastLogin, 'mn-MN')}
                      </p>
                    </div>
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-main)] px-3 md:px-4 py-1.5 text-sm md:text-base font-semibold text-slate-600 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                      onClick={() => handleLogoutDevice(device.id)}
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span>Гарах</span>
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border-main)] px-3 md:px-4 py-2 text-sm md:text-base font-semibold text-slate-600 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800 transition"
                onClick={handleLogoutAll}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Бүх төхөөрөмжөөс гарах</span>
              </button>
              {logoutAllMsg && (
                <p className="inline-flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {logoutAllMsg}
                </p>
              )}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
};

export default Security;
