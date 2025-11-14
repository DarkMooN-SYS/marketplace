export interface SurveyQuestion {
  id: string;
  prompt: string;
  answerPlaceholder?: string;
}

export interface StoredSurvey {
  id: string;
  title: string;
  description: string;
  reward: number;
  rewardType: 'points' | 'cash';
  duration: number;
  category: string;
  rating?: number;
  responses?: number;
  featured?: boolean;
  createdAt: string;
  questions?: SurveyQuestion[];
  durationRange?: {
    min: number;
    max: number;
  };
}

export interface StoredLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  logo?: string;
  isOfficial: boolean;
  featured?: boolean;
  votes: number;
  dateAdded: string;
}

export type AdAttachmentType = 'link' | 'image' | 'video' | 'pdf';

export interface AdAttachment {
  id: string;
  type: AdAttachmentType;
  label?: string;
  url: string;
}

export interface StoredAdvertisement {
  id: string;
  title: string;
  summary: string;
  budget?: number;
  targetUrl?: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'approved'; // 'approved' from backend
  frontendStatus?: 'draft' | 'scheduled' | 'running' | 'completed'; // Original frontend status
  startDate?: string;
  endDate?: string;
  durationDays?: number; // Number of days the ad should run (used for auto-deletion)
  createdAt: string;
  thumbnail?: string;
  impressions: number;
  clicks: number;
  attachments: AdAttachment[];
}

export interface StoredNewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image?: string;
  author?: string;
  publishedAt: string;
  readTime: number;
  trending?: boolean;
}

const SURVEY_STORAGE_KEY = 'admin-managed-surveys';
const LINK_STORAGE_KEY = 'admin-managed-links';
const AD_STORAGE_KEY = 'admin-managed-ads';
const NEWS_STORAGE_KEY = 'admin-managed-news';

const safeParse = <T>(value: string | null): T[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    return [];
  } catch (error) {
    console.warn('Failed to parse admin storage value', error);
    return [];
  }
};

const persist = <T>(key: string, data: T[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to persist admin storage value', error);
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.round(Math.random() * 10_000)}`;
};

const coerceNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const normalizeAttachments = (value: unknown): AdAttachment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const attachments: AdAttachment[] = [];

  value.forEach((item) => {
    const id = typeof item?.id === 'string' ? item.id : generateId();
    const type =
      item?.type === 'image' || item?.type === 'video' || item?.type === 'pdf'
        ? item.type
        : 'link';
    const url = typeof item?.url === 'string' ? item.url.trim() : '';
    const label = typeof item?.label === 'string' ? item.label.trim() : undefined;

    if (!url) {
      return;
    }

    attachments.push({
      id,
      type,
      url,
      label: label && label.length > 0 ? label : undefined,
    });
  });

  return attachments;
};

const applyAdLifecycle = (ads: StoredAdvertisement[]) => {
  if (ads.length === 0) {
    return { updated: ads, changed: false };
  }

  const now = Date.now();
  let changed = false;

  const updated = ads.map((item) => {
    let nextStatus = item.status;

    if (item.status === 'scheduled' && item.startDate) {
      const startTime = new Date(item.startDate).getTime();
      if (!Number.isNaN(startTime) && startTime <= now) {
        nextStatus = 'running';
      }
    }

    if (nextStatus === 'running' && item.endDate) {
      const endTime = new Date(item.endDate).getTime();
      if (!Number.isNaN(endTime) && endTime < now) {
        nextStatus = 'completed';
      }
    }

    if (nextStatus !== item.status) {
      changed = true;
      return { ...item, status: nextStatus };
    }
    return item;
  });

  return { updated, changed };
};

export const adminSurveyStore = {
  load(): StoredSurvey[] {
    if (typeof window === 'undefined') {
      return [];
    }
    return safeParse<StoredSurvey>(window.localStorage.getItem(SURVEY_STORAGE_KEY));
  },
  save(data: StoredSurvey[]) {
    persist(SURVEY_STORAGE_KEY, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:surveys-sync', { detail: data }));
    }
  },
  add(entry: Omit<StoredSurvey, 'id' | 'createdAt'>): StoredSurvey {
    const all = adminSurveyStore.load();
    const next: StoredSurvey = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...entry,
      questions: entry.questions?.map((question) => ({ ...question })) ?? [],
      durationRange: entry.durationRange,
    };
    all.push(next);
    adminSurveyStore.save(all);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:survey-added', { detail: next }));
    }
    return next;
  },
};

export const adminLinkStore = {
  load(): StoredLink[] {
    if (typeof window === 'undefined') {
      return [];
    }
    return safeParse<StoredLink>(window.localStorage.getItem(LINK_STORAGE_KEY));
  },
  save(data: StoredLink[]) {
    persist(LINK_STORAGE_KEY, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:links-sync', { detail: data }));
    }
  },
  add(entry: Omit<StoredLink, 'id' | 'dateAdded' | 'votes'> & { votes?: number }): StoredLink {
    const all = adminLinkStore.load();
    const next: StoredLink = {
      id: generateId(),
      dateAdded: new Date().toISOString(),
      votes: entry.votes ?? 0,
      ...entry,
    };
    all.push(next);
    adminLinkStore.save(all);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:link-added', { detail: next }));
    }
    return next;
  },
};

export const adminAdStore = {
  load(): StoredAdvertisement[] {
    if (typeof window === 'undefined') {
      return [];
    }

    const raw = safeParse<Partial<StoredAdvertisement> & Record<string, unknown>>(
      window.localStorage.getItem(AD_STORAGE_KEY),
    );

    const normalized: StoredAdvertisement[] = raw.map((item) => ({
      id: typeof item.id === 'string' ? item.id : generateId(),
      title: typeof item.title === 'string' ? item.title : '',
      summary: typeof item.summary === 'string' ? item.summary : '',
      budget:
        typeof item.budget === 'number'
          ? item.budget
          : typeof item.budget === 'string'
            ? Number(item.budget)
            : undefined,
      targetUrl: typeof item.targetUrl === 'string' ? item.targetUrl : undefined,
      thumbnail: typeof item.thumbnail === 'string' ? item.thumbnail : undefined,
      status:
        item.status === 'scheduled' || item.status === 'running' || item.status === 'completed'
          ? item.status
          : 'draft',
      startDate: typeof item.startDate === 'string' ? item.startDate : undefined,
      endDate: typeof item.endDate === 'string' ? item.endDate : undefined,
      createdAt:
        typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      impressions: coerceNumber(item.impressions, 0),
      clicks: coerceNumber(item.clicks, 0),
      attachments: normalizeAttachments((item as Record<string, unknown>).attachments),
    }));

    const { updated, changed } = applyAdLifecycle(normalized);

    if (changed) {
      persist(AD_STORAGE_KEY, updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('admin:ads-sync', { detail: updated }));
      }
      return updated;
    }

    return normalized;
  },
  save(data: StoredAdvertisement[]) {
    persist(AD_STORAGE_KEY, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:ads-sync', { detail: data }));
    }
  },
  add(
    entry: Omit<StoredAdvertisement, 'id' | 'createdAt' | 'impressions' | 'clicks'>,
  ): StoredAdvertisement {
    const all = adminAdStore.load();
    const next: StoredAdvertisement = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      impressions: 0,
      clicks: 0,
      ...entry,
      attachments: entry.attachments ? normalizeAttachments(entry.attachments) : [],
    };
    all.push(next);
    adminAdStore.save(all);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:ad-added', { detail: next }));
    }
    return next;
  },
  update(
    id: string,
    updater: (previous: StoredAdvertisement) => StoredAdvertisement,
  ): StoredAdvertisement | null {
    const all = adminAdStore.load();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    const updated = updater(all[index]);
    all[index] = updated;
    adminAdStore.save(all);
    return updated;
  },
  recordImpression(id: string) {
    return adminAdStore.update(id, (prev) => ({
      ...prev,
      impressions: prev.impressions + 1,
    }));
  },
  recordClick(id: string) {
    return adminAdStore.update(id, (prev) => ({
      ...prev,
      clicks: prev.clicks + 1,
    }));
  },
};

export const adminNewsStore = {
  load(): StoredNewsArticle[] {
    if (typeof window === 'undefined') {
      return [];
    }
    return safeParse<StoredNewsArticle>(window.localStorage.getItem(NEWS_STORAGE_KEY));
  },
  save(data: StoredNewsArticle[]) {
    persist(NEWS_STORAGE_KEY, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:news-sync', { detail: data }));
    }
  },
  add(entry: Omit<StoredNewsArticle, 'id' | 'publishedAt'> & { publishedAt?: string }): StoredNewsArticle {
    const all = adminNewsStore.load();
    const now = new Date();
    const item: StoredNewsArticle = {
      id: generateId(),
      publishedAt: entry.publishedAt ?? now.toISOString(),
      ...entry,
    };
    all.push(item);
    adminNewsStore.save(all);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:news-added', { detail: item }));
    }
    return item;
  },
};
