import React, { useEffect, useState } from 'react';
import { Building2, ChevronRight, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { bankApi, type Bank } from '../api/bankApi';

// Fallback banks if database is empty
const FALLBACK_BANKS: Bank[] = [
  {
    id: 'golomt',
    name: 'Golomt Bank',
    short: 'GLT',
    description: 'Голомт Банкны E-Commerce төлбөр',
    gradient: 'from-blue-600 to-blue-700',
    isActive: true,
    order: 1
  },
  {
    id: 'qpay',
    name: 'QPay',
    short: 'QPAY',
    description: 'QPay дижитал хэтэвч',
    gradient: 'from-purple-600 to-purple-700',
    isActive: true,
    order: 2
  },
  {
    id: 'socialpay',
    name: 'SocialPay',
    short: 'SPY',
    description: 'SocialPay төлбөрийн систем',
    gradient: 'from-green-600 to-green-700',
    isActive: true,
    order: 3
  }
];

const BankSelect: React.FC<{ onSelect: (bank: string) => void }> = ({ onSelect }) => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[BankSelect] Loading banks from database...');
        
        const data = await bankApi.getAll();
        console.log(`[BankSelect] Loaded ${data.length} banks from database`);
        
        if (data.length === 0) {
          console.log('[BankSelect] No banks in database, using fallback banks');
          setBanks(FALLBACK_BANKS);
        } else {
          setBanks(data);
        }
      } catch (err) {
        console.error('[BankSelect] Failed to load banks:', err);
        console.log('[BankSelect] Using fallback banks due to error');
        setBanks(FALLBACK_BANKS);
        setError(null); // Clear error since we have fallback
      } finally {
        setLoading(false);
      }
    };

    loadBanks();
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <section className="rounded-3xl border border-[var(--color-border-soft)] bg-white/80 px-6 py-5 shadow-lg shadow-black/5 backdrop-blur dark:border-white/12 dark:bg-slate-900/70 dark:shadow-black/25 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white sm:text-2xl">Банк сонгох</h2>
            <p className="text-sm text-[var(--color-text-main)]/70 dark:text-white/65">
              QPay-ээр төлбөр хийхийн тулд харилцдаг банк эсвэл дижитал хэтэвчээ сонгоно уу.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Найдвартай баталгаажуулалт
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--color-border-soft)] bg-white/85 p-6 shadow-xl shadow-black/8 backdrop-blur dark:border-white/12 dark:bg-slate-900/70 dark:shadow-black/20 sm:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-[var(--color-border-main)] dark:text-white/70" />
            <p className="mt-4 text-sm font-medium text-[var(--color-text-main)]/70 dark:text-white/70">
              Банкны мэдээлэл татаж байна...
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-main)]/50 dark:text-white/50">
              Түр хүлээнэ үү
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-red-700 dark:text-red-300">
              Алдаа гарлаа
            </h3>
            <p className="mb-4 text-sm text-red-600/80 dark:text-red-400/80">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-500/20 dark:text-red-300"
            >
              <Loader2 className="h-4 w-4" />
              Дахин оролдох
            </button>
          </div>
        ) : banks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white/50 p-12 text-center dark:border-white/10 dark:bg-slate-900/30">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-border-soft)]/20">
              <Building2 className="h-8 w-8 text-[var(--color-text-main)]/40 dark:text-white/40" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-[var(--color-text-main)] dark:text-white">
              Банк байхгүй байна
            </h3>
            <p className="text-sm text-[var(--color-text-main)]/60 dark:text-white/60">
              Одоогоор банкны мэдээлэл байхгүй байна.
            </p>
          </div>
        ) : null}

        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${loading || error || banks.length === 0 ? 'hidden' : ''}`}>
          {banks.map((bank) => (
            <button
              key={bank.id}
              type="button"
              onClick={() => onSelect(bank.name)}
              className="group flex h-full flex-col justify-between gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-white/80 p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-border-main)] hover:bg-white hover:shadow-xl dark:border-white/12 dark:bg-slate-900/60 dark:hover:border-white/40 dark:hover:bg-slate-900/70"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${bank.gradient} px-3 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-md shadow-black/10`}>
                  {bank.short}
                </span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white/70 text-[var(--color-text-main)]/50 transition group-hover:border-[var(--color-border-main)] group-hover:text-[var(--color-border-main)] dark:border-white/12 dark:bg-slate-900/55 dark:text-white/40 dark:group-hover:border-white/40 dark:group-hover:text-white/70">
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--color-border-main)] dark:text-white/70" />
                  <h3 className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">
                    {bank.name}
                  </h3>
                </div>
                <p className="text-xs leading-relaxed text-[var(--color-text-main)]/65 dark:text-white/60">
                  {bank.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default BankSelect;
