export type SupportChatAuthor = 'user' | 'admin';

export type SubmissionContext = 'survey' | 'weblink' | 'advertisement';

export interface SupportChatMessage {
  id: string;
  author: SupportChatAuthor;
  body: string;
  createdAt: string;
  context: SubmissionContext;
  queued?: boolean; // Marked when user sent while admin offline
}

export interface SupportChatThread {
  userId: string;
  userName: string;
  userAvatar?: string;
  userPhone?: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportChatMessage[];
  contexts: SubmissionContext[];
  unreadByAdmin: boolean;
  unreadByUser: boolean;
  status: 'open' | 'closed';
  closedAt?: string | null;
}

// Admin live status (presence) support
interface AdminStatus {
  online: boolean;
  updatedAt: string; // ISO string
}

const STORAGE_KEY = 'support-chat-threads';
const ADMIN_STATUS_KEY = 'support-chat-admin-status';

const isBrowser = typeof window !== 'undefined';

const safeParse = (raw: string | null): SupportChatThread[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return (parsed as SupportChatThread[]).map((thread) => ({
        ...thread,
        status: thread.status ?? 'open',
        closedAt: thread.closedAt ?? null,
        contexts: Array.isArray(thread.contexts) ? thread.contexts : [],
        messages: Array.isArray(thread.messages) ? thread.messages : [],
      }));
    }
    return [];
  } catch (error) {
    console.warn('Failed to parse chat store value', error);
    return [];
  }
};

const persist = (threads: SupportChatThread[]) => {
  if (!isBrowser) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    window.dispatchEvent(new CustomEvent('support-chat:sync', { detail: threads }));
  } catch (error) {
    console.warn('Failed to persist chat threads', error);
  }
};

const loadAdminStatus = (): AdminStatus => {
  if (!isBrowser) {
    return { online: false, updatedAt: new Date(0).toISOString() };
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_STATUS_KEY);
    if (!raw) {
      return { online: false, updatedAt: new Date(0).toISOString() };
    }
    const parsed = JSON.parse(raw) as Partial<AdminStatus>;
    if (typeof parsed.online === 'boolean') {
      return {
        online: parsed.online,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      };
    }
    return { online: false, updatedAt: new Date(0).toISOString() };
  } catch {
    return { online: false, updatedAt: new Date(0).toISOString() };
  }
};

const persistAdminStatus = (status: AdminStatus) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(ADMIN_STATUS_KEY, JSON.stringify(status));
    window.dispatchEvent(new CustomEvent('support-chat:admin-status', { detail: status }));
  } catch (e) {
    console.warn('Failed to persist admin status', e);
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.round(Math.random() * 10_000)}`;
};

const loadAll = (): SupportChatThread[] => {
  if (!isBrowser) {
    return [];
  }
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

const upsertThread = (
  threads: SupportChatThread[],
  payload: {
    userId: string;
    userName: string;
    userAvatar?: string;
    userPhone?: string;
    context: SubmissionContext;
  }
): SupportChatThread => {
  let thread = threads.find((item) => item.userId === payload.userId);
  if (!thread) {
    thread = {
      userId: payload.userId,
      userName: payload.userName,
      userAvatar: payload.userAvatar,
      userPhone: payload.userPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      contexts: [payload.context],
      unreadByAdmin: true,
      unreadByUser: false,
      status: 'open',
      closedAt: null,
    };
    threads.push(thread);
  } else {
    thread.userName = payload.userName;
    thread.userAvatar = payload.userAvatar ?? thread.userAvatar;
    thread.userPhone = payload.userPhone ?? thread.userPhone;
    if (!thread.contexts.includes(payload.context)) {
      thread.contexts.push(payload.context);
    }
    thread.status = thread.status ?? 'open';
    thread.closedAt = thread.closedAt ?? null;
  }
  return thread;
};

const addMessageInternal = (
  threads: SupportChatThread[],
  payload: {
    userId: string;
    body: string;
    author: SupportChatAuthor;
    context: SubmissionContext;
    userName?: string;
    userAvatar?: string;
    userPhone?: string;
    queued?: boolean;
  }
) => {
  const thread = upsertThread(threads, {
    userId: payload.userId,
    userName: payload.userName ?? 'Marketplace хэрэглэгч',
    userAvatar: payload.userAvatar,
    userPhone: payload.userPhone,
    context: payload.context,
  });

  const message: SupportChatMessage = {
    id: generateId(),
    author: payload.author,
    body: payload.body,
    createdAt: new Date().toISOString(),
    context: payload.context,
    queued: payload.queued,
  };
  thread.messages.push(message);
  thread.updatedAt = message.createdAt;
  thread.status = 'open';
  thread.closedAt = null;
  if (payload.author === 'user') {
    thread.unreadByAdmin = true;
  } else {
    thread.unreadByUser = true;
    thread.unreadByAdmin = false;
  }
  threads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  persist(threads);
  window.dispatchEvent(new CustomEvent('support-chat:new-message', { detail: { thread, message } }));
  return message;
};

export const supportChatStore = {
  loadAll(): SupportChatThread[] {
    return loadAll();
  },
  getThread(userId: string): SupportChatThread | undefined {
    return loadAll().find((item) => item.userId === userId);
  },
  addUserMessage(payload: {
    userId: string;
    userName: string;
    userAvatar?: string;
    userPhone?: string;
    body: string;
    context: SubmissionContext;
    queued?: boolean;
  }) {
    const threads = loadAll();
    return addMessageInternal(threads, { ...payload, author: 'user' });
  },
  addAdminMessage(payload: {
    userId: string;
    body: string;
    context: SubmissionContext;
  }) {
    const threads = loadAll();
    const thread = threads.find((item) => item.userId === payload.userId);
    const userName = thread?.userName ?? 'Marketplace хэрэглэгч';
    return addMessageInternal(threads, {
      ...payload,
      author: 'admin',
      userName,
      userAvatar: thread?.userAvatar,
      userPhone: thread?.userPhone,
    });
  },
  markAdminRead(userId: string) {
    const threads = loadAll();
    const thread = threads.find((item) => item.userId === userId);
    if (!thread) {
      return;
    }
    thread.unreadByAdmin = false;
    persist(threads);
  },
  markUserRead(userId: string) {
    const threads = loadAll();
    const thread = threads.find((item) => item.userId === userId);
    if (!thread) {
      return;
    }
    thread.unreadByUser = false;
    persist(threads);
  },
  closeThread(userId: string) {
    const threads = loadAll();
    const thread = threads.find((item) => item.userId === userId);
    if (!thread) {
      return;
    }
    thread.status = 'closed';
    thread.closedAt = new Date().toISOString();
    persist(threads);
  },
  reopenThread(userId: string) {
    const threads = loadAll();
    const thread = threads.find((item) => item.userId === userId);
    if (!thread) {
      return;
    }
    thread.status = 'open';
    thread.closedAt = null;
    persist(threads);
  },
  getAdminStatus(): AdminStatus {
    return loadAdminStatus();
  },
  setAdminStatus(online: boolean) {
    const status: AdminStatus = { online, updatedAt: new Date().toISOString() };
    persistAdminStatus(status);
    return status;
  },
};
