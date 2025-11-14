export type ProductModerationStatus = 'hidden';

export interface ProductModerationRecord {
  id: string;
  status: ProductModerationStatus;
  reason?: string;
  moderatedAt: string;
}

const MODERATION_KEY = 'admin-product-moderation';

const safeParse = (value: string | null): ProductModerationRecord[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is ProductModerationRecord =>
        typeof item === 'object' && item !== null && typeof item.id === 'string' && typeof item.status === 'string'
      );
    }
  } catch (error) {
    console.warn('Unable to parse product moderation store', error);
  }
  return [];
};

const persist = (records: ProductModerationRecord[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (records.length === 0) {
      window.localStorage.removeItem(MODERATION_KEY);
    } else {
      window.localStorage.setItem(MODERATION_KEY, JSON.stringify(records));
    }
  } catch (error) {
    console.warn('Failed to persist product moderation store', error);
  }
  window.dispatchEvent(new CustomEvent('admin:product-moderation-sync', { detail: records }));
};

const dispatchChange = (id: string, status: ProductModerationStatus | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent('admin:product-moderation-changed', { detail: { id, status } }));
};

export const productModerationStore = {
  load(): ProductModerationRecord[] {
    if (typeof window === 'undefined') {
      return [];
    }
    return safeParse(window.localStorage.getItem(MODERATION_KEY));
  },
  isHidden(id: string): boolean {
    return productModerationStore.getStatus(id) === 'hidden';
  },
  getStatus(id: string): ProductModerationStatus | null {
    const record = productModerationStore.load().find((item) => item.id === id);
    return record?.status ?? null;
  },
  hiddenIds(): Set<string> {
    return new Set(productModerationStore.load().filter((item) => item.status === 'hidden').map((item) => item.id));
  },
  hide(id: string, reason?: string) {
    if (typeof window === 'undefined') {
      return;
    }
    const existing = productModerationStore.load().filter((item) => item.id !== id);
    const record: ProductModerationRecord = {
      id,
      status: 'hidden',
      reason,
      moderatedAt: new Date().toISOString(),
    };
    const next = [...existing, record];
    persist(next);
    dispatchChange(id, 'hidden');
  },
  unhide(id: string) {
    if (typeof window === 'undefined') {
      return;
    }
    const next = productModerationStore.load().filter((item) => item.id !== id);
    persist(next);
    dispatchChange(id, null);
  },
  clearAll() {
    if (typeof window === 'undefined') {
      return;
    }
    persist([]);
  },
};
