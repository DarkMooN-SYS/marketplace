import {
  Home,
  FileText,
  ShoppingBag,
  Link,
  Newspaper,
  Gamepad2,
  Plus,
  X,
  Compass,
  Send,
  LayoutDashboard,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onToggle?: () => void;
}

const navigation = [
  { name: 'Нүүр', href: '#home', page: 'home', icon: Home },
  { name: 'Судалгаа бөглөх', href: '#surveys', page: 'surveys', icon: FileText },
  { name: 'Зах зээл', href: '#marketplace', page: 'marketplace', icon: ShoppingBag },
  { name: 'Вэб холбоос', href: '#links', page: 'links', icon: Link },
  { name: 'Мэдээ, нийтлэл', href: '#news', page: 'news', icon: Newspaper },
  { name: 'Азын хүрд', href: '#spin', page: 'spin', icon: Gamepad2 },
];

const submissionNav = [
  { name: 'Судалгаа илгээх', href: '#submit-survey', page: 'submit-survey', icon: Plus },
  { name: 'Вэб холбоос илгээх', href: '#submit-link', page: 'submit-link', icon: Plus },
  { name: 'Зар сурталчилгаа илгээх', href: '#submit-ad', page: 'submit-ad', icon: Plus },
  { name: 'Бараа нэмэх', href: '#submit-product', page: 'submit-product', icon: Plus },
];

export default function Sidebar({ open, onClose, onToggle }: SidebarProps) {
  const { isPageActive, setCurrentPage } = useNavigation();
  const { user } = useAuth();

  const handleHomeClick = () => {
    setCurrentPage('home');
    window.location.hash = 'home';
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full w-[var(--sidebar-width)] bg-[var(--color-bg-main)]/90 backdrop-blur-xl border-r border-[var(--color-border-soft)] transform transition-transform duration-300 ease-in-out shadow-2xl shadow-black/10
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full relative">
          {/* Desktop collapse toggle */}
          <button
            type="button"
            aria-label={open ? 'Цэс нуух' : 'Цэс нээх'}
            onClick={onToggle ?? onClose}
            className="hidden lg:inline-flex items-center justify-center absolute -right-4 top-24 h-9 w-9 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)]/90 backdrop-blur-xl shadow-md transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)]"
          >
            {open ? <ChevronsLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
          </button>
          {/* Header */}
          <div className="flex items-center justify-between h-20 px-5 border-b border-[var(--color-border-soft)] bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-indigo-700/10">
            <button
              type="button"
              onClick={handleHomeClick}
              aria-label="Нүүр хуудас руу буцах"
              className="group flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl transition"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                <span className="text-lg font-bold">P</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-lg font-semibold text-[var(--color-text-main)]">
                  Платформ
                </span>
              </div>
            </button>
            
            <button
              onClick={onClose}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border-soft)] text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-5 py-6 space-y-8 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--color-border-soft)]/60 scrollbar-track-transparent">
            {/* Main Sections */}
            <div>
              <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/70 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-white/70 text-[var(--color-text-main)]/80 dark:border-white/15 dark:bg-white/10 dark:text-white/70">
                  <Compass className="h-3.5 w-3.5" />
                </span>
                Үндсэн хэсгүүд
              </h3>
              <ul className="space-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      onClick={onClose}
                      className={`
                        group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 shadow-sm
                        ${isPageActive(item.page)
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-200 shadow-blue-500/20'
                          : 'border-[var(--color-border-soft)] bg-white/70 text-[var(--color-text-main)] hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:shadow-lg dark:border-white/12 dark:bg-slate-900/65 dark:text-white'
                        }
                      `}
                    >
                      <item.icon className={`
                        h-5 w-5 flex-shrink-0 rounded-xl border p-2 transition
                        ${isPageActive(item.page)
                          ? 'border-blue-500/70 bg-blue-500 text-white shadow-md shadow-blue-500/30'
                          : 'border-[var(--color-border-soft)] bg-white text-[var(--color-text-main)] group-hover:border-[var(--color-border-main)] group-hover:bg-[var(--color-border-main)]/10 dark:border-white/20 dark:bg-white/12 dark:text-white/75 dark:group-hover:border-white/35 dark:group-hover:bg-white/20'
                        }
                      `} />
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Submission Sections */}
            <div>
              <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/70 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-white/70 text-[var(--color-text-main)]/80 dark:border-white/15 dark:bg-white/10 dark:text-white/70">
                  <Send className="h-3.5 w-3.5" />
                </span>
                Илгээх хэсгүүд
              </h3>
              <ul className="space-y-2">
                {submissionNav.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      onClick={onClose}
                      className={`
                        group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 shadow-sm
                        ${isPageActive(item.page)
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-200 shadow-emerald-500/20'
                          : 'border-[var(--color-border-soft)] bg-white/70 text-[var(--color-text-main)] hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:shadow-lg dark:border-white/12 dark:bg-slate-900/65 dark:text-white'
                        }
                      `}
                    >
                      <item.icon className={`
                        h-5 w-5 flex-shrink-0 rounded-xl border p-2 transition
                        ${isPageActive(item.page)
                          ? 'border-emerald-500/70 bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                          : 'border-[var(--color-border-soft)] bg-white text-[var(--color-text-main)] group-hover:border-[var(--color-border-main)] group-hover:bg-[var(--color-border-main)]/10 dark:border-white/20 dark:bg-white/12 dark:text-white/75 dark:group-hover:border-white/35 dark:group-hover:bg-white/20'
                        }
                      `} />
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {user?.role === 'admin' && (
              <div>
                <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/70 mb-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-white/70 text-[var(--color-text-main)]/80 dark:border-white/15 dark:bg-white/10 dark:text-white/70">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                  </span>
                  Admin
                </h3>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="#admin/users"
                      onClick={onClose}
                      className={`
                        group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold transition-all duration-200 shadow-sm
                        ${isPageActive('admin')
                          ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-200 shadow-indigo-500/20'
                          : 'border-[var(--color-border-soft)] bg-white/70 text-[var(--color-text-main)] hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:shadow-lg dark:border-white/12 dark:bg-slate-900/65 dark:text-white'
                        }
                      `}
                    >
                      <LayoutDashboard
                        className={`
                          h-5 w-5 flex-shrink-0 rounded-xl border p-2 transition
                          ${isPageActive('admin')
                            ? 'border-indigo-500/70 bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                            : 'border-[var(--color-border-soft)] bg-white text-[var(--color-text-main)] group-hover:border-[var(--color-border-main)] group-hover:bg-[var(--color-border-main)]/10 dark:border-white/20 dark:bg-white/12 dark:text-white/75 dark:group-hover:border-white/35 dark:group-hover:bg-white/20'
                          }
                        `}
                      />
                      Админ самбар
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="p-5 border-t border-[var(--color-border-soft)] bg-white/70 dark:bg-slate-900/60">
            <div className="rounded-2xl border-[0.5px] border-[var(--color-border-soft)] bg-white/70 px-4 py-3 text-center text-[11px] text-[var(--color-text-main)] dark:bg-slate-900/60">
              © 2025 Платформ<br />Бүх эрх хуулиар хамгаалагдсан.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}