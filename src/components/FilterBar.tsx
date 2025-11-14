import { Filter, X } from 'lucide-react';

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface FilterBarProps {
  filters: FilterOption[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
}

export default function FilterBar({ filters, activeFilters, onFilterChange, onClearAll }: FilterBarProps) {
  const hasActiveFilters = Object.values(activeFilters).some((value) => value !== '');

  return (
    <section className="rounded-3xl notebook:rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-5 shadow-sm transition-colors dark:bg-slate-900">
      <div className="flex flex-col gap-4 mobile:flex-row mobile:items-center mobile:justify-between">
        <div className="flex items-center gap-2 text-[var(--color-text-main)] dark:text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-300">
            <Filter className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold">Шүүлтүүрүүд</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ангилал, үргэлжлэх хугацаа, шагналаар нарийвчилна уу.</p>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 self-start rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-400/40 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <X className="h-4 w-4" />
            Бүгдийг арилгах
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 mobile:grid-cols-2 notebook:grid-cols-4">
        {filters.map((filter) => (
          <label key={filter.key} className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
              {filter.label}
            </span>
            <select
              value={activeFilters[filter.key] || ''}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
              className="w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-4 py-3 text-sm font-medium text-[var(--color-text-main)] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white"
            >
              <option value="">Бүх сонголт</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}