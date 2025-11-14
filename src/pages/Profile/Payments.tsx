import React, { useMemo, useState, useEffect } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarRange,
  Filter,
  Loader2,
} from "lucide-react";
import { api } from '../../api/adminApi';
import { secureLocalStorage } from '../../utils/secureStorage';

type LocalTransaction = {
  id: string;
  date: string;
  type: "credit" | "debit";
  title: string;
  subtitle?: string;
  amount: number;
};

type FilterType = "yesterday" | "week" | "month" | "all";

const filterOptions = [
  { label: "Өчигдөр", value: "yesterday" },
  { label: "1 долоо хоног", value: "week" },
  { label: "1 сар", value: "month" },
  { label: "Бүгд", value: "all" },
];

function filterTransactions(list: LocalTransaction[], filter: FilterType): LocalTransaction[] {
  const now = new Date();

  if (filter === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return list.filter((t) => t.date === yesterday.toISOString().slice(0, 10));
  }

  if (filter === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return list.filter((t) => t.date >= weekAgo.toISOString().slice(0, 10));
  }

  if (filter === "month") {
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    return list.filter((t) => t.date >= monthAgo.toISOString().slice(0, 10));
  }

  return list;
}

const formatCurrency = (amount: number) => `₮${Math.abs(amount).toLocaleString("en-US")}`;

const Payments: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        // Load cached transactions first for instant display (even if not authenticated)
        const cachedTransactions = localStorage.getItem('cachedWalletTransactions');
        if (cachedTransactions) {
          try {
            const cached = JSON.parse(cachedTransactions) as Array<{
              id: string;
              date: string;
              type: 'credit' | 'debit';
              title: string;
              subtitle?: string;
              amount: number;
            }>;
            const mapped: LocalTransaction[] = cached.map((t) => ({
              id: t.id,
              date: t.date,
              type: t.type,
              title: t.title,
              subtitle: t.subtitle,
              amount: t.amount,
            }));
            setTransactions(mapped);
          } catch (e) {
            console.error('Failed to parse cached transactions:', e);
          }
        }
        
        // Check if user is authenticated before fetching fresh data
        let token = secureLocalStorage.getItem('authToken');
        
        // Fallback to old localStorage
        if (!token) {
          token = localStorage.getItem('authToken');
          if (token) {
            secureLocalStorage.setItem('authToken', token);
            localStorage.removeItem('authToken');
          }
        }
        
        if (!token) {
          // Silent fallback to cached data
          setLoading(false);
          return;
        }
        
        // Validate token expiration before making API call
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expirationTime = payload.exp * 1000;
          if (Date.now() >= expirationTime) {
            // Token expired - clear both storages
            secureLocalStorage.removeItem('authToken');
            secureLocalStorage.removeItem('authUser');
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            window.dispatchEvent(new CustomEvent('auth:token-expired'));
            window.dispatchEvent(new CustomEvent('auth:required'));
            setLoading(false);
            return;
          }
        } catch {
          // Invalid token format - clear both storages
          secureLocalStorage.removeItem('authToken');
          secureLocalStorage.removeItem('authUser');
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          window.dispatchEvent(new CustomEvent('auth:required'));
          setLoading(false);
          return;
        }
        
        // Fetch fresh data from backend (only if token is valid)
        const walletData = await api.wallet.getWalletData();
        // Wallet transactions-г LocalTransaction руу хөрвүүлэх
        const mapped: LocalTransaction[] = walletData.transactions.map((t) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          title: t.title,
          subtitle: t.subtitle,
          amount: t.amount,
        }));
        setTransactions(mapped);
        
        // Cache is already updated by wallet API call
      } catch (error) {
        // Check if it's an authentication error (silent fail)
        const isAuthError = error && typeof error === 'object' && 'isAuthError' in error;
        if (isAuthError ||
            (error instanceof Error && 
             (error.message.includes('401') || 
              error.message.includes('Authentication required') ||
              error.message.includes('Unauthorized')))) {
          // Silent fail - using cached data
          // Login modal will be shown by the API layer
        } else {
          // Only log non-auth errors
          console.error('Failed to load transactions:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, []);

  const filtered = useMemo(() => filterTransactions(transactions, filter), [transactions, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] shadow-sm dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:gap-4 border-b border-[var(--color-border-main)]/60 bg-white/80 px-4 md:px-6 py-4 md:py-5 dark:bg-slate-900/70 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-base md:text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Гүйлгээний түүх</h4>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-300 leading-relaxed mt-1">Хугацааны шүүлтүүр ашиглан орлого, зарлагын гүйлгээг шуурхай хянаарай.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-main)] bg-white/70 px-3 md:px-4 py-1.5 md:py-2 dark:bg-slate-900/70 text-slate-500 dark:text-slate-300">
              <CalendarRange className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="whitespace-nowrap">{filtered.length} гүйлгээ</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-main)] bg-white/70 px-3 md:px-4 py-1.5 md:py-2 dark:bg-slate-900/70 text-slate-500 dark:text-slate-300">
              <Filter className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="whitespace-nowrap">{filterOptions.find((opt) => opt.value === filter)?.label}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-main)]/60 px-4 md:px-6 py-3 md:py-4">
          {filterOptions.map((opt) => {
            const isActive = filter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`inline-flex items-center gap-2 rounded-full border border-[var(--color-border-main)] px-3 md:px-4 py-1.5 text-sm md:text-base font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-[var(--color-bg-main)] text-slate-600 hover:bg-blue-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                onClick={() => setFilter(opt.value as FilterType)}
              >
                {isActive ? <BadgeCheck className="w-4 h-4 flex-shrink-0" /> : <Filter className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                <span className="whitespace-nowrap">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full text-sm md:text-base">
            <thead className="bg-white/80 dark:bg-slate-900/80">
              <tr className="text-left uppercase tracking-wide text-slate-500 dark:text-slate-300 text-xs">
                <th className="px-4 md:px-6 py-2 md:py-3 font-medium">Огноо</th>
                <th className="px-4 md:px-6 py-2 md:py-3 font-medium">Төрөл</th>
                <th className="px-4 md:px-6 py-2 md:py-3 font-medium">Тайлбар</th>
                <th className="px-4 md:px-6 py-2 md:py-3 text-right font-medium">Дүн</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-main)]/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 md:px-6 py-8 md:py-10 text-center text-slate-400 text-sm md:text-base">
                    Сонгосон хугацаанд гүйлгээ байхгүй байна.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-blue-50/60 dark:hover:bg-slate-800/60">
                    <td className="px-4 md:px-6 py-3 text-[var(--color-text-main)] dark:text-white/90 text-sm md:text-base">
                      {new Date(t.date).toLocaleDateString('mn-MN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 md:px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 md:px-3 py-1 text-xs font-semibold ${
                          t.type === "credit"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-300"
                        }`}
                      >
                        {t.type === "credit" ? <ArrowUpRight className="w-4 h-4 flex-shrink-0" /> : <ArrowDownRight className="w-4 h-4 flex-shrink-0" />}
                        <span className="hidden md:inline">{t.type === "credit" ? "Орлого" : "Зарлага"}</span>
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 text-slate-600 dark:text-slate-300">
                      <div className="font-medium text-sm md:text-base">{t.title}</div>
                      {t.subtitle && <div className="text-slate-400 dark:text-slate-500 mt-0.5 text-xs">{t.subtitle}</div>}
                    </td>
                    <td
                      className={`px-4 md:px-6 py-3 text-right font-semibold text-sm md:text-base ${
                        t.type === "credit" ? "text-emerald-600 dark:text-emerald-300" : "text-rose-500 dark:text-rose-300"
                      }`}
                    >
                      {t.type === "credit" ? "+" : "-"}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Payments;
