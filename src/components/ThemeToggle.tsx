import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' }
  ];

  return (
    <div className="relative group">
      <button 
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border-soft)] bg-white/80 text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/70"
        aria-label="Theme"
      >
        {actualTheme === 'dark' ? <Moon className="h-[17px] w-[17px]" /> : <Sun className="h-[17px] w-[17px]" />}
      </button>
      
      <div className="absolute right-0 mt-2 w-36 bg-[var(--color-bg-main)] rounded-xl shadow-lg border border-[var(--color-border-soft)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {themeOptions.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
              theme === value 
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                : 'text-[var(--color-text-main)] hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}