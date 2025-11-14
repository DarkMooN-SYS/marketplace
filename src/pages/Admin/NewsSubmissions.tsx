import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Newspaper, PlusCircle, Trash2, UploadCloud, X } from 'lucide-react';
import { api } from '../../api/adminApi';

interface NewsFormState {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  author: string;
  readTime: number;
  trending: boolean;
}

const CATEGORIES = ['Technology', 'Business', 'Community', 'Product Updates', 'Education', 'Finance'];

type ImageUpload = {
  dataUrl: string;
  name: string;
  size: number;
};

type ValidationErrors = {
  title?: string;
  excerpt?: string;
  content?: string;
  image?: string;
};

const initialFormState: NewsFormState = {
  title: '',
  excerpt: '',
  content: '',
  category: CATEGORIES[0],
  image: '',
  author: 'Admin Team',
  readTime: 6,
  trending: false,
};

type NewsArticle = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image?: string;
  author?: string;
  readTime: number;
  trending?: boolean;
  publishedAt?: string | Date;
  status?: string;
};

export function NewsSubmissionsPage() {
  const [form, setForm] = useState<NewsFormState>(initialFormState);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [status, setStatus] = useState<'idle' | 'creating' | 'loading'>('loading');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [imageUpload, setImageUpload] = useState<ImageUpload | null>(null);

  // Load news on mount
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setStatus('loading');
        const response = await api.news.getAll();
        setArticles(response.news || []);
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setStatus('idle');
      }
    };
    fetchNews();
  }, []);

  const trendingCount = useMemo(
    () => articles.filter((item) => item.trending).length,
    [articles],
  );

  const titleLength = form.title.trim().length;
  const excerptLength = form.excerpt.trim().length;
  const contentLength = form.content.trim().length;

  const computeErrors = (state: NewsFormState, upload: ImageUpload | null): ValidationErrors => {
    const nextErrors: ValidationErrors = {};

    if (state.title.trim().length < 10) {
      nextErrors.title = 'Гарчиг хамгийн багадаа 10 тэмдэгттэй байх ёстой.';
    } else if (state.title.trim().length > 120) {
      nextErrors.title = 'Гарчиг 120 тэмдэгтээс хэтрэхгүй байх ёстой.';
    }

    if (state.excerpt.trim().length < 20) {
      nextErrors.excerpt = 'Товч тайлбар хамгийн багадаа 20 тэмдэгттэй байх ёстой.';
    } else if (state.excerpt.trim().length > 200) {
      nextErrors.excerpt = 'Товч тайлбар 200 тэмдэгтээс хэтрэхгүй байх ёстой.';
    }

    if (state.content.trim().length < 100) {
      nextErrors.content = 'Бүтэн контент хамгийн багадаа 100 тэмдэгттэй байх шаардлагатай.';
    }

    const trimmedImage = state.image.trim();
    if (!upload && trimmedImage.length > 0 && !trimmedImage.startsWith('https://')) {
      nextErrors.image = 'Зурагны холбоос https://-ээр эхэлсэн байх ёстой.';
    }

    return nextErrors;
  };

  const updateForm = (updater: (prev: NewsFormState) => NewsFormState, uploadOverride?: ImageUpload | null) => {
    setForm((prev) => {
      const next = updater(prev);
      const activeUpload = uploadOverride !== undefined ? uploadOverride : imageUpload;
      setErrors(computeErrors(next, activeUpload));
      return next;
    });
  };

  const handleImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImageUpload(null);
    updateForm((prev) => ({ ...prev, image: event.target.value }), null);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageUpload(null);
      setErrors((prev) => ({ ...prev, image: undefined }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const upload: ImageUpload = {
        dataUrl: result,
        name: file.name,
        size: file.size,
      };
      setImageUpload(upload);
      updateForm((prev) => ({ ...prev, image: '' }), upload);
    };
    reader.readAsDataURL(file);
  };

  const clearImageUpload = () => {
    setImageUpload(null);
    setErrors(computeErrors(form, null));
  };

  const displayErrors = {
    title: errors.title && (attemptedSubmit || titleLength > 0) ? errors.title : undefined,
    excerpt: errors.excerpt && (attemptedSubmit || excerptLength > 0) ? errors.excerpt : undefined,
    content: errors.content && (attemptedSubmit || contentLength > 0) ? errors.content : undefined,
    image: errors.image && (attemptedSubmit || form.image.trim().length > 0) ? errors.image : undefined,
  } satisfies ValidationErrors;

  const previewSource = imageUpload?.dataUrl || (form.image.trim().length > 0 && !errors.image ? form.image.trim() : undefined);

  const titleId = 'admin-news-title';
  const excerptId = 'admin-news-excerpt';
  const contentId = 'admin-news-content';
  const imageUrlId = 'admin-news-image-url';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttemptedSubmit(true);

    const validation = computeErrors(form, imageUpload);
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      return;
    }
    setStatus('creating');
    try {
      await api.news.submit({
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        category: form.category,
        image: imageUpload?.dataUrl ?? (form.image.trim() || undefined),
        author: form.author.trim() || undefined,
        readTime: Math.max(1, form.readTime),
        trending: form.trending,
      });

      // Refresh the list
      const response = await api.news.getAll();
      setArticles(response.news || []);
      
      setForm(initialFormState);
      setImageUpload(null);
      setErrors({});
      setAttemptedSubmit(false);
    } catch (err) {
      console.error('Failed to create news:', err);
    } finally {
      setStatus('idle');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      // For now, just remove from local state
      // TODO: Add backend DELETE endpoint or update status to 'rejected'
      const next = articles.filter((item) => item.id !== id);
      setArticles(next);
      
      console.warn('News article removed from UI only. Backend delete not implemented yet.');
    } catch (err) {
      console.error('Failed to delete news:', err);
    }
  };

  return (
    <div className="flex flex-col gap-[var(--section-gap)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-5xl self-center space-y-4 rounded-3xl border border-[var(--color-border-soft)] bg-white/85 p-6 shadow-lg shadow-amber-500/10 transition-all hover:shadow-amber-500/15 dark:border-white/12 dark:bg-white/5"
      >
        <header className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Мэдээ нийтлэл нэмэх</h3>
            <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
              Эндээс нэмсэн нийтлэлүүд News хуудсан дээр шууд гарна.
            </p>
          </div>
        </header>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
              <label htmlFor={titleId}>Гарчиг</label>
              <span className="text-[11px] normal-case tracking-normal text-[var(--color-text-main)]/50 dark:text-white/50">{titleLength}/120</span>
            </div>
            <input
              id={titleId}
              type="text"
              value={form.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              placeholder="Жишээ: Marketplace-ийн шинэ боломжууд"
              required
            />
            {displayErrors.title && (
              <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.title}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
              <label htmlFor={excerptId}>Товч тайлбар (excerpt)</label>
              <span className="text-[11px] normal-case tracking-normal text-[var(--color-text-main)]/50 dark:text-white/50">{excerptLength}/200</span>
            </div>
            <textarea
              id={excerptId}
              value={form.excerpt}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                updateForm((prev) => ({ ...prev, excerpt: event.target.value }))
              }
              rows={2}
              className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              placeholder="Нийтлэлийн гол санааг товч тайлбарлана"
              required
            />
            {displayErrors.excerpt && (
              <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.excerpt}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
              <label htmlFor={contentId}>Бүтэн контент</label>
              <span className="text-[11px] normal-case tracking-normal text-[var(--color-text-main)]/50 dark:text-white/50">{contentLength} тэмдэгт</span>
            </div>
            <textarea
              id={contentId}
              value={form.content}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                updateForm((prev) => ({ ...prev, content: event.target.value }))
              }
              rows={6}
              className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-3 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              placeholder="Нийтлэлийн дэлгэрэнгүй агуулгыг энд бичнэ үү"
              required
            />
            {displayErrors.content && (
              <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.content}</p>
            )}
          </div>

          <div className="grid gap-3 mobile:grid-cols-2">
            <div>
              <label htmlFor="admin-news-category" className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Ангилал
              </label>
              <select
                id="admin-news-category"
                value={form.category}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  updateForm((prev) => ({ ...prev, category: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              >
                {CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={imageUrlId} className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Зурагны холбоос (optional)
              </label>
              <input
                id={imageUrlId}
                type="url"
                value={form.image}
                onChange={handleImageUrlChange}
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                placeholder="https://cdn.example.com/news-cover.jpg"
              />
              {displayErrors.image && (
                <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.image}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-[var(--color-border-soft)] bg-white/70 p-4 text-xs text-[var(--color-text-main)]/70 dark:border-white/12 dark:bg-slate-900/50 dark:text-white/70">
            <div className="flex items-center gap-2 text-[var(--color-text-main)] dark:text-white">
              <UploadCloud className="h-4 w-4" />
              <span>Эсвэл компьютероосоо зураг сонгоно уу</span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-text-main)]/60 dark:text-white/60">JPEG, PNG, WEBP өргөтгөлтэй файл байж болно.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-main)] shadow-sm transition hover:border-[var(--color-border-main)] dark:border-white/15 dark:bg-slate-900/60 dark:text-white">
                <ImageIcon className="h-3.5 w-3.5" />
                Зураг сонгох
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {imageUpload && (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/70 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:border-emerald-300/40 dark:bg-emerald-300/15 dark:text-emerald-100">
                  <span className="max-w-[12rem] truncate">{imageUpload.name}</span>
                  <button
                    type="button"
                    onClick={clearImageUpload}
                    className="text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-200 dark:hover:text-emerald-100"
                    aria-label="Зураг арилгах"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            {previewSource && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-white/80 p-2 dark:border-white/15 dark:bg-slate-900/50">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">Урьдчилсан харагдах байдал</p>
                <div className="mt-2 overflow-hidden rounded-xl">
                  <img src={previewSource} alt="News preview" className="max-h-48 w-full object-cover" />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 mobile:grid-cols-2">
            <div>
              <label htmlFor="admin-news-author" className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Зохиогч (optional)
              </label>
              <input
                id="admin-news-author"
                type="text"
                value={form.author}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateForm((prev) => ({ ...prev, author: event.target.value }))
                }
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                placeholder="Admin Team"
              />
            </div>

            <div>
              <label htmlFor="admin-news-read-time" className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Унших цаг (мин)
              </label>
              <input
                id="admin-news-read-time"
                type="number"
                min={1}
                value={form.readTime}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateForm((prev) => ({ ...prev, readTime: Math.max(1, Number(event.target.value)) }))
                }
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
            <input
              type="checkbox"
              checked={form.trending}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateForm((prev) => ({ ...prev, trending: event.target.checked }))
              }
              className="h-4 w-4 rounded border-[var(--color-border-soft)] text-[var(--color-border-main)] focus:ring-[var(--color-border-main)]"
            />
            Онцлох мэдээнд нэмэх
          </label>
        </div>

        <button
          type="submit"
          disabled={status === 'creating'}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          <PlusCircle className="h-4 w-4" />
          Нийтлэл нэмэх
        </button>
      </form>

  <section className="w-full max-w-3xl self-end space-y-4 rounded-3xl border border-[var(--color-border-soft)] bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/12 dark:bg-white/5">
        <header className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Нийтлэлүүдийн жагсаалт</h3>
          <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
            Нийт {articles.length} нийтлэл · Онцлох {trendingCount}
          </p>
        </header>

        {articles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-soft)] bg-white/70 p-6 text-center text-sm text-[var(--color-text-main)]/60 dark:border-white/12 dark:bg-white/5 dark:text-white/60">
            Одоогоор админаас нэмсэн нийтлэл алга. Дээрх формыг ашиглан нэмээрэй.
          </div>
        ) : (
          <ul className="space-y-3">
            {articles.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-white/85 px-4 py-3 text-sm text-[var(--color-text-main)] shadow-sm dark:border-white/12 dark:bg-slate-900/65 dark:text-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold leading-tight">{item.title}</p>
                    <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleString('mn-MN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : 'Огноо байхгүй'}
                      {' · '} {item.category}
                      {item.trending ? ' · Онцлох' : ''}
                    </p>
                    <p className="text-xs text-[var(--color-text-main)]/70 dark:text-white/70 line-clamp-2">{item.excerpt}</p>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
