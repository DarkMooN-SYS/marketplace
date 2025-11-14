import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Banknote, ShieldCheck, Wallet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface WithdrawProps {
  balance: number;
  onClose: () => void;
  onSubmit: (payload: { amount: number; bank: string; account: string }) => Promise<void> | void;
}

const banks = ['ХААН Банк', 'TDB Online', 'Social Pay', 'Төрийн банк 3.0', 'ХасБанк', 'Капитрон Банк', 'Богд Банк'];
const MIN_WITHDRAW = 1000; // Доод дүн
const FEE = 0; // Ирээдүйд шимтгэл нэмэх бол энд тохируулна

const Withdraw: React.FC<WithdrawProps> = ({ balance, onClose, onSubmit }) => {
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [amount, setAmount] = useState<number>(0);
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);

  // Computed validation messages
  const amountError = (() => {
    if (amount === 0) return null;
    if (amount < MIN_WITHDRAW) return `Доод дүн ${MIN_WITHDRAW.toLocaleString()} ₮.`;
    if (amount > balance) return 'Үлдэгдлээс их дүн байна.';
    if (!Number.isInteger(amount)) return 'Бүтэн төгрөгөөр оруулна уу.';
    return null;
  })();

  const accountError = account && account.length < 6 ? 'Дансны дугаар дутуу.' : null;

  const canSubmit = amount > 0 && !amountError && bank && !accountError && account.length >= 6 && amount <= balance;

  const remaining = balance - amount - FEE;
  const isBusy = step === 'processing';

  const clampAndSetAmount = (raw: string) => {
    const numeric = Number(raw);
    if (Number.isNaN(numeric)) {
      setAmount(0);
      return;
    }
    if (numeric > balance) {
      setAmount(balance);
    } else {
      setAmount(numeric);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Мэдээллээ бүрэн зөв оруулна уу.');
      return;
    }
    setError(null);
    setStep('processing');
    try {
      await onSubmit({ amount, bank, account });
      setStep('success');
      setTimeout(() => onClose(), 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Алдаа гарлаа.');
      setStep('error');
    }
  };

  // ESC хаах (form эсвэл success/error үед зөвшөөрөх, processing үед blocking)
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && step !== 'processing') {
      onClose();
    }
  }, [onClose, step]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent =
        step === 'processing'
          ? 'Таталтын хүсэлт боловсруулж байна'
          : step === 'success'
            ? 'Таталтын хүсэлт амжилттай'
            : step === 'error'
              ? 'Алдаа гарлаа'
              : '';
    }
  }, [step]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-[var(--color-border-soft)] bg-white/90 p-6 shadow-2xl backdrop-blur dark:border-white/12 dark:bg-slate-900/80">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white/70 text-[var(--color-text-main)]/70 transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:border-white/10 dark:bg-slate-900/60 dark:text-white/60 dark:hover:border-white/40 dark:hover:text-white"
          aria-label="Буцах"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {step === 'form' && (
          <div className="space-y-6 pt-4">
            <header className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-600 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-200">
                <Wallet className="h-3.5 w-3.5" />
                Таталт
              </span>
              <h1 className="text-2xl font-semibold text-[var(--color-text-main)] dark:text-white">Хэтэвчээс татах</h1>
              <p className="text-sm text-[var(--color-text-main)]/65 dark:text-white/60">Татах дүн, банк болон дансны дугаараа оруулна уу.</p>
            </header>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-text-main)]/60 dark:text-white/55">Татах дүн (₮)</label>
                <input
                  type="number"
                  min={0}
                  max={balance}
                  value={amount === 0 ? '' : amount}
                  onChange={(e) => clampAndSetAmount(e.target.value)}
                  placeholder="0"
                  disabled={isBusy}
                  className="w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/85 px-4 py-3 text-lg font-semibold text-[var(--color-text-main)] shadow-inner transition focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-900/70 dark:text-white"
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] text-[var(--color-text-main)]/50 dark:text-white/45">Боломжит дүн: {balance.toLocaleString()} ₮ · Доод дүн: {MIN_WITHDRAW.toLocaleString()} ₮</p>
                  {amount > 0 && !amountError && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-300">Үлдэх дүн: {remaining.toLocaleString()} ₮ (Шимтгэл: {FEE} ₮)</p>
                  )}
                  {amountError && (
                    <p className="text-[11px] text-red-500">{amountError}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-text-main)]/60 dark:text-white/55">Банк</label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  disabled={isBusy}
                  className="w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-3 text-sm font-medium text-[var(--color-text-main)] transition focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-900/70 dark:text-white"
                >
                  <option value="">Банк сонгох</option>
                  {banks.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-text-main)]/60 dark:text-white/55">Дансны дугаар</label>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Жишээ: 5012345678"
                  disabled={isBusy}
                  className="w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-3 text-sm font-medium tracking-wider text-[var(--color-text-main)] transition focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-slate-900/70 dark:text-white"
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] text-[var(--color-text-main)]/50 dark:text-white/45">Тоон тэмдэгт, дор хаяж 6 оронтой.</p>
                  {accountError && <p className="text-[11px] text-red-500">{accountError}</p>}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-600 dark:border-red-400/30 dark:bg-red-500/20 dark:text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={!canSubmit || isBusy}
                onClick={handleSubmit}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Banknote className="h-4 w-4" />
                )}
                {isBusy ? 'Илгээж байна...' : 'Татах хүсэлт илгээх'}
              </button>
              <p className="text-center text-[10px] text-[var(--color-text-main)]/55 dark:text-white/45">Таны дансны нэр хэтэвчийн бүртгэлтэй тохирох ёстой.</p>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center gap-5 py-16">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            <p className="text-sm font-medium text-[var(--color-text-main)] dark:text-white">Таны таталтын хүсэлтийг баталгаажуулж байна...</p>
            <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/55">Ихэнхдээ 30 сек дотор баталгаажина.</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white">Амжилттай илгээгдлээ</h2>
              <p className="text-sm text-[var(--color-text-main)]/65 dark:text-white/60">{bank} банк руу {amount.toLocaleString()} ₮ татах хүсэлт хүлээн авлаа.</p>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
            <AlertCircle className="h-14 w-14 text-red-500" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white">Алдаа гарлаа</h2>
              <p className="text-sm text-[var(--color-text-main)]/65 dark:text-white/60">Дахин оролдоно уу. Систем түр хугацаанд ачаалалтай байна.</p>
            </div>
            <button
              onClick={() => setStep('form')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-2 text-sm font-semibold text-amber-600 transition hover:-translate-y-0.5 hover:bg-amber-500/15 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-200"
            >
              Дахин оролдох
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-[var(--color-border-soft)] bg-white/70 px-4 py-2 text-[10px] font-medium text-[var(--color-text-main)]/60 dark:border-white/12 dark:bg-slate-900/50 dark:text-white/50">
          <div className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Аюулгүй ажиллагаа: Шимтгэлгүй, 24/7 хяналт
          </div>
          <span className="font-semibold tracking-wide text-[var(--color-text-main)]/80 dark:text-white/70">Secure</span>
        </div>
        <div ref={liveRef} aria-live="polite" className="sr-only" />
      </div>
    </div>
  );
};

export default Withdraw;
