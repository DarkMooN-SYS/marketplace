import React from 'react';
import { QrCode, ExternalLink, Loader2, X } from 'lucide-react';
import type { PaymentInvoice } from '../api/paymentApi';

interface PaymentQRProps {
  payment: PaymentInvoice;
  onClose: () => void;
}

const PaymentQR: React.FC<PaymentQRProps> = ({ payment, onClose }) => {
  const hasQRCode = payment.qrImage || payment.qrText;
  const hasDeepLink = payment.deeplink;
  const hasPaymentUrl = payment.paymentUrl;

  return (
    <div className="relative w-full max-w-md rounded-3xl border border-[var(--color-border-soft)] bg-white/95 p-6 shadow-2xl backdrop-blur dark:border-white/12 dark:bg-slate-900/95">
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Хаах"
        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border-soft)] text-[var(--color-text-main)]/70 transition hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:border-white/10 dark:text-white/70 dark:hover:border-white/40"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mb-3 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <QrCode className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-[var(--color-text-main)] dark:text-white">
          Төлбөр төлөх
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-main)]/70 dark:text-white/70">
          QR код уншуулах эсвэл линк дээр дарж төлбөр хийнэ үү
        </p>
      </div>

      {/* Amount display */}
      <div className="mb-6 rounded-2xl border border-[var(--color-border-soft)] bg-gradient-to-r from-blue-50 to-purple-50 p-4 text-center dark:border-white/10 dark:from-blue-900/20 dark:to-purple-900/20">
        <p className="text-sm font-medium text-[var(--color-text-main)]/60 dark:text-white/60">
          Төлөх дүн
        </p>
        <p className="mt-1 text-3xl font-bold text-[var(--color-text-main)] dark:text-white">
          {payment.amount.toLocaleString()} ₮
        </p>
      </div>

      {/* QR Code display */}
      {hasQRCode && (
        <div className="mb-6">
          {payment.qrImage ? (
            <div className="flex justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white p-4 dark:border-white/10 dark:bg-slate-800">
              <img
                src={payment.qrImage}
                alt="QR Code"
                className="h-64 w-64 object-contain"
              />
            </div>
          ) : payment.qrText ? (
            <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white p-4 text-center dark:border-white/10 dark:bg-slate-800">
              <p className="break-all font-mono text-xs text-[var(--color-text-main)] dark:text-white">
                {payment.qrText}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Payment links */}
      {(hasDeepLink || hasPaymentUrl) && (
        <div className="mb-6 space-y-3">
          {hasDeepLink && (
            <a
              href={payment.deeplink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/40 bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
            >
              <ExternalLink className="h-4 w-4" />
              Аппликэйшн дээр нээх
            </a>
          )}
          {hasPaymentUrl && (
            <a
              href={payment.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-text-main)] transition hover:border-[var(--color-border-main)] hover:bg-white/80 dark:border-white/12 dark:bg-slate-800 dark:text-white dark:hover:border-white/40"
            >
              <ExternalLink className="h-4 w-4" />
              Вэб дээр төлөх
            </a>
          )}
        </div>
      )}

      {/* Status indicator */}
      <div className="rounded-2xl border border-blue-500/25 bg-blue-50 p-4 dark:border-blue-400/30 dark:bg-blue-900/20">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Төлбөрийг хүлээж байна...
            </p>
            <p className="mt-1 text-xs text-blue-600/70 dark:text-blue-400/70">
              Төлбөр хийсний дараа автоматаар баталгаажих болно
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-[var(--color-text-main)]/50 dark:text-white/50">
          Төлбөр: {payment.provider.toUpperCase()}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-main)]/50 dark:text-white/50">
          Төлбөрийн дугаар: {payment.invoiceId}
        </p>
      </div>
    </div>
  );
};

export default PaymentQR;
