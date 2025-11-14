import { type ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  MessageSquareText,
  BarChart3,
  Link2,
  Megaphone,
  Newspaper,
  LogOut,
  Gift,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export type AdminSection = 'users' | 'products' | 'reviews' | 'surveys' | 'links' | 'ads' | 'news' | 'spinrewards';

interface AdminLayoutProps {
  title: string;
  description?: string;
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  children: ReactNode;
}

const navItems: Array<{
  key: AdminSection;
  label: string;
  description: string;
  icon: typeof Users;
}> = [
  {
    key: 'users',
    label: 'Хэрэглэгчид',
    description: 'Бүртгэлтэй хэрэглэгчдийн жагсаалт ба статус',
    icon: Users,
  },
  {
    key: 'products',
    label: 'Бүтээгдэхүүн',
    description: 'Marketplace-д байршуулсан бараа',
    icon: Package,
  },
  {
    key: 'reviews',
    label: 'Сэтгэгдлүүд',
    description: 'Бүтээгдэхүүний үнэлгээ, сэтгэгдлийн хяналт',
    icon: MessageSquareText,
  },
  {
    key: 'news',
    label: 'Мэдээ нийтлэл',
    description: 'Комьюнити болон бүтээгдэхүүний шинэчлэлийг нийтлэх',
    icon: Newspaper,
  },
  {
    key: 'surveys',
    label: 'Судалгаа',
    description: 'Хэрэглэгчдэд зориулсан судалгаа үүсгэх, удирдах',
    icon: BarChart3,
  },
  {
    key: 'links',
    label: 'Web холбоос',
    description: 'Онцлох веб холбоосуудыг нэмэх, хянах',
    icon: Link2,
  },
  {
    key: 'ads',
    label: 'Зар сурталчилгаа',
    description: 'Баннер болон промо контент удирдах',
    icon: Megaphone,
  },
  {
    key: 'spinrewards',
    label: 'Spin Wheel Шагнал',
    description: 'Эргүүлийн хүрдний шагналыг тохируулах',
    icon: Gift,
  },
];

export function AdminLayout({
  title,
  description,
  activeSection,
  onNavigate,
  children,
}: AdminLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="admin-shell min-h-[calc(100vh-4rem)]">
      <aside className="admin-shell__sidebar border border-[var(--color-border-soft)] bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-blue-600/10 to-purple-500/15 p-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <LayoutDashboard className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/55">
              Admin
            </p>
            <p className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">
              Хяналтын самбар
            </p>
          </div>
        </div>

        <nav className="mt-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeSection;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:bg-[var(--color-border-main)]/5 hover:shadow-lg dark:hover:border-white/25 dark:hover:bg-white/5 ${
                  isActive
                    ? 'border-[var(--color-border-main)] bg-[var(--color-border-main)]/10 shadow-lg shadow-[var(--color-border-main)]/20 backdrop-blur'
                    : 'border-[var(--color-border-soft)] bg-white/70 dark:border-white/10 dark:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-[var(--color-text-main)] transition ${
                      isActive
                        ? 'border-[var(--color-border-main)] bg-[var(--color-border-main)] text-white shadow-md shadow-[var(--color-border-main)]/40'
                        : 'border-[var(--color-border-soft)] bg-white/80 dark:border-white/15 dark:bg-transparent dark:text-white/80'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isActive ? 'text-[var(--color-border-main)] dark:text-white' : 'text-[var(--color-text-main)] dark:text-white/80'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-main)]/60 dark:text-white/50">{item.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {user && (
          <div className="mt-6 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 p-4 text-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/45">
              Нэвтэрсэн админ
            </p>
            <div className="mt-3 flex items-center gap-3">
              <img
                src={user.avatar || '/img/human.png'}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">{user.name}</p>
                <p className="text-[11px] text-[var(--color-text-main)]/60 dark:text-white/50">{user.phone}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/50 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 dark:border-red-400/40 dark:text-red-300"
            >
              <LogOut className="h-4 w-4" /> Гарах
            </button>
          </div>
        )}
      </aside>

      <section className="admin-shell__content flex min-h-full flex-col gap-[var(--card-gap)] border border-[var(--color-border-soft)] bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
        <header className="border-b border-[var(--color-border-soft)] pb-4 dark:border-white/10">
          <h1 className="text-2xl font-semibold text-[var(--color-text-main)] dark:text-white">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--color-text-main)]/65 dark:text-white/55">{description}</p>
          )}
        </header>
        <div className="flex-1 overflow-x-auto">{children}</div>
      </section>
    </div>
  );
}
