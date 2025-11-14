import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ExternalLink,
  FileImage,
  FileText,
  FileVideo,
  ImageOff,
  Link2,
  Loader2,
  LucideIcon,
  Megaphone,
  PencilLine,
  Percent,
  PlusCircle,
  Target,
  Trash2,
  Undo2,
} from 'lucide-react';
import { api } from '../../api/adminApi';
import { useNotificationHelpers } from '../../hooks/useNotificationHelpers';
import type {
  AdAttachment,
  AdAttachmentType,
  StoredAdvertisement,
} from '../../utils/adminContentStorage';

interface FirestoreTimestamp {
  _seconds?: number;
  _nanoseconds?: number;
}

interface AdFormState {
  title: string;
  summary: string;
  budget: string;
  thumbnail: string;
  status: StoredAdvertisement['status'];
  startDate: string;
  durationDays: number;
  attachments: AdAttachment[];
}

type ValidationErrors = Partial<{
  title: string;
  summary: string;
  budget: string;
  thumbnail: string;
  startDate: string;
  attachments: string;
}>;

const STATUS_LABELS: Record<StoredAdvertisement['status'], string> = {
  draft: 'Ноорог',
  scheduled: 'Төлөвлөгдсөн',
  running: 'Ажиллаж байгаа',
  completed: 'Дууссан',
  approved: 'Баталгаажсан',
};

const STATUS_STYLES: Record<StoredAdvertisement['status'], string> = {
  draft: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  scheduled: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  running: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  completed: 'bg-purple-500/15 text-purple-600 dark:text-purple-300',
  approved: 'bg-green-600/15 text-green-600 dark:text-green-300',
};

const IMAGE_EXTENSION_REGEX = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
const DAY_IN_MS = 24 * 60 * 60 * 1_000;

const initialFormState: AdFormState = {
  title: '',
  summary: '',
  budget: '',
  thumbnail: '',
  status: 'draft',
  startDate: '',
  durationDays: 14,
  attachments: [],
};

const INFO_PILLS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Target, label: 'Sponsored' },
  { icon: Percent, label: 'CTR сайжруулалт' },
  { icon: CheckCircle2, label: 'Админаар баталгаажсан' },
];

const ATTACHMENT_TYPE_LABELS: Record<AdAttachmentType, string> = {
  link: 'Веб холбоос',
  image: 'Зураг',
  video: 'Видео',
  pdf: 'PDF баримт',
};

const ATTACHMENT_ICONS: Record<AdAttachmentType, LucideIcon> = {
  link: Link2,
  image: FileImage,
  video: FileVideo,
  pdf: FileText,
};

// Helper function to safely parse dates from various formats
const parseDateSafely = (dateValue: unknown, allowUndefined = false): string | undefined => {
  if (!dateValue) {
    return allowUndefined ? undefined : new Date().toISOString();
  }

  if (typeof dateValue === 'string') {
    return dateValue;
  }

  if (typeof dateValue === 'object' && '_seconds' in dateValue) {
    const timestamp = dateValue as FirestoreTimestamp;
    return timestamp._seconds 
      ? new Date(timestamp._seconds * 1000).toISOString() 
      : (allowUndefined ? undefined : new Date().toISOString());
  }

  const date = new Date(dateValue as string | number | Date);
  if (isNaN(date.getTime())) {
    return allowUndefined ? undefined : new Date().toISOString();
  }

  return date.toISOString();
};

const createAttachmentId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `attachment-${Date.now()}-${Math.round(Math.random() * 10_000)}`;
};

const ATTACHMENT_ACCEPTS: Record<AdAttachmentType, string> = {
  link: '',
  image: 'image/*',
  video: 'video/*',
  pdf: 'application/pdf',
};

const calculateDurationDays = (start?: string, end?: string) => {
  if (!start || !end) {
    return initialFormState.durationDays;
  }
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
    return initialFormState.durationDays;
  }
  return Math.max(1, Math.round((endTime - startTime) / DAY_IN_MS));
};

const toFormAttachments = (ad: StoredAdvertisement): AdAttachment[] => {
  const cloned = (ad.attachments ?? []).map((attachment) => ({
    id: attachment.id ?? createAttachmentId(),
    type: attachment.type,
    url: attachment.url,
    label: attachment.label,
  }));

  if (
    ad.targetUrl &&
    !cloned.some((attachment) => attachment.type === 'link' && attachment.url === ad.targetUrl)
  ) {
    cloned.unshift({
      id: createAttachmentId(),
      type: 'link',
      url: ad.targetUrl,
      label: 'Гол холбоос',
    });
  }

  return cloned;
};

const createFormStateFromAd = (ad: StoredAdvertisement): AdFormState => ({
  title: ad.title,
  summary: ad.summary,
  budget: typeof ad.budget === 'number' ? String(ad.budget) : '',
  thumbnail: ad.thumbnail ?? '',
  status: ad.status,
  startDate: ad.startDate ?? '',
  durationDays: calculateDurationDays(ad.startDate, ad.endDate),
  attachments: toFormAttachments(ad),
});

const normalizeDateInput = (value: string) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDateRange = (start?: string, end?: string) => {
  if (!start) {
    return 'Эхлэх өдөр тохируулаагүй';
  }
  const startDate = new Date(start);
  const startLabel = startDate.toLocaleString('mn-MN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!end) {
    return startLabel;
  }
  const endDate = new Date(end);
  const endLabel = endDate.toLocaleString('mn-MN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${startLabel} → ${endLabel}`;
};

const computeLifecycleStatus = (
  desired: StoredAdvertisement['status'],
  start?: string,
  end?: string,
): StoredAdvertisement['status'] => {
  const now = Date.now();
  const startTime = start ? new Date(start).getTime() : Number.NaN;
  const endTime = end ? new Date(end).getTime() : Number.NaN;

  if (desired === 'completed') {
    return 'completed';
  }

  if (!Number.isNaN(endTime) && endTime < now) {
    return 'completed';
  }

  if (!Number.isNaN(startTime) && startTime > now) {
    return 'scheduled';
  }

  if (desired === 'draft') {
    return 'draft';
  }

  return 'running';
};

const computeErrors = (state: AdFormState): ValidationErrors => {
  const nextErrors: ValidationErrors = {};

  const titleLength = state.title.trim().length;
  if (titleLength === 0) {
    nextErrors.title = 'Гарчиг заавал бөглөгдөнө.';
  } else if (titleLength < 5) {
    nextErrors.title = 'Гарчиг хамгийн багадаа 5 тэмдэгт байх ёстой.';
  }

  const summaryLength = state.summary.trim().length;
  if (summaryLength === 0) {
    nextErrors.summary = 'Товч тайлбар заавал бөглөгдөнө.';
  } else if (summaryLength < 20) {
    nextErrors.summary = 'Товч тайлбар хамгийн багадаа 20 тэмдэгттэй байна.';
  }

  const budgetValue = Number(state.budget);
  if (Number.isNaN(budgetValue) || budgetValue <= 0) {
    nextErrors.budget = 'Төсөв 0-ээс их тоон утга байх ёстой.';
  }

  const thumbnail = state.thumbnail.trim();
  if (thumbnail) {
    if (!/^https?:\/\//i.test(thumbnail)) {
      nextErrors.thumbnail = 'Зурган линк http(s)://-оор эхлэх ёстой.';
    } else if (!IMAGE_EXTENSION_REGEX.test(thumbnail.split('?')[0].split('#')[0])) {
      nextErrors.thumbnail = 'Зурган өргөтгөл (.png, .jpg, .svg, .webp, .gif, .avif) шаардлагатай.';
    }
  }

  if (state.status === 'scheduled') {
    if (!state.startDate) {
      nextErrors.startDate = 'Төлөвлөгдсөн зарын эхлэх огноо шаардлагатай.';
    } else {
      const startTime = new Date(state.startDate).getTime();
      if (Number.isNaN(startTime) || startTime <= Date.now()) {
        nextErrors.startDate = 'Төлөвлөгдсөн зарын эхлэх хугацаа ирээдүйд байх ёстой.';
      }
    }
  }

  if (state.durationDays < 1) {
    nextErrors.startDate = nextErrors.startDate ?? 'Байршуулах өдрүүдийн тоо хамгийн багадаа 1 байна.';
  }

  const invalidAttachment = state.attachments.find((attachment) => {
    const trimmed = attachment.url.trim();
    if (trimmed.length === 0) {
      return false;
    }

    if (attachment.type === 'link') {
      return !/^https:\/\//i.test(trimmed);
    }

    return !/^data:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed);
  });

  if (invalidAttachment) {
    nextErrors.attachments =
      invalidAttachment.type === 'link'
        ? 'Веб холбоос нь заавал https:// -оор эхлэх ёстой.'
        : 'Зураг, видео, PDF хавсралт нь файл сонгосон эсвэл хүчинтэй холбоостой байх ёстой.';
  }

  return nextErrors;
};

export function AdvertisementSubmissionsPage() {
  const [form, setForm] = useState<AdFormState>(initialFormState);
  const [errors, setErrors] = useState<ValidationErrors>(computeErrors(initialFormState));
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'loading'>('loading');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entries, setEntries] = useState<StoredAdvertisement[]>([]);
  const { notifyAdvertisementApproved, notifySuccess, notifyError } = useNotificationHelpers();

  const titleLength = form.title.trim().length;
  const summaryLength = form.summary.trim().length;

  // Fetch advertisements from Firebase
  useEffect(() => {
    const fetchAds = async () => {
      try {
        setStatus('loading');
        const response = await api.advertisements.getAll();
        const normalizedAds = (response.advertisements || []).map(ad => ({
          ...ad,
          createdAt: parseDateSafely(ad.createdAt, false) as string,
          startDate: parseDateSafely(ad.startDate, true),
          endDate: parseDateSafely(ad.endDate, true),
        } as StoredAdvertisement));
        setEntries(normalizedAds);
      } catch (error) {
        console.error('Failed to fetch advertisements:', error);
      } finally {
        setStatus('idle');
      }
    };

    fetchAds();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAds, 60000);
    return () => clearInterval(interval);
  }, []);

  const sortedEntries = useMemo(
    () =>
      entries
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries],
  );

  const totalBudget = useMemo(
    () => sortedEntries.reduce((sum, item) => sum + (item.budget ?? 0), 0),
    [sortedEntries],
  );
  const totalImpressions = useMemo(
    () => sortedEntries.reduce((sum, item) => sum + (item.impressions ?? 0), 0),
    [sortedEntries],
  );
  const totalClicks = useMemo(
    () => sortedEntries.reduce((sum, item) => sum + (item.clicks ?? 0), 0),
    [sortedEntries],
  );

  const displayErrors: ValidationErrors = {
    title: errors.title && (attemptedSubmit || titleLength > 0) ? errors.title : undefined,
    summary: errors.summary && (attemptedSubmit || summaryLength > 0) ? errors.summary : undefined,
    budget: errors.budget && (attemptedSubmit || form.budget.length > 0) ? errors.budget : undefined,
    thumbnail: errors.thumbnail && (attemptedSubmit || form.thumbnail.length > 0) ? errors.thumbnail : undefined,
    startDate: errors.startDate && attemptedSubmit ? errors.startDate : undefined,
    attachments: errors.attachments && attemptedSubmit ? errors.attachments : undefined,
  };

  const previewThumbnail = form.thumbnail.trim();
  const previewHasImage = previewThumbnail.length > 0 && !displayErrors.thumbnail;
  const previewAttachments = form.attachments
    .map((attachment) => {
      const url = attachment.url.trim();
      if (!url) {
        return null;
      }
      return {
        id: attachment.id,
        type: attachment.type,
        url,
        label: attachment.label?.trim(),
      };
    })
    .filter((attachment): attachment is NonNullable<typeof attachment> => Boolean(attachment));
  const primaryPreviewAttachment = previewAttachments[0];
  const primaryPreviewLink = primaryPreviewAttachment?.url ?? '';
  const primaryPreviewLabel = primaryPreviewAttachment
    ? primaryPreviewAttachment.label ?? ATTACHMENT_TYPE_LABELS[primaryPreviewAttachment.type]
    : 'Холбоос нэмэгдээгүй';

  const updateForm = <Key extends keyof AdFormState>(key: Key, value: AdFormState[Key]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      setErrors(computeErrors(next));
      return next;
    });
  };

  const coerceAttachmentType = (value: string): AdAttachmentType => {
    if (value === 'image' || value === 'video' || value === 'pdf') {
      return value;
    }
    return 'link';
  };

  const updateAttachments = (updater: (current: AdAttachment[]) => AdAttachment[]) => {
    setForm((prev) => {
      const nextAttachments = updater(prev.attachments);
      const next = { ...prev, attachments: nextAttachments };
      setErrors(computeErrors(next));
      return next;
    });
  };

  const handleAttachmentFieldChange = (
    id: string,
    field: 'type' | 'url' | 'label',
    value: string,
  ) => {
    updateAttachments((current) =>
      current.map((attachment) => {
        if (attachment.id !== id) {
          return attachment;
        }

        if (field === 'type') {
          const nextType = coerceAttachmentType(value);
          return {
            ...attachment,
            type: nextType,
            url: nextType === 'link' ? attachment.url : '',
          };
        }

        if (field === 'url') {
          return { ...attachment, url: value };
        }

        return { ...attachment, label: value };
      }),
    );
  };

  const handleAttachmentFileChange = (id: string, files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        return;
      }

      updateAttachments((current) =>
        current.map((attachment) => {
          if (attachment.id !== id) {
            return attachment;
          }

          return {
            ...attachment,
            url: result,
            label:
              attachment.label && attachment.label.length > 0 ? attachment.label : file.name,
          };
        }),
      );
    };
    reader.onerror = () => {
      console.warn('Файл уншихад алдаа гарлаа');
    };
    reader.readAsDataURL(file);
  };

  const handleAttachmentClear = (id: string) => {
    updateAttachments((current) =>
      current.map((attachment) =>
        attachment.id === id
          ? {
              ...attachment,
              url: '',
            }
          : attachment,
      ),
    );
  };

  const handleAddAttachment = () => {
    updateAttachments((current) => [
      ...current,
      {
        id: createAttachmentId(),
        type: 'link',
        url: '',
      },
    ]);
  };

  const handleRemoveAttachment = (id: string) => {
    updateAttachments((current) => current.filter((attachment) => attachment.id !== id));
  };

  const beginEditing = (ad: StoredAdvertisement) => {
    const nextState = createFormStateFromAd(ad);
    setForm(nextState);
    setErrors(computeErrors(nextState));
    setAttemptedSubmit(false);
    setEditingId(ad.id);
  };

  const handleCancelEdit = () => {
    const resetState: AdFormState = { ...initialFormState, attachments: [] };
    setForm(resetState);
    setErrors(computeErrors(resetState));
    setAttemptedSubmit(false);
    setEditingId(null);
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    if (name === 'durationDays') {
      const numeric = Math.max(1, Number(value));
      updateForm('durationDays', Number.isNaN(numeric) ? 1 : numeric);
      return;
    }
    updateForm(name as keyof AdFormState, value as never);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttemptedSubmit(true);

    const validation = computeErrors(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

    setStatus('saving');
    try {
      const trimmedTitle = form.title.trim();
      const trimmedSummary = form.summary.trim();
      const budgetValue = Number(form.budget);
      const cleanThumbnail = form.thumbnail.trim() || undefined;
      const normalizedAttachments: AdAttachment[] = form.attachments.reduce<AdAttachment[]>(
        (acc, attachment) => {
          const url = attachment.url.trim();
          if (!url) {
            return acc;
          }

          const label = attachment.label?.trim();
          acc.push({
            id: attachment.id || createAttachmentId(),
            type: attachment.type ?? 'link',
            url,
            label: label && label.length > 0 ? label : undefined,
          });
          return acc;
        },
        [],
      );
      const primaryLink = normalizedAttachments.find((attachment) => attachment.type === 'link');

      const now = new Date();
      let baseStart = form.startDate ? new Date(form.startDate) : now;
      if (form.status === 'scheduled' && !form.startDate) {
        baseStart = new Date(now.getTime() + DAY_IN_MS);
      }
      if (Number.isNaN(baseStart.getTime())) {
        baseStart = now;
      }

      const endDate = new Date(baseStart.getTime() + form.durationDays * DAY_IN_MS);
      const lifecycleStatus = computeLifecycleStatus(
        form.status,
        baseStart.toISOString(),
        endDate.toISOString(),
      );

      const payload: Omit<StoredAdvertisement, 'id' | 'createdAt' | 'impressions' | 'clicks'> = {
        title: trimmedTitle,
        summary: trimmedSummary,
        budget: Number.isNaN(budgetValue) ? undefined : budgetValue,
        targetUrl: primaryLink?.url,
        thumbnail: cleanThumbnail,
        status: lifecycleStatus,
        startDate: baseStart.toISOString(),
        endDate: endDate.toISOString(),
        durationDays: form.durationDays, // Add durationDays to payload
        attachments: normalizedAttachments,
      };

      if (editingId) {
        await api.advertisements.update(editingId, payload);
      } else {
        await api.advertisements.submit(payload);
      }
      
      // Refresh the list after creation
      const response = await api.advertisements.getAll();
      const normalizedAds = (response.advertisements || []).map(ad => ({
        ...ad,
        createdAt: parseDateSafely(ad.createdAt, false) as string,
        startDate: parseDateSafely(ad.startDate, true),
        endDate: parseDateSafely(ad.endDate, true),
      } as StoredAdvertisement));
      setEntries(normalizedAds);

      const resetState: AdFormState = { ...initialFormState, attachments: [] };
      setForm(resetState);
      setErrors(computeErrors(resetState));
      setAttemptedSubmit(false);
      setEditingId(null);

      // Show success notification
      if (editingId) {
        notifySuccess('Зар шинэчлэгдлээ', `"${trimmedTitle}" зар амжилттай шинэчлэгдлээ.`);
      } else {
        notifyAdvertisementApproved(trimmedTitle);
      }
    } catch (error) {
      console.error('Failed to save advertisement:', error);
      notifyError('Алдаа гарлаа', 'Зар хадгалахад алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setStatus('idle');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.advertisements.delete(id);
      
      // Refresh the list after deletion
      const response = await api.advertisements.getAll();
      const normalizedAds = (response.advertisements || []).map(ad => ({
        ...ad,
        createdAt: parseDateSafely(ad.createdAt, false) as string,
        startDate: parseDateSafely(ad.startDate, true),
        endDate: parseDateSafely(ad.endDate, true),
      } as StoredAdvertisement));
      setEntries(normalizedAds);
      
      if (editingId === id) {
        handleCancelEdit();
      }

      // Show success notification
      notifySuccess('Зар устгагдлаа', 'Зар амжилттай устгагдлаа.');
    } catch (error) {
      console.error('Failed to delete advertisement:', error);
      notifyError('Алдаа гарлаа', 'Зар устгахад алдаа гарлаа. Дахин оролдоно уу.');
    }
  };

  return (
    <div className="flex flex-col gap-[var(--section-gap)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-[var(--card-gap)] rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-white/80 p-[var(--card-padding)] shadow-sm transition-all dark:border-white/12 dark:bg-white/5"
      >
        {editingId && (
          <div className="flex flex-col gap-2 rounded-2xl border border-blue-200/70 bg-blue-50 px-4 py-3 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200 mobile:flex-row mobile:items-center mobile:justify-between">
            <span className="text-sm font-semibold">Сонгосон зар дээр засвар хийж байна.</span>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center gap-2 self-start rounded-full border border-blue-200/70 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:border-blue-400 hover:text-blue-500 dark:border-blue-400/40 dark:text-blue-200"
            >
              <Undo2 className="h-3.5 w-3.5" /> Болих
            </button>
          </div>
        )}

        <header className="flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Зар сурталчилгаа нэмэх</h3>
            <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
              Marketplace болон Home баннер хэсэгт "Sponsored" тэмдэглэгээтэйгээр харагдана.
            </p>
          </div>
        </header>

        <div className="grid gap-[var(--card-gap)] notebook:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
          <div className="space-y-[var(--card-gap)]">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                <label htmlFor="ad-title">Гарчиг</label>
                <span className="text-[11px] normal-case tracking-normal text-[var(--color-text-main)]/50 dark:text-white/50">{titleLength}/120</span>
              </div>
              <input
                id="ad-title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                placeholder="Жишээ: Marketplace-ийг шинэ өнгөөр танилцуулж байна"
                required
              />
              {displayErrors.title && (
                <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.title}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                <label htmlFor="ad-summary">Товч тайлбар</label>
                <span className="text-[11px] normal-case tracking-normal text-[var(--color-text-main)]/50 dark:text-white/50">{summaryLength}/240</span>
              </div>
              <textarea
                id="ad-summary"
                name="summary"
                value={form.summary}
                onChange={handleInputChange}
                rows={4}
                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                placeholder="Зарын гол үнэ цэнэ, санал болгож буй хөтөлбөрийг товч бөгөөд тодорхой бичээрэй."
                required
              />
              {displayErrors.summary && (
                <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.summary}</p>
              )}
            </div>

            <div className="grid gap-[var(--card-gap)] mobile:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                  Төсөв (₮)
                </label>
                <input
                  name="budget"
                  type="number"
                  min={1}
                  value={form.budget}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                  placeholder="500000"
                  required
                />
                {displayErrors.budget && (
                  <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.budget}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                  Байршуулах өдрүүд
                </label>
                <input
                  name="durationDays"
                  type="number"
                  min={1}
                  value={form.durationDays}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                  placeholder="14"
                />
              </div>
            </div>

            <div className="grid gap-[var(--card-gap)] mobile:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3ем] text-[var(--color-text-main)]/60 dark:text-white/50">
                  Статус
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                >
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3ем] text-[var(--color-text-main)]/60 dark:text-white/50">
                  Эхлэх огноо
                </label>
                <input
                  name="startDate"
                  type="datetime-local"
                  value={normalizeDateInput(form.startDate)}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                />
                {displayErrors.startDate && (
                  <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.startDate}</p>
                )}
              </div>
            </div>

            <div className="grid gap-[var(--card-gap)]">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3ем] text-[var(--color-text-main)]/60 dark:text-white/50">
                  Thumbnail (optional)
                </label>
                <input
                  name="thumbnail"
                  type="url"
                  value={form.thumbnail}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                  placeholder="https://cdn.example.com/banner.png"
                />
                {displayErrors.thumbnail && (
                  <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{displayErrors.thumbnail}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1 mobile:flex-row mobile:items-center mobile:justify-between">
                <label className="text-xs font-semibold uppercase tracking-[0.3ем] text-[var(--color-text-main)]/60 dark:text-white/50">
                  Хавсралт файл & медиа
                </label>
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-main)] transition hover:border-[var(--color-border-main)] hover:text-[var(--color-text-main)] dark:border-white/15 dark:bg-white/5 dark:text-white/70"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Хавсралт нэмэх
                </button>
              </div>

              {form.attachments.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[var(--color-border-soft)] bg-white/70 px-4 py-3 text-[11px] text-[var(--color-text-main)]/60 dark:border-white/12 dark:bg-white/5 dark:text-white/60">
                  Видео, зураг, PDF эсвэл ердийн холбоосуудаас бүрдсэн хавсралтыг энд бүртгэнэ. "Дэлгэрэнгүй үзэх" товч нь зорилтот URL байхгүй үед эхний хавсралтад чиглэнэ.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.attachments.map((attachment) => {
                    const Icon = ATTACHMENT_ICONS[attachment.type];
                    return (
                      <div
                        key={attachment.id}
                        className="space-y-3 rounded-2xl border border-[var(--color-border-soft)] bg-white/75 p-4 shadow-sm dark:border-white/12 dark:bg-white/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
                            <Icon className="h-3.5 w-3.5" />
                            {ATTACHMENT_TYPE_LABELS[attachment.type]}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200/60 px-2.5 py-1 text-[11px] font-semibold text-rose-500 transition hover:border-rose-500 hover:text-rose-600 dark:border-rose-500/30 dark:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Устгах
                          </button>
                        </div>

                        <div className="grid gap-3 mobile:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)]">
                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-[0.3ем] text-[var(--color-text-main)]/60 dark:text-white/50">
                              Төрөл
                            </label>
                            <select
                              value={attachment.type}
                              onChange={(event) =>
                                handleAttachmentFieldChange(attachment.id, 'type', event.target.value)
                              }
                              className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-3 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                            >
                              {Object.entries(ATTACHMENT_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold uppercase tracking-[0.3ем] text-[var(--color-text-main)]/60 dark:text-white/50">
                              Агуулга
                            </label>
                            {attachment.type === 'link' ? (
                              <input
                                type="url"
                                value={attachment.url}
                                onChange={(event) =>
                                  handleAttachmentFieldChange(attachment.id, 'url', event.target.value)
                                }
                                placeholder="https://example.com/landing"
                                className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-3 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                              />
                            ) : (
                              <div className="space-y-2">
                                <input
                                  type="file"
                                  accept={ATTACHMENT_ACCEPTS[attachment.type]}
                                  onChange={(event) =>
                                    handleAttachmentFileChange(attachment.id, event.target.files)
                                  }
                                  className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-3 py-2 text-sm text-[var(--color-text-main)] file:mr-3 file:rounded-xl file:border-0 file:bg-blue-500/15 file:px-3 file:py-1.5 file:text-blue-600 focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                                />
                                {attachment.url ? (
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-main)]/70 dark:text-white/70">
                                    <a
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1 transition hover:border-[var(--color-border-main)] dark:border-white/15 dark:bg-white/5"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Харах / татах
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleAttachmentClear(attachment.id)}
                                      className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 px-3 py-1 font-semibold text-amber-600 transition hover:border-amber-500 hover:text-amber-500 dark:border-amber-500/30 dark:text-amber-300"
                                    >
                                      Шинэ файл сонгох
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[var(--color-text-main)]/50 dark:text-white/50">
                                    Сонгосон файл одоогоор байхгүй. Та төхөөрөмжөөсөө {ATTACHMENT_TYPE_LABELS[attachment.type].toLowerCase()} сонгоно уу.
                                  </p>
                                )}
                                {attachment.type === 'image' && attachment.url ? (
                                  <img
                                    src={attachment.url}
                                    alt={attachment.label ?? 'Attachment preview'}
                                    className="h-24 w-full rounded-xl border border-[var(--color-border-soft)] object-cover dark:border-white/15"
                                  />
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-[0.3ем] text-[var(--color-text-main)]/60 dark:text-white/50">
                            Шошго (сонголттой)
                          </label>
                          <input
                            type="text"
                            value={attachment.label ?? ''}
                            onChange={(event) =>
                              handleAttachmentFieldChange(attachment.id, 'label', event.target.value)
                            }
                            placeholder="Жишээ: Видео танилцуулга"
                            className="mt-1 w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-3 py-2 text-sm text-[var(--color-text-main)] shadow-sm focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {displayErrors.attachments && (
                <p className="text-xs text-rose-500 dark:text-rose-300">{displayErrors.attachments}</p>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-white/70 p-4 shadow-sm dark:border-white/12 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3ем] text-[var(--color-text-main)]/60 dark:text-white/50">
              Урьдчилсан харагдах байдал
            </p>
            <div className="space-y-3 overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-white/85 shadow-sm dark:border-white/10 dark:bg-slate-900/65">
              <div className="relative h-36 w-full overflow-hidden">
                {previewHasImage ? (
                  <img src={previewThumbnail} alt="Ad preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-500/15 via-orange-500/10 to-transparent text-[var(--color-text-main)]/50 dark:text-white/40">
                    <ImageOff className="h-8 w-8" />
                  </div>
                )}
                <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3ем] text-white">
                  Sponsored
                </span>
              </div>
              <div className="space-y-3 p-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white line-clamp-2">
                    {form.title.trim() || 'Marketplace Launch Promo'}
                  </h4>
                  <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60 line-clamp-3">
                    {form.summary.trim() || 'Зарын товч тайлбар энд харагдана. Хэрэглэгчдийг татах гол мессежээ товч бөгөөд ойлгомжтой бичээрэй.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INFO_PILLS.map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1 text-[11px] font-medium text-[var(--color-text-main)]/70 dark:border-white/15 dark:bg-white/5 dark:text-white/70"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1 text-[11px] font-medium text-[var(--color-text-main)]/70 dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {form.durationDays} өдөр
                  </div>
                  {form.budget ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1 text-[11px] font-semibold text-[var(--color-text-main)] dark:border-white/15 dark:bg-white/5 dark:text-white/80">
                      ₮ {Number(form.budget).toLocaleString('en-US')}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {primaryPreviewLink ? (
                    <a
                      href={primaryPreviewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-500"
                    >
                      {primaryPreviewLabel}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] px-4 py-2 text-xs font-semibold text-[var(--color-text-main)]/60 dark:border-white/15 dark:text-white/50">
                      Холбоос нэмэгдээгүй
                    </span>
                  )}
                </div>
                {previewAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-main)]/65 dark:text-white/60">
                    {previewAttachments.map((attachment) => {
                      const Icon = ATTACHMENT_ICONS[attachment.type];
                      return (
                        <span
                          key={attachment.id}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1 dark:border-white/15 dark:bg-white/5"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {attachment.label ?? ATTACHMENT_TYPE_LABELS[attachment.type]}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 notebook:flex-row notebook:items-center notebook:justify-between">
          <div className="inline-flex flex-wrap gap-2 text-[11px] text-[var(--color-text-main)]/60 dark:text-white/50">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 font-semibold text-[var(--color-text-main)] dark:border-white/12 dark:bg-white/5 dark:text-white/70">
              <CalendarRange className="h-3.5 w-3.5" /> {form.durationDays} өдөр байршуулна
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 font-semibold text-[var(--color-text-main)] dark:border-white/12 dark:bg-white/5 dark:text-white/70">
              <ExternalLink className="h-3.5 w-3.5" /> CTA: "Дэлгэрэнгүй үзэх"
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'saving'}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {status === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingId ? (
              <PencilLine className="h-4 w-4" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            {status === 'saving'
              ? 'Хадгалж байна…'
              : editingId
                ? 'Зар шинэчлэх'
                : 'Зар нэмэх'}
          </button>
        </div>
      </form>

      <section className="space-y-[var(--card-gap)] rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-white/80 p-[var(--card-padding)] shadow-sm transition-all dark:border-white/12 dark:bg-white/5">
        <header className="flex flex-col gap-2 notebook:flex-row notebook:items-center notebook:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Нэмсэн зарууд</h3>
            <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
              Нийт {sortedEntries.length} зар · Нийт төсөв {totalBudget.toLocaleString('en-US')}₮ · Импресс {totalImpressions.toLocaleString('en-US')} · Дарсан {totalClicks.toLocaleString('en-US')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-text-main)]/60 dark:text-white/50">
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 dark:border-white/12 dark:bg-white/5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Running
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 dark:border-white/12 dark:bg-white/5">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Scheduled
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 dark:border-white/12 dark:bg-white/5">
              <span className="h-2 w-2 rounded-full bg-slate-500" /> Draft
            </div>
          </div>
        </header>

        {sortedEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-soft)] bg-white/70 p-6 text-center text-sm text-[var(--color-text-main)]/60 dark:border-white/12 dark:bg-white/5 dark:text-white/60">
            Одоогоор бүртгэсэн зар байхгүй байна. Дээрх формыг ашиглан эхний Sponsored баннераа үүсгээрэй.
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedEntries.map((item) => {
              const dateRangeLabel = formatDateRange(item.startDate, item.endDate);
              const createdAtLabel = (() => {
                if (!item.createdAt) {
                  return 'Бүртгэсэн огноо байхгүй';
                }
                const created = new Date(item.createdAt);
                if (Number.isNaN(created.getTime())) {
                  return 'Бүртгэсэн огноо байхгүй';
                }
                return created.toLocaleString('mn-MN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
              })();
              const budgetLabel =
                typeof item.budget === 'number' && Number.isFinite(item.budget)
                  ? `₮ ${item.budget.toLocaleString('en-US')}`
                  : 'Төсөв тохируулаагүй';
              const summary = item.summary?.trim() || 'Товч тайлбар оруулаагүй.';
              const attachments = Array.isArray(item.attachments) ? item.attachments : [];
              const primaryAttachment = attachments[0];
              const primaryCtaHref = item.targetUrl ?? primaryAttachment?.url;
              const primaryCtaLabel = item.targetUrl
                ? 'Дэлгэрэнгүй үзэх'
                : primaryAttachment
                  ? primaryAttachment.label ?? ATTACHMENT_TYPE_LABELS[primaryAttachment.type]
                  : undefined;
              const isEditing = editingId === item.id;

              return (
                <li
                  key={item.id}
                  className={`flex flex-col gap-3 rounded-2xl border bg-white/85 p-4 text-sm text-[var(--color-text-main)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900/65 dark:text-white notebook:flex-row notebook:items-stretch notebook:gap-4 ${isEditing ? 'border-blue-400/70 ring-2 ring-blue-400/25 dark:border-blue-400/60' : 'border-[var(--color-border-soft)] dark:border-white/12'}`}
                >
                  <div className="notebook:w-48 notebook:flex-shrink-0">
                    <div className="relative h-32 overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-white/80 dark:border-white/10 dark:bg-slate-900/40">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-500/15 via-orange-500/10 to-transparent text-[var(--color-text-main)]/50 dark:text-white/40">
                          <ImageOff className="h-8 w-8" />
                        </div>
                      )}
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3ем] text-white">
                        Sponsored
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col gap-3 notebook:flex-row notebook:items-start notebook:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-semibold text-[var(--color-text-main)] dark:text-white">
                            {item.title}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${STATUS_STYLES[item.status]}`}
                          >
                            {STATUS_LABELS[item.status]}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text-main)]/70 dark:text-white/70">{summary}</p>
                        <div className="flex flex-wrap gap-2">
                          {primaryCtaHref ? (
                            <a
                              href={primaryCtaHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-500"
                            >
                              {primaryCtaLabel ?? 'Дэлгэрэнгүй үзэх'}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] px-4 py-1.5 text-xs font-semibold text-[var(--color-text-main)]/60 dark:border-white/15 dark:text-white/50">
                              CTA тохируулаагүй
                            </span>
                          )}
                        </div>
                        {attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-main)]/70 dark:text-white/70">
                            {attachments.map((attachment) => {
                              if (!attachment.url) {
                                return null;
                              }
                              const Icon = ATTACHMENT_ICONS[attachment.type];
                              return (
                                <a
                                  key={attachment.id}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1 transition hover:border-[var(--color-border-main)] hover:text-[var(--color-text-main)] dark:border-white/15 dark:bg-white/5 dark:hover:border-white/40"
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {attachment.label ?? ATTACHMENT_TYPE_LABELS[attachment.type]}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 text-right text-[11px] text-[var(--color-text-main)]/60 dark:text-white/60">
                        <span>{createdAtLabel}</span>
                        {isEditing && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-300/60 bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200">
                            <PencilLine className="h-3 w-3" /> Засварлаж байна
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => beginEditing(item)}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-200/60 px-3 py-1 font-medium text-blue-600 transition hover:border-blue-500 hover:text-blue-600 dark:border-blue-500/30 dark:text-blue-300"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Засах
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200/60 px-3 py-1 font-medium text-rose-500 transition hover:border-rose-500 hover:text-rose-600 dark:border-rose-500/30 dark:text-rose-300"
                            aria-label={`"${item.title}" зарыг устгах`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Устгах
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-main)]/70 dark:text-white/70">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 dark:border-white/12 dark:bg-white/5">
                        <CalendarRange className="h-3.5 w-3.5" />
                        {dateRangeLabel}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 dark:border-white/12 dark:bg-white/5">
                        <Megaphone className="h-3.5 w-3.5" />
                        {budgetLabel}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 dark:border-white/12 dark:bg-white/5">
                        <Target className="h-3.5 w-3.5" />
                        Импресс {(item.impressions ?? 0).toLocaleString('en-US')}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 dark:border-white/12 dark:bg-white/5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Дарсан {(item.clicks ?? 0).toLocaleString('en-US')}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
