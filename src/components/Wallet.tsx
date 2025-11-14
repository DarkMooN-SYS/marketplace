import React, { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  PiggyBank,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export interface WalletTransaction {
  id: string;
  type: 'debit' | 'credit';
  title: string;
  subtitle?: string;
  amount: number;
  date: string;
}

interface WalletProps {
  balance: number;
  transactions: WalletTransaction[];
  onTopUp: () => void;
  onWithdraw?: () => void;
  onBack?: () => void;
}

const currencyFormatter = new Intl.NumberFormat('mn-MN', {
  minimumFractionDigits: 0,
});

const formatCurrency = (value: number) => `${currencyFormatter.format(Math.abs(value))} ₮`;

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('mn-MN', {
    month: 'long',
    day: 'numeric',
  });
};

const typeMeta: Record<WalletTransaction['type'], { label: string; icon: LucideIcon; badgeClass: string; amountClass: string }> = {
  credit: {
    label: 'Орлого',
    icon: ArrowDownLeft,
    badgeClass:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200',
    amountClass: 'text-emerald-500 dark:text-emerald-200',
  },
  debit: {
    label: 'Зардал',
    icon: ArrowUpRight,
    badgeClass:
      'border-rose-500/30 bg-rose-500/10 text-rose-500 dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-200',
    amountClass: 'text-rose-500 dark:text-rose-200',
  },
};

const filterOptions: { label: string; value: 'all' | 'credit' | 'debit' }[] = [
  { label: 'Бүгд', value: 'all' },
  { label: 'Орлого', value: 'credit' },
  { label: 'Зардал', value: 'debit' },
];

const Wallet: React.FC<WalletProps> = ({ balance, transactions, onTopUp, onWithdraw, onBack }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'credit' | 'debit'>('all');

  const { income, expense, transactionCount } = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (tx.type === 'credit') {
          acc.income += tx.amount;
        } else {
          acc.expense += tx.amount;
        }
        acc.transactionCount += 1;
        return acc;
      },
      { income: 0, expense: 0, transactionCount: 0 }
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'all') {
      return transactions;
    }
    return transactions.filter((tx) => tx.type === activeFilter);
  }, [transactions, activeFilter]);

  const balanceIsPositive = balance >= 0;
  const balanceTone = balanceIsPositive
    ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-200 dark:bg-emerald-500/20 dark:border-emerald-400/40'
    : 'text-rose-500 bg-rose-500/10 border-rose-500/20 dark:text-rose-200 dark:bg-rose-500/20 dark:border-rose-400/40';

  return (
  <div className="mx-auto w-full max-w-2xl space-y-5 sm:space-y-6 max-h-[80vh] overflow-y-auto">
      <section className="rounded-3xl border border-[var(--color-border-soft)] bg-white/80 p-5 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/25 sm:p-6">
        <div className="flex flex-col gap-5 sm:gap-6">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-[var(--color-border-soft)] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:bg-white/80 dark:border-white/12 dark:bg-slate-900/50 dark:text-white/70 dark:hover:border-blue-400/40 dark:hover:bg-slate-900/60"
            >
              <ArrowLeft className="h-4 w-4" />
              Буцах
            </button>
          )}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/70 dark:border-white/12 dark:bg-slate-900/60 dark:text-white/60">
                <Clock className="h-3.5 w-3.5" />
                Хэтэвчийн тойм
              </div>
              <div>
                <p className="text-[13px] font-medium text-[var(--color-text-main)]/70 dark:text-white/70">Таны үлдэгдэл</p>
                <div className="mt-1 flex flex-wrap items-end gap-3">
                  <span className="text-2xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-3xl">
                    {currencyFormatter.format(balance)} ₮
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-2xl border px-2.5 py-1 text-[11px] font-semibold ${balanceTone}`}>
                    {balanceIsPositive ? 'Тэнцвэртэй' : 'Өртэй'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onTopUp}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <CreditCard className="h-4 w-4" />
                  Цэнэглэх
                </button>
                {onWithdraw && (
                  <button
                    type="button"
                    onClick={onWithdraw}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Татах
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[var(--color-text-main)]/60 dark:text-white/50">Сүүлийн шинэчлэл: {new Date().toLocaleDateString('mn-MN')}</p>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/80 p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-main)]/60 dark:text-white/55">Орлого</p>
                  <p className="text-[13px] font-semibold text-[var(--color-text-main)] dark:text-white">{formatCurrency(income)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/80 p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                  <TrendingDown className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-main)]/60 dark:text-white/55">Зардал</p>
                  <p className="text-[13px] font-semibold text-[var(--color-text-main)] dark:text-white">{formatCurrency(expense)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/80 p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                  <PiggyBank className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-main)]/60 dark:text-white/55">Гүйлгээ</p>
                  <p className="text-[13px] font-semibold text-[var(--color-text-main)] dark:text-white">{transactionCount} удаа</p>
                </div>
              </div>
            </div>
          </div>

          {transactions.length > 0 && (
            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/70 p-3.5 dark:border-white/10 dark:bg-slate-900/50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setActiveFilter(option.value)}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs font-semibold transition ${
                        activeFilter === option.value
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:border-blue-400/40 dark:bg-blue-500/20 dark:text-blue-200'
                          : 'border-[var(--color-border-soft)] bg-white/80 text-[var(--color-text-main)]/70 hover:border-[var(--color-border-main)]/60 dark:border-white/12 dark:bg-slate-900/40 dark:text-white/70 dark:hover:border-blue-400/40'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-text-main)]/50 dark:text-white/45">
                  Сүүлийн {filteredTransactions.length} гүйлгээ
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--color-border-soft)] bg-white/80 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/25">
        <header className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-3.5 dark:border-white/10 sm:px-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/70 dark:text-white/65">Гүйлгээний түүх</h2>
          <span className="text-[11px] text-[var(--color-text-main)]/60 dark:text-white/50">Бодит цагийн шинэчлэл</span>
        </header>

  <div className="max-h-[400px] overflow-y-auto divide-y divide-[var(--color-border-soft)]/70 dark:divide-white/10">
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center sm:px-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-dashed border-[var(--color-border-soft)] bg-white/70 text-[var(--color-text-main)]/40 dark:border-white/15 dark:bg-slate-900/50 dark:text-white/50">
                <ArrowDownLeft className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-[var(--color-text-main)] dark:text-white">Одоогоор гүйлгээ байхгүй байна</p>
                <p className="text-sm text-[var(--color-text-main)]/60 dark:text-white/60">Анхны гүйлгээгээ үүсгэхийн тулд цэнэглэх товчийг дарна уу.</p>
              </div>
              <button
                type="button"
                onClick={onTopUp}
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:border-blue-500/40 hover:bg-blue-500/15 dark:border-blue-400/30 dark:bg-blue-500/20 dark:text-blue-200 dark:hover:border-blue-300/50 dark:hover:bg-blue-500/25"
              >
                <CreditCard className="h-4 w-4" />
                Цэнэглэлтийн төв рүү
              </button>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const meta = typeMeta[tx.type];
              const Icon = meta.icon;
              return (
                <article
                  key={tx.id}
                  className="flex flex-col gap-3.5 px-5 py-4 transition hover:bg-blue-500/5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border bg-white/80 text-sm font-semibold shadow-sm dark:border-white/12 dark:bg-slate-900/50 ${meta.badgeClass}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[13px] font-semibold text-[var(--color-text-main)] dark:text-white sm:text-sm">{tx.title}</h3>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.25em] ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </div>
                      {tx.subtitle && (
                        <p className="text-[11px] text-[var(--color-text-main)]/60 dark:text-white/60">{tx.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <span className={`text-sm font-semibold sm:text-[15px] ${meta.amountClass}`}>
                      {tx.type === 'credit' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                    <time className="text-[11px] text-[var(--color-text-main)]/50 dark:text-white/50" dateTime={tx.date}>
                      {formatDate(tx.date)}
                    </time>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default Wallet;
