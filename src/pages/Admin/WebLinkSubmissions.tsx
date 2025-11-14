import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { ExternalLink, ImageOff, Link2, PlusCircle, Trash2 } from 'lucide-react';
import { api } from '../../api/adminApi';

interface LinkFormState {
  title: string;
  description: string;
  url: string;
  category: string;
  logo: string;
  isOfficial: boolean;
  featured: boolean;
}

const LINK_CATEGORIES = ['Development', 'Design', 'Learning', 'Productivity', 'Tools'];
const MAX_FEATURED_PER_CATEGORY = 3;
const IMAGE_EXTENSION_REGEX = /(\.)(png|jpe?g|gif|svg|webp|avif)$/i;

type ValidationErrors = {
  title?: string;
  description?: string;
  url?: string;
  logo?: string;
  featured?: string;
};

const initialFormState: LinkFormState = {
  title: '',
  description: '',
  url: '',
  category: LINK_CATEGORIES[0],
  logo: '',
  isOfficial: false,
  featured: false,
};

type WebLink = {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  logo?: string;
  isOfficial: boolean;
  featured?: boolean;
  votes: number;
  dateAdded?: string | Date;
  status?: string;
};

export function WebLinkSubmissionsPage() {
  const [form, setForm] = useState<LinkFormState>(initialFormState);
  const [entries, setEntries] = useState<WebLink[]>([]);
  const [status, setStatus] = useState<'idle' | 'creating' | 'loading'>('loading');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Load weblinks on mount
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        setStatus('loading');
        const response = await api.weblinks.getAll();
        setEntries(response.weblinks || []);
      } catch (err) {
        console.error('Failed to fetch weblinks:', err);
      } finally {
        setStatus('idle');
      }
    };
    fetchLinks();
  }, []);

  const votesTotal = useMemo(() => entries.reduce((sum, link) => sum + link.votes, 0), [entries]);
  const titleLength = form.title.trim().length;
  const descriptionLength = form.description.trim().length;

  const normalizeUrl = (value: string) => value.trim().replace(/\/+$/, '').toLowerCase();

  const computeErrors = (state: LinkFormState, existingEntries: WebLink[]): ValidationErrors => {
    const nextErrors: ValidationErrors = {};

    const titleSize = state.title.trim().length;
    if (titleSize === 0) {
      nextErrors.title = 'Гарчиг заавал бөглөгдөнө.';
    } else if (titleSize < 5) {
      nextErrors.title = 'Гарчиг хамгийн багадаа 5 тэмдэгттэй байх ёстой.';
    } else if (titleSize > 100) {
      nextErrors.title = 'Гарчиг 100 тэмдэгтээс хэтрэхгүй байх ёстой.';
    }

    const descriptionSize = state.description.trim().length;
    if (descriptionSize === 0) {
      nextErrors.description = 'Тайлбар 20-200 тэмдэгтийн хооронд байх шаардлагатай.';
    } else if (descriptionSize < 20) {
      nextErrors.description = 'Тайлбар хамгийн багадаа 20 тэмдэгттэй байх ёстой.';
    } else if (descriptionSize > 200) {
      nextErrors.description = 'Тайлбар 200 тэмдэгтээс хэтрэхгүй байх ёстой.';
    }

    const rawUrl = state.url.trim();
    if (rawUrl.length === 0) {
      nextErrors.url = 'URL заавал бөглөгдөнө.';
    } else if (!/^https?:\/\//i.test(rawUrl)) {
      nextErrors.url = 'URL нь https:// эсвэл http://-оор эхлэх ёстой.';
    } else {
      try {
        const parsed = new URL(rawUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          nextErrors.url = 'URL зөвхөн http эсвэл https протоколтой байх ёстой.';
        } else if (!parsed.hostname.includes('.')) {
          nextErrors.url = 'Бүрэн домэйн нэр бүхий URL оруулна уу.';
        }
      } catch {
        nextErrors.url = 'URL буруу форматтай байна.';
      }
    }

    if (!nextErrors.url) {
      const normalized = normalizeUrl(rawUrl);
      const hasDuplicate = existingEntries.some((entry) => normalizeUrl(entry.url) === normalized);
      if (hasDuplicate) {
        nextErrors.url = 'Энэ холбоос аль хэдийн бүртгэгдсэн байна.';
      }
    }

    const logoValue = state.logo.trim();
    if (logoValue.length > 0) {
      if (!/^https?:\/\//i.test(logoValue)) {
        nextErrors.logo = 'Логоны линк https:// эсвэл http://-оор эхлэх ёстой.';
      } else {
        const cleanLogo = logoValue.split('?')[0].split('#')[0];
        if (!IMAGE_EXTENSION_REGEX.test(cleanLogo)) {
          nextErrors.logo = 'Лого нь зөвхөн зураг өргөтгөлтэй (.png, .jpg, .svg, .webp, .gif, .avif) байх ёстой.';
        }
      }
    }

    if (state.featured) {
      const currentFeaturedCount = existingEntries.filter(
        (entry) => entry.category === state.category && entry.featured
      ).length;
      if (currentFeaturedCount >= MAX_FEATURED_PER_CATEGORY) {
        nextErrors.featured = `${state.category} ангилалд хамгийн ихдээ ${MAX_FEATURED_PER_CATEGORY} онцлох холбоос оруулах боломжтой.`;
      }
    }

    return nextErrors;
  };

  const updateForm = (updater: (prev: LinkFormState) => LinkFormState) => {
    setForm((prev) => {
      const next = updater(prev);
      setErrors(computeErrors(next, entries));
      return next;
    });
  };

  const displayErrors: ValidationErrors = {
    title: errors.title && (attemptedSubmit || titleLength > 0) ? errors.title : undefined,
    description: errors.description && (attemptedSubmit || descriptionLength > 0) ? errors.description : undefined,
    url: errors.url && (attemptedSubmit || form.url.trim().length > 0) ? errors.url : undefined,
    logo: errors.logo && (attemptedSubmit || form.logo.trim().length > 0) ? errors.logo : undefined,
    featured: errors.featured && attemptedSubmit ? errors.featured : undefined,
  };

  const isPreviewLogoValid = form.logo.trim().length > 0 && !errors.logo;
  const previewLogo = isPreviewLogoValid ? form.logo.trim() : undefined;
  const previewTitle = form.title.trim().length > 0 ? form.title.trim() : 'Жишээ холбоосын гарчиг';
  const previewDescription = form.description.trim().length > 0 ? form.description.trim() : 'Тайлбар энд харагдана. 20-200 тэмдэгтийн хооронд бичиж, хэрэглэгчдэд мэдээлэл өгнө.';
  const previewUrl = form.url.trim().length > 0 ? form.url.trim() : 'https://example.com/preview';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttemptedSubmit(true);

    const validation = computeErrors(form, entries);
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      return;
    }
    setStatus('creating');
    try {
      const trimmedTitle = form.title.trim();
      const trimmedDescription = form.description.trim();
      const trimmedUrl = form.url.trim();
      const trimmedLogo = form.logo.trim();

      await api.weblinks.submit({
        title: trimmedTitle,
        description: trimmedDescription,
        url: trimmedUrl,
        category: form.category,
        logo: trimmedLogo || undefined,
        isOfficial: form.isOfficial,
        featured: form.featured || false,
        votes: 0,
      });

      // Refresh the list
      const response = await api.weblinks.getAll();
      setEntries(response.weblinks || []);
      
      setForm(initialFormState);
      setErrors(computeErrors(initialFormState, response.weblinks || []));
      setAttemptedSubmit(false);
    } catch (err) {
      console.error('Failed to create weblink:', err);
    } finally {
      setStatus('idle');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      // For now, just remove from local state
      // TODO: Add backend DELETE endpoint or update status to 'rejected'
      const next = entries.filter((item) => item.id !== id);
      setEntries(next);
      setErrors(computeErrors(form, next));
      
      console.warn('Weblink removed from UI only. Backend delete not implemented yet.');
    } catch (err) {
      console.error('Failed to delete weblink:', err);
    }
  };

  return (
    <div className="flex flex-col gap-[var(--section-gap)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-[var(--card-gap)] rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-white/80 p-[var(--card-padding)] shadow-sm transition-all dark:border-white/12 dark:bg-white/5"
      >
        <header className="flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
            <Link2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Вэб холбоос нэмэх</h3>
            <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
              Админаас нэмсэн холбоос Web Links хуудасны эхэнд харагдана.
            </p>
          </div>
        </header>

        <div className="space-y-[var(--card-gap)]">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
              <label htmlFor="admin-link-title">Гарчиг</label>
              <span className="text-[11px] normal-case tracking-normal text-[var(--color-text-main)]/50 dark:text-white/50">{titleLength}/100</span>
            </div>
            <input
              id="admin-link-title"
              type="text"
              value={form.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateForm((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              placeholder="Жишээ: Notion Resource Hub"
              required
            />
            {displayErrors.title && (
              <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.title}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
              <label htmlFor="admin-link-description">Тайлбар</label>
              <span className="text-[11px] normal-case tracking-normal text-[var(--color-text-main)]/50 dark:text-white/50">{descriptionLength}/200</span>
            </div>
            <textarea
              id="admin-link-description"
              value={form.description}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => updateForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              placeholder="Хэрэглэгчдэд санал болгох товч танилцуулга"
              required
            />
            {displayErrors.description && (
              <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.description}</p>
            )}
          </div>

          <div className="grid gap-3 mobile:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                URL
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateForm((prev) => ({ ...prev, url: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                placeholder="https://example.com"
                required
              />
              {displayErrors.url && (
                <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.url}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Лого (optional)
              </label>
              <input
                type="url"
                value={form.logo}
                onChange={(event: ChangeEvent<HTMLInputElement>) => updateForm((prev) => ({ ...prev, logo: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                placeholder="https://cdn.example.com/logo.png"
              />
              {displayErrors.logo && (
                <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.logo}</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 mobile:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Ангилал
              </label>
              <select
                value={form.category}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => updateForm((prev) => ({ ...prev, category: event.target.value }))}
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              >
                {LINK_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 pt-1.5">
              <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                <input
                  type="checkbox"
                  checked={form.isOfficial}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateForm((prev) => ({ ...prev, isOfficial: event.target.checked }))}
                  className="h-4 w-4 rounded border-[var(--color-border-soft)] text-[var(--color-border-main)] focus:ring-[var(--color-border-main)]"
                />
                Албан ёсны эх сурвалж
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateForm((prev) => ({ ...prev, featured: event.target.checked }))}
                  className="h-4 w-4 rounded border-[var(--color-border-soft)] text-[var(--color-border-main)] focus:ring-[var(--color-border-main)]"
                />
                Онцлох холбоос болгох
              </label>
              {displayErrors.featured && (
                <p className="text-xs text-rose-500 dark:text-rose-300">{displayErrors.featured}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-white/70 p-4 shadow-sm dark:border-white/12 dark:bg-slate-900/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
            Урьдчилсан харагдах байдал
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-white/90 dark:border-white/12 dark:bg-slate-800/60">
              {previewLogo ? (
                <img src={previewLogo} alt="Preview logo" className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-7 w-7 text-[var(--color-text-main)]/50" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">{previewTitle}</p>
              <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60 line-clamp-2">{previewDescription}</p>
              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-500">
                <ExternalLink className="h-3.5 w-3.5" />
                {previewUrl}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'creating'}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          <PlusCircle className="h-4 w-4" />
          Холбоос нэмэх
        </button>
      </form>

      <section className="space-y-[var(--card-gap)] rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-white/80 p-[var(--card-padding)] shadow-sm transition-all dark:border-white/12 dark:bg-white/5">
        <header className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Нэмсэн холбоосууд</h3>
          <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
            Нийт {entries.length} холбоос · Саналын нийлбэр {votesTotal.toLocaleString('en-US')}
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-soft)] bg-white/70 p-6 text-center text-sm text-[var(--color-text-main)]/60 dark:border-white/12 dark:bg-white/5 dark:text-white/60">
            Одоогоор админаас нэмсэн холбоос алга. Дээрх формыг ашиглан нэмээрэй.
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/85 px-4 py-3 text-sm text-[var(--color-text-main)] shadow-sm dark:border-white/12 dark:bg-slate-900/65 dark:text-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
                      {item.dateAdded ? new Date(item.dateAdded).toLocaleString('mn-MN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : 'Огноо байхгүй'}
                      {' · '}{item.category}
                      {' · санал '} {item.votes.toLocaleString('en-US')}
                    </p>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">
                      {item.url}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-500/40 text-red-500 transition hover:bg-red-500/10 dark:border-red-400/40 dark:text-red-200"
                    aria-label="Устгах"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-[var(--color-text-main)]/70 dark:text-white/70 line-clamp-2">{item.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
