import React, { useMemo, useState } from 'react';
import { CreditCard, ShieldCheck, Smartphone, X } from 'lucide-react';
import qpayLogo from '../img/Qpay.png';

const presetAmounts = [9900, 19900, 29900, 49900];

const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const highlights = [
  { icon: ShieldCheck, label: '0% шимтгэл' },
  { icon: Smartphone, label: 'Шуурхай баталгаажуулалт' },
];

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const TopUp: React.FC<{ onContinue: (amount: number) => void }> = ({ onContinue }) => {
  const [amount, setAmount] = useState(0);

  const formattedAmount = useMemo(() => (amount === 0 ? '' : amount.toLocaleString()), [amount]);

  const handlePress = (value: string) => {
    if (value === 'del') {
      setAmount((prev) => Number(prev.toString().slice(0, -1)) || 0);
      return;
    }
    setAmount((prev) => Number(`${prev === 0 ? '' : prev}${value}`));
  };

  const handlePreset = (value: number) => {
    setAmount(value);
  };

  const handleSubmit = () => {
    onContinue(amount);
  };

  const handleClose = () => {
    onContinue(0);
  };

  const renderCard = (showClose: boolean) => (
    <div className="relative flex w-full max-w-md flex-col gap-4 rounded-[24px] border border-[var(--color-border-soft)] bg-white/85 p-4 shadow-2xl shadow-black/10 backdrop-blur dark:border-white/12 dark:bg-slate-900/75 dark:shadow-black/30 sm:p-5">
      {showClose && (
        <button
          type="button"
          onClick={handleClose}
          aria-label="Хаах"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-soft)] text-[var(--color-text-main)]/70 transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:border-white/10 dark:text-white/70 dark:hover:border-white/40"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white/70 p-2 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
            <img src={qpayLogo} alt="QPay" className="h-full w-full object-contain" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/55">
              Төлбөрийн үйлчилгээ
            </span>
            <h2 className="text-[17px] font-semibold text-[var(--color-text-main)] dark:text-white">QPay</h2>
            <p className="text-xs text-[var(--color-text-main)]/65 dark:text-white/60">
              Монголын тэргүүлэх олон сувагтай цахим төлбөрийн платформ.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200">
            <ShieldCheck className="h-2.5 w-2.5" />
            Найдвартай холболт
          </div>
          <p className="text-[9.5px] text-[var(--color-text-main)]/55 dark:text-white/45">
            Төлбөрийн төвтэй шууд холбогдож баталгаажуулна.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-[var(--color-border-soft)] bg-white/80 p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-900/55">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/55">
          Төлөх дүн
        </label>
        <input
          type="text"
          readOnly
          value={formattedAmount}
          placeholder="0"
          className="mt-2 w-full rounded-[18px] border border-[var(--color-border-soft)] bg-white/90 px-3.5 py-2.5 text-center text-[26px] font-semibold tracking-tight text-[var(--color-text-main)] shadow-inner focus:outline-none dark:border-white/15 dark:bg-slate-900/70 dark:text-white"
        />
        <p className="mt-2 text-center text-xs text-[var(--color-text-main)]/60 dark:text-white/50">
          Дүнг голомтот төгрөгөөр оруулна. Та саналаас сонгох эсвэл тоон товч ашиглаж оруулж болно.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/55 dark:text-white/45">
            Санал болгох дүн
          </span>
          <span className="text-[11px] text-[var(--color-text-main)]/50 dark:text-white/45">1 товшилтоор сонго</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {presetAmounts.map((value) => {
            const isActive = amount === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handlePreset(value)}
                className={`group flex flex-col items-start rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-150 ${
                  isActive
                    ? 'border-blue-500/60 bg-blue-500/15 text-blue-600 shadow-lg shadow-blue-500/10 dark:border-blue-300/60 dark:bg-blue-500/25 dark:text-blue-100'
                    : 'border-[var(--color-border-soft)] bg-white/80 text-[var(--color-text-main)]/80 hover:-translate-y-1 hover:border-[var(--color-border-main)] hover:bg-white dark:border-white/12 dark:bg-slate-900/55 dark:text-white/70'
                }`}
              >
                <span className="text-[13px] font-semibold">{value.toLocaleString()} ₮</span>
                <span className="text-[10px] text-[var(--color-text-main)]/50 dark:text-white/45">Стандарт дүн</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/55 dark:text-white/45">
          Товчлуур
        </span>
        <div className="grid grid-cols-3 gap-2.5">
          {keypadDigits.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handlePress(value)}
              className="rounded-2xl border border-[var(--color-border-soft)] bg-white/90 py-3.5 text-lg font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:shadow-lg dark:border-white/12 dark:bg-slate-900/60 dark:text-white"
            >
              {value}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handlePress('del')}
            className="rounded-2xl border border-rose-400/30 bg-rose-500/10 py-3.5 text-lg font-semibold text-rose-500 transition hover:-translate-y-0.5 hover:border-rose-400/50 hover:bg-rose-500/15 dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-200"
          >
            Арилгах
          </button>
          <button
            type="button"
            onClick={() => handlePress('0')}
            className="col-span-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/90 py-3.5 text-lg font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:shadow-lg dark:border-white/12 dark:bg-slate-900/60 dark:text-white"
          >
            0
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-3.5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={amount === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-2.5 text-[15px] font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CreditCard className="h-4 w-4" />
          Үргэлжлүүлэх
        </button>
        <p className="text-center text-[11px] text-[var(--color-text-main)]/55 dark:text-white/45">
          Үргэлжлүүлэх товчийг дарснаар QPay үйлчилгээний нөхцөлийг зөвшөөрсөнд тооцно.
        </p>
      </div>

      <footer className="grid grid-cols-1 gap-1.5 text-[10px] sm:grid-cols-2">
        {highlights.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-2.5 py-1.5 text-[var(--color-text-main)]/70 dark:border-white/12 dark:bg-slate-900/55 dark:text-white/60"
          >
            <Icon className="h-3 w-3" />
            {label}
          </div>
        ))}
      </footer>
    </div>
  );

  const isMobileDevice = isMobile();

  if (isMobileDevice) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 p-4">
        {renderCard(false)}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      {renderCard(true)}
    </div>
  );
};

export default TopUp;
