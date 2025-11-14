// Header.tsx
import { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, Wallet, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import ThemeToggle from './ThemeToggle';
import NotificationPanel from './NotificationPanel';
import { getProfileAvatar, loadAvatarFromStorage } from '../utils/avatarHelper';


type HeaderProps = {
  onMenuClick: () => void;
  onAuthClick: (mode: 'login' | 'signup') => void;
  onWalletClick?: () => void;
};

export default function Header({ onMenuClick, onAuthClick, onWalletClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { unreadCount, syncWithBackend } = useNotifications();
  const [profileAvatar, setProfileAvatar] = useState<string>("");
  const [profileName, setProfileName] = useState<string>("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  // Sync notifications with backend when user logs in
  useEffect(() => {
    if (user) {
      syncWithBackend();
    }
  }, [user, syncWithBackend]);

  // Load profile data using avatar helper
  useEffect(() => {
    const loadProfile = () => {
      const avatar = getProfileAvatar(user, loadAvatarFromStorage());
      const saved = localStorage.getItem('profile');
      let name = user?.name || "";
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          name = parsed.name || name;
        } catch (error) {
          console.error('Failed to parse profile data:', error);
        }
      }
      
      setProfileAvatar(avatar);
      setProfileName(name);
    };
    
    loadProfile();
  }, [user]);

  // Listen to storage events (from Profile edit)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'profile') {
        const avatar = getProfileAvatar(user, loadAvatarFromStorage());
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : {};
          setProfileAvatar(avatar);
          setProfileName(parsed.name || user?.name || "");
        } catch (error) {
          console.error('Failed to parse storage data:', error);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user]);

  // ...handleAvatarChange removed, not used...

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border-soft)] bg-[var(--color-bg-main)]/90 backdrop-blur-xl transition-colors">
      <div className="app-container flex h-14 sm:h-16 w-full items-center gap-2 sm:gap-3">
        {/* Left cluster */}
        <div className="flex items-center gap-2 mobile:gap-3">
          <button
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white/80 text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/70 lg:hidden"
            aria-label="Цэс нээх"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => { window.location.hash = 'home'; }}
            className="hidden items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-3 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/70 mobile:flex"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="tracking-wide">Платформ</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex flex-1 items-center gap-2">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white/80 text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/70 mobile:hidden"
            aria-label="Хайлт"
          >
            <Search className="h-5 w-5" />
          </button>
          <div className="relative hidden w-full max-w-xl mobile:flex">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-main)]/60" />
            <input
              type="text"
              placeholder="Шинэ бараа, холбоос, нийтлэл хайх..."
              className="w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/85 px-10 py-2 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-main)]/50 shadow-sm transition focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-slate-900/70"
            />
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2">
              {user.role === 'admin' && (
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-soft)] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 px-2 md:px-3 py-1.5 text-sm font-semibold text-indigo-600 transition hover:-translate-y-0.5 hover:from-indigo-500/20 hover:to-purple-500/20 dark:text-indigo-400"
                  onClick={() => { window.location.hash = 'admin/users'; }}
                  aria-label="Admin самбар"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="hidden md:inline">Admin</span>
                </button>
              )}
              <div className="relative">
                <button
                  ref={notificationButtonRef}
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-white/80 text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/70"
                  aria-label="Мэдэгдэл"
                >
                  <Bell className="h-[17px] w-[17px]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationPanel
                  isOpen={isNotificationOpen}
                  onClose={() => setIsNotificationOpen(false)}
                  anchorRef={notificationButtonRef}
                />
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-white/80 text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/70"
                onClick={onWalletClick}
                aria-label="Хэтэвч"
              >
                <Wallet className="h-[17px] w-[17px]" />
              </button>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-white/80 text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/70"
                onClick={() => { logout(); window.location.hash = 'home'; }}
                aria-label="Гарах"
              >
                <LogOut className="h-[17px] w-[17px]" />
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-soft)] bg-white/80 p-1 md:p-1.5 pr-1 md:pr-2.5 transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] dark:bg-slate-900/70"
                onClick={() => { window.location.hash = 'profile'; }}
              >
                <img
                  src={profileAvatar}
                  alt={profileName || user.name}
                  className="h-7 w-7 rounded-xl object-cover"
                />
                <span className="hidden md:inline text-sm font-semibold text-[var(--color-text-main)] truncate max-w-[100px] xl:max-w-[150px]">{profileName || user.name}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAuthClick('login')}
                className="inline-flex items-center gap-1 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-3.5 py-2 text-xs font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/70"
              >
                Нэвтрэх
              </button>
              <button
                onClick={() => onAuthClick('signup')}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                Бүртгүүлэх
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
