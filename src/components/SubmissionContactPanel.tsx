import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
  type KeyboardEvent,
} from 'react';
import {
  Facebook,
  Inbox,
  Instagram,
  Linkedin,
  PhoneCall,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  supportChatStore,
  type SupportChatMessage,
  type SubmissionContext,
} from '../utils/supportChatStore';

export type { SubmissionContext } from '../utils/supportChatStore';

interface SubmissionContactPanelProps {
  context: SubmissionContext;
}

interface SubmissionConfig {
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  responseEta: string;
  autoReply: string;
}

type SocialLink = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const CONFIG: Record<SubmissionContext, SubmissionConfig> = {
  survey: {
    badge: 'Судалгаа илгээх',
    title: 'Сайн байна уу, таны судалгааг админтай хамт нэмүүлцгээе',
    description:
      'Судалгаагаа Marketplace-д нийтлүүлэхийн тулд админ багтайгаа холбогдоод зорилго, зорилтот хэрэглэгч, урамшууллын талаар товч мэдээллээ үлдээгээрэй.',
    highlights: [
      'Судалгааны зорилго, хугацаагаа товч танилцуулбал баталгаажуулах явц хурдан болно.',
      'Асуулгын тоо болон урамшууллын талаар мэдээлэл өгвөл бид хамтран сайжруулна.',
      'Манай дата баг 15 минутын дотор холбоо барьж дараагийн алхмыг чиглүүлнэ.',
    ],
    responseEta: 'Дундаж хариу өгөх хугацаа: 15 минут',
    autoReply:
      'Судалгааны мэдээллийг хүлээж авлаа. Оролцогчдын сонголт, асуулгын сайжруулалтыг удахгүй санал болгоё.',
  },
  weblink: {
    badge: 'Вэб холбоос илгээх',
    title: 'Сайн байна уу, таны вэб холбоосыг онцолж нийтлэхэд бэлэн',
    description:
      'Кампайнээ Marketplace-ийн урсгалд оруулахын тулд холбоос, зорилтот хэрэглэгчтэй холбоотой мэдээллээ админ багт илгээгээрэй. Бид 10 минутын дотор холбогдоно.',
    highlights: [
      'Landing page-ийн зорилго, CTA-гаа тодорхой бичих нь илүү тохирсон байршуулалт хийхэд тусална.',
      'Баннер, thumbnail зураг байвал линктэйгээ хамт илгээж засварын санал авна.',
      'UTM болон үзүүлэлтийн зөвлөгөөг манай дижитал баг өгөхөд бэлэн.',
    ],
    responseEta: 'Дундаж хариу өгөх хугацаа: 10 минут',
    autoReply:
      'Сайн байна уу, таны холбоосын мэдээллийг хүлээж авлаа. UTM болон байршуулалтын зөвлөмжийг түргэн илгээе.',
  },
  advertisement: {
    badge: 'Зар сурталчилгаа илгээх',
    title: 'Сайн байна уу, сурталчилгаагаа админтай хамт байршуулцгаая',
    description:
      'Зарынхаа мессеж, зорилтот сегмент, төсвийн мэдээллийг админ багтайгаа хуваалцаарай. Бид 20 минутын дотор холбогдож, copy болон visual-ийн зөвлөмж гаргана.',
    highlights: [
      'Кампаний зорилго, KPI-гаа тодорхой бичих нь тохирсон санал гаргахад тусалдаг.',
      'Байгаа материалуудаа (баннер, видео, текст) илгээж засварын санал аваарай.',
      'Нийтлэх хугацаа болон төсвийг урьдчилж хэлбэл кампанит ажлыг шуурхай эхлүүлнэ.',
    ],
    responseEta: 'Дундаж хариу өгөх хугацаа: 20 минут',
    autoReply:
      'Сайн байна уу, танай сурталчилгааны материалаа шалгаж байна. Удахгүй санал, тохиргооны зөвлөмж хүргэнэ.',
  },
};

const SOCIAL_LINKS: SocialLink[] = [
  {
    title: 'Facebook @3say',
    href: 'https://facebook.com/3say',
    icon: Facebook,
  },
  {
    title: 'Instagram @3say',
    href: 'https://instagram.com/3say',
    icon: Instagram,
  },
  {
    title: 'LinkedIn / Company Page',
    href: 'https://linkedin.com/company/3say',
    icon: Linkedin,
  },
];

const PHONE_NUMBERS = [
  { label: '+976 9911-2233', href: 'tel:+97699112233' },
  { label: '+976 7711-9900', href: 'tel:+97677119900' },
];

const EMAIL = {
  label: 'admin@3say.mn',
  href: 'mailto:admin@3say.mn',
};

const AUTO_REPLY_DELAY = 1200;
const ADMIN_PROFILE = {
  name: 'Admin',
  avatar: '/img/AdminChat.png',
};

export default function SubmissionContactPanel({ context }: SubmissionContactPanelProps) {
  const config = CONFIG[context];
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);
  const [adminOnline, setAdminOnline] = useState<boolean>(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [showOnlineNotice, setShowOnlineNotice] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pendingRepliesRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);

  const quickReplies = useMemo(() => {
    switch (context) {
      case 'survey':
        return ['Судалгааны товч тойм илгээе.', 'Оролцогчдын тоо, хугацааг асууя.', 'Урамшууллын төрлийг зөвлөмжлөөрэй.'];
      case 'weblink':
        return ['Landing page-ийн зорилгыг танилцуулья.', 'UTM тохиргоо асуух.', 'Баннерын файлыг илгээнэ.'];
      case 'advertisement':
        return ['Кампаний товч танилцуулга бэлэн.', 'Зарын төсөв, хугацааг зөвлөх үү?', 'Зорилтот сегментээ хуваалцъя.'];
      default:
        return [];
    }
  }, [context]);

  const promptLogin = useCallback((mode: 'login' | 'signup' = 'login') => {
    if (typeof window === 'undefined') {
      return;
    }
    window.dispatchEvent(
      new CustomEvent('auth:open', {
        detail: { mode },
      })
    );
  }, []);

  const syncThread = useCallback(() => {
    if (!userId) {
      setMessages([]);
      pendingRepliesRef.current = 0;
      setIsTyping(false);
      setIsChatClosed(false);
      return;
    }
    const current = supportChatStore.getThread(userId);
    if (current?.unreadByUser) {
      supportChatStore.markUserRead(userId);
    }
    setMessages(current?.messages ?? []);
    setIsChatClosed(current?.status === 'closed');
  }, [userId]);

  useEffect(() => {
    syncThread();
  }, [syncThread]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handler = () => {
      syncThread();
    };
    window.addEventListener('support-chat:sync', handler);
    const statusHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { online?: boolean } | undefined;
      if (detail && typeof detail.online === 'boolean') {
        if (!adminOnline && detail.online) {
          // transitioned offline -> online
          setShowOnlineNotice(true);
          setTimeout(() => setShowOnlineNotice(false), 3000);
        }
        setAdminOnline(detail.online);
      } else {
        const status = supportChatStore.getAdminStatus();
        if (!adminOnline && status.online) {
          setShowOnlineNotice(true);
          setTimeout(() => setShowOnlineNotice(false), 3000);
        }
        setAdminOnline(status.online);
      }
    };
    window.addEventListener('support-chat:admin-status', statusHandler);
    // initial
    setAdminOnline(supportChatStore.getAdminStatus().online);
    return () => {
      window.removeEventListener('support-chat:sync', handler);
      window.removeEventListener('support-chat:admin-status', statusHandler);
    };
  }, [syncThread, adminOnline]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleQuickReply = useCallback((reply: string) => {
    setInputValue(reply);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${Math.min(200, inputRef.current.scrollHeight)}px`;
      }
    });
  }, []);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
    const element = event.target;
    element.style.height = 'auto';
    element.style.height = `${Math.min(200, element.scrollHeight)}px`;
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }
    if (!user) {
      promptLogin('login');
      return;
    }

    supportChatStore.addUserMessage({
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar || undefined,
      userPhone: user.phone,
      body: trimmed,
      context,
    });
    setIsChatClosed(false);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    if (adminOnline) {
      pendingRepliesRef.current += 1;
      setIsTyping(true);
      const delay = AUTO_REPLY_DELAY + Math.round(Math.random() * 600);
      const timeoutId = window.setTimeout(() => {
        supportChatStore.addAdminMessage({
          userId: user.id,
          body: config.autoReply,
          context,
        });
        pendingRepliesRef.current = Math.max(0, pendingRepliesRef.current - 1);
        setIsTyping(pendingRepliesRef.current > 0);
      }, delay);
      timeoutIdsRef.current.push(timeoutId);
    }
  }, [adminOnline, config.autoReply, context, inputValue, promptLogin, user]);

  const handlePressEnter = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-border-main/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.35),_transparent_55%)]" />
        <div className="absolute -bottom-16 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 px-8 py-12">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" />
            {config.badge}
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.3rem]">
              {config.title}
            </h1>
            <p className="max-w-2xl text-sm sm:text-base text-white/80">{config.description}</p>
          </div>
          <ul className="grid gap-3 text-sm text-white/85 sm:grid-cols-2">
            {config.highlights.map((item) => (
              <li
                key={item}
                className="flex gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">{config.responseEta}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <section className="space-y-6">
          <div className="rounded-[1.9rem] border border-border-main/40 bg-bg-main/95 p-6 shadow-lg supports-[backdrop-filter]:backdrop-blur-md transition-colors dark:bg-slate-800/70 dark:border-white/10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-text-main dark:text-white">Холбогдох ба социал сувгууд</h2>
                <p className="text-sm text-text-main/70 dark:text-slate-300/70">
                  Админ багтай шуурхай холбогдох бүх сувгууд нэг дор.
                </p>
              </div>
              <span className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide
                border transition-colors
                ${adminOnline
                  ? 'border-emerald-400/50 text-emerald-600 dark:text-emerald-300 dark:border-emerald-400/40'
                  : 'border-border-main/30 text-text-main/60 dark:border-white/10 dark:text-slate-400'}`}> 
                <span className={`h-2 w-2 rounded-full ${adminOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`} />
                {adminOnline ? 'Online Support' : 'Offline Queue'}
              </span>
            </div>

            {/* Composite two-column layout on larger screens */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Left: Direct contact channels */}
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-text-main/80 dark:text-slate-200 uppercase mb-3">Шууд сувгууд</h3>
                <div className="grid gap-3 text-sm text-text-main/85 dark:text-slate-200">
                  {PHONE_NUMBERS.map((phone) => (
                    <div key={phone.label} className="group relative">
                      <a
                        href={phone.href}
                        className="flex items-center justify-between rounded-2xl border border-border-main/30 px-4 py-3 pr-16 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-white/10 dark:hover:border-blue-400 dark:hover:text-blue-300"
                      >
                        <span className="inline-flex items-center gap-2">
                          <PhoneCall className="h-4 w-4" /> {phone.label}
                        </span>
                        <span className="text-[11px] font-medium uppercase tracking-wide text-text-main/50 dark:text-slate-400 flex items-center gap-1">
                          <span className="hidden sm:inline">Call</span>
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(phone.label);
                          setCopiedPhone(phone.label);
                          setTimeout(() => setCopiedPhone((prev) => (prev === phone.label ? null : prev)), 1500);
                        }}
                        className="absolute top-1/2 -translate-y-1/2 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        title={copiedPhone === phone.label ? 'Хуулсан' : 'Copy'}
                      >
                        {copiedPhone === phone.label ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        )}
                      </button>
                      {copiedPhone === phone.label && (
                        <span className="pointer-events-none absolute -top-2 right-12 -translate-y-full rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white shadow animate-copy-fade">
                          Хуулсан
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="group relative">
                    <a
                      href={EMAIL.href}
                      className="flex items-center justify-between rounded-2xl border border-border-main/30 px-4 py-3 pr-16 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-white/10 dark:hover:border-blue-400 dark:hover:text-blue-300"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Inbox className="h-4 w-4" /> {EMAIL.label}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-text-main/50 dark:text-slate-400 flex items-center gap-1">
                        Mail
                      </span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(EMAIL.label);
                        setCopiedEmail(true);
                        setTimeout(() => setCopiedEmail(false), 1500);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      title={copiedEmail ? 'Хуулсан' : 'Copy'}
                    >
                      {copiedEmail ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      )}
                    </button>
                    {copiedEmail && (
                      <span className="pointer-events-none absolute -top-2 right-12 -translate-y-full rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white shadow animate-copy-fade">
                        Хуулсан
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Social links */}
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-text-main/80 dark:text-slate-200 uppercase mb-3">Социал сувгууд</h3>
                <ul className="flex flex-wrap gap-2 text-sm text-text-main/80 dark:text-slate-200">
                  {SOCIAL_LINKS.map(({ title, href, icon: Icon }) => (
                    <li key={title}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-center gap-2 rounded-full border border-border-main/30 bg-white/70 px-4 py-2 text-xs font-medium text-text-main shadow-sm transition hover:border-blue-500 hover:text-blue-600 hover:shadow-md active:scale-[.98]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white
                        dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-500/30 dark:hover:border-blue-400 dark:hover:text-blue-300 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-800"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 transition group-hover:scale-105 group-hover:bg-blue-500/15 dark:bg-blue-500/15 dark:text-blue-300 dark:group-hover:bg-blue-500/25">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="pr-0.5">{title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] uppercase tracking-wide text-text-main/40 dark:text-slate-400">Messenger, Facebook, Instagram</p>
              </div>
            </div>

            {/* Mobile sequence note (optional small helper) */}
            <p className="mt-6 hidden text-[11px] leading-relaxed text-text-main/50 dark:text-slate-400 lg:block">
              Та аль нэг сувгийг ашиглан анхны холболтоо хийнэ үү. Шаардлагатай бол админ баг чат хэсгээр үргэлжлүүлнэ.
            </p>
          </div>
        </section>

        <aside className="space-y-6">
          <div
            className="rounded-[1.5rem] border border-border-main/40 bg-bg-main/95 p-6 shadow-lg supports-[backdrop-filter]:backdrop-blur-md
            transition-colors dark:bg-slate-800/70 dark:border-white/10"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-text-main">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold dark:text-white">Тусламжийн чат</h3>
                  <p className="text-xs text-text-main/60 dark:text-slate-300/60">Админтай шуурхай холбогдоорой</p>
                </div>
              </div>
              {user ? (
                <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300 sm:mt-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Онлайн
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => promptLogin('login')}
                  className="mt-3 inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 sm:mt-0"
                >
                  Нэвтрэх
                </button>
              )}
            </div>

            {!user ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border-main/50 bg-white/80 p-4 text-sm text-text-main/80 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-500/40">
                <p>
                  Нэвтэрсний дараа админтай бодит цагийн мэдрэмжтэй чатаар холбогдож, илгээсэн материалынхаа явцыг хянах боломжтой.
                </p>
                <button
                  type="button"
                  onClick={() => promptLogin('signup')}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-500 px-4 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/15"
                >
                  <Sparkles className="h-4 w-4" /> Шинээр бүртгүүлэх
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border-main/40 bg-white/70 p-4 text-sm text-text-main/65 dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-500/30">
                      <p>
                        Эхний мессежээ илгээгээрэй. Админ баг таны илгээсэн мэдээлэлд үндэслэн зөвлөмж, баталгаажуулалтын алхмуудыг хариулах болно.
                      </p>
                    </div>
                  ) : (
                    messages.map((message, idx) => {
                      const isUser = message.author === 'user';
                      const isLast = idx === messages.length - 1;
                      const timestamp = new Date(message.createdAt);
                      const timeLabel = Number.isNaN(timestamp.getTime())
                        ? ''
                        : timestamp.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
                      const displayName = isUser ? user?.name ?? 'Та' : ADMIN_PROFILE.name;
                      const avatarSrc = isUser ? user?.avatar ?? '/img/human.png' : ADMIN_PROFILE.avatar;
                      return (
                        <div
                          key={message.id}
                          className={`flex items-end gap-3 ${
                            isUser ? 'justify-end text-right' : 'justify-start text-left'
                          }`}
                        >
                          <img
                            src={avatarSrc}
                            alt={displayName}
                            className={`h-8 w-8 rounded-full object-cover shadow ${isUser ? 'order-2' : 'order-1'}`}
                          />
                          <div className={`max-w-[78%] space-y-1 ${isUser ? 'order-1' : 'order-2'}`}>
                            <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-text-main/50 ${isUser ? 'text-right' : 'text-left'}`}>
                              {displayName}
                            </p>
                            <div
                              className={`group relative rounded-2xl px-4 py-3 text-sm shadow-sm transition-colors ${
                                isUser
                                  ? 'bg-blue-600 text-white dark:bg-gradient-to-br dark:from-blue-600 dark:to-indigo-600'
                                  : 'bg-border-main/20 text-text-main dark:bg-slate-700/70 dark:text-slate-100'
                              }`}
                            >
                              <p className="whitespace-pre-line leading-relaxed">{message.body}</p>
                              {timeLabel && (
                                <span
                                  className={`mt-2 block text-[10px] font-medium uppercase tracking-wide ${
                                    isUser ? 'text-white/70' : 'text-text-main/50'
                                  }`}
                                >
                                  {timeLabel}
                                </span>
                              )}
                              {isUser && message.queued && isLast && (
                                <span className="absolute -top-2 right-2 translate-y-[-100%] rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                                  Queued
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {!adminOnline && (
                  <div className="rounded-2xl border border-dashed border-border-main/40 bg-amber-50/95 p-3 text-[11px] text-amber-700 dark:bg-amber-400/10 dark:border-amber-400/30 dark:text-amber-300">
                    <p className="font-medium">Админ оффлайн байна.</p>
                    <p className="mt-0.5">Таны мессеж queued төлөвт хадгалагдана.</p>
                  </div>
                )}

                {isTyping ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-text-main/60 dark:text-slate-300/60">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Админ бичиж байна...
                  </div>
                ) : null}

                {isChatClosed ? (
                  <div className="rounded-2xl border border-dashed border-amber-400/60 bg-amber-50/90 p-4 text-xs text-amber-700">
                    <p className="font-semibold">Админ чат түр хаасан байна.</p>
                    <p className="mt-1 leading-relaxed">
                      Та мессеж илгээхэд чат автоматаар нээгдэж, админ баг мэдэгдэл хүлээн авна.
                    </p>
                  </div>
                ) : null}

                {quickReplies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        onClick={() => handleQuickReply(reply)}
                        className="rounded-full border border-border-main/60 bg-white/70 px-3 py-1.5 text-xs font-medium text-text-main transition hover:border-blue-500 hover:text-blue-600
                        dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-500/30 dark:hover:border-blue-400 dark:hover:text-blue-300"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-end gap-3 rounded-2xl border border-border-main/40 bg-white/90 p-3 shadow-inner
                dark:bg-slate-800/80 dark:border-slate-600/40 dark:shadow-none">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handlePressEnter}
                    placeholder="Эндээс админд мессеж бичнэ үү..."
                    className="min-h-[48px] flex-1 resize-none bg-transparent text-sm text-text-main placeholder:text-text-main/40 focus:outline-none
                    dark:text-slate-100 dark:placeholder:text-slate-400"
                    rows={1}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-border-main/60
                    dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {showOnlineNotice && (
            <div className="mt-2 animate-fade-in rounded-full bg-emerald-500/90 px-4 py-2 text-center text-[11px] font-medium text-white shadow-sm backdrop-blur-sm">
              Админ онлайн боллоо – queued мессежүүд боловсруулагдана
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
