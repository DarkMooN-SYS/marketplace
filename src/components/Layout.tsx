import React, { CSSProperties, useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import AuthModal from './AuthModal';
import { useDeviceType } from '../hooks/useDeviceType';

interface LayoutProps {
  children: React.ReactNode;
  onWalletClick?: () => void;
}

export default function Layout({ children, onWalletClick }: LayoutProps) {
  const deviceType = useDeviceType();
  const isNotebookOrUp = deviceType !== 'mobile';
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(isNotebookOrUp);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    setSidebarOpen(isNotebookOrUp);
  }, [isNotebookOrUp]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-device', deviceType);
  }, [deviceType]);

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  useEffect(() => {
    const handleAuthOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: 'login' | 'signup' }>).detail;
      if (detail?.mode) {
        setAuthMode(detail.mode);
      }
      setAuthModalOpen(true);
    };

    const handleAuthRequired = () => {
      // User needs to log in
      setAuthMode('login');
      setAuthModalOpen(true);
    };

    window.addEventListener('auth:open', handleAuthOpen as EventListener);
    window.addEventListener('auth:required', handleAuthRequired);
    
    return () => {
      window.removeEventListener('auth:open', handleAuthOpen as EventListener);
      window.removeEventListener('auth:required', handleAuthRequired);
    };
  }, []);

  const layoutStyle = {
    '--sidebar-offset': sidebarOpen && isNotebookOrUp
      ? 'var(--sidebar-width)'
      : 'clamp(1.25rem, 3vw, 2.5rem)',
  } as CSSProperties;

  return (
    <div className="min-h-screen bg-bg-main transition-colors duration-200">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />
      {/* Floating reopen button (desktop) when sidebar hidden */}
      {!sidebarOpen && (
        <button
          type="button"
          aria-label="Цэс нээх"
          onClick={() => setSidebarOpen(true)}
          className="hidden lg:flex fixed left-3 top-1/2 z-[60] h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)]/95 backdrop-blur-xl text-[var(--color-text-main)] shadow-lg transition hover:-translate-y-[calc(50%+0.25rem)] hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)]"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      <div
        className="transition-[padding] duration-300 lg:pl-[var(--sidebar-offset)]"
        style={layoutStyle}
      >
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          onAuthClick={openAuthModal}
          onWalletClick={onWalletClick}
        />
        <main className="app-shell app-stack">
          {children}
        </main>
      </div>
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </div>
  );
}