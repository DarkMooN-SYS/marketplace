import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Product } from '../../api/adminApi';
import { AlertTriangle, Loader2, RefreshCcw } from 'lucide-react';

const formatter = new Intl.NumberFormat('mn-MN', {
  style: 'currency',
  currency: 'MNT',
  maximumFractionDigits: 0,
});

const statusLabelMap: Record<'pending' | 'approved' | 'rejected', string> = {
  pending: 'Хүлээгдэж байна',
  approved: 'Баталгаажсан',
  rejected: 'Татгалзсан',
};

export function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusClasses = (status: 'pending' | 'approved' | 'rejected') => {
    if (status === 'approved') {
      return 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-200';
    }
    if (status === 'pending') {
      return 'bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-200';
    }
    return 'bg-red-500/10 text-red-500 dark:bg-red-400/15 dark:text-red-200';
  };

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.products.getAll();
      setProducts(response.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Бараа татахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const approvedCount = useMemo(
    () => products.filter((product) => product.status === 'approved').length,
    [products],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
            Нийт {products.length} бараа · {approvedCount} баталгаажсан
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void fetchProducts();
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:border-white/15 dark:text-white"
        >
          <RefreshCcw className="h-4 w-4" /> Дахин ачаалах
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white/70 dark:border-white/15 dark:bg-white/5">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-border-main)]" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-600 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-200">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Өгөгдөл татахад алдаа гарлаа</p>
            <p>{error}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl border border-[var(--color-border-soft)] bg-white/85 p-4 shadow-sm dark:border-white/12 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-white/70 dark:border-white/15 dark:bg-white/10">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--color-text-main)]/60 dark:text-white/60">
                          No image
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-text-main)] dark:text-white">{product.name}</p>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--color-text-main)]/50 dark:text-white/50">#{product.id}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${getStatusClasses(product.status)}`}
                  >
                    {statusLabelMap[product.status]}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[var(--color-text-main)]/75 dark:text-white/70">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--color-text-main)] dark:text-white">Ангилал</span>
                    <span>{product.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--color-text-main)] dark:text-white">Үнэ</span>
                    <span>{formatter.format(product.price)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--color-text-main)] dark:text-white">Үлдэгдэл</span>
                    <span>{typeof product.stock === 'number' ? `${product.stock} ширхэг` : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--color-text-main)] dark:text-white">Нэмсэн огноо</span>
                    <span>
                      {new Date(product.createdAt).toLocaleDateString('mn-MN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border-soft)] bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5">
              <table className="min-w-[1024px] divide-y divide-[var(--color-border-soft)]/70 text-sm dark:divide-white/10">
                <thead className="bg-[var(--color-border-soft)]/20 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Бараа</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Ангилал</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Үнэ</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Үлдэгдэл</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Төлөв</th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-main)] dark:text-white">Нэмсэн хугацаа</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-soft)]/70 dark:divide-white/10">
                  {products.map((product) => (
                    <tr key={product.id} className="transition hover:bg-[var(--color-border-main)]/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-white/70 dark:border-white/15 dark:bg-white/10">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-text-main)]/60 dark:text-white/60">No image</div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--color-text-main)] dark:text-white">{product.name}</p>
                            <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/55">#{product.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-main)]/70 dark:text-white/60">{product.category}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--color-text-main)] dark:text-white">
                        {formatter.format(product.price)}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-main)]/80 dark:text-white/65">
                        {typeof product.stock === 'number' ? `${product.stock} ширхэг` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${getStatusClasses(product.status)}`}
                        >
                          {statusLabelMap[product.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-main)]/70 dark:text-white/60">
                        {new Date(product.createdAt).toLocaleString('mn-MN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
