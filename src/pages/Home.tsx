import React from 'react';
import {
  TrendingUp,
  Users,
  Award,
  Zap,
  ArrowRight,
  Star,
  Sparkles,
  CalendarRange,
  ShoppingBag,
  Link2,
  Newspaper,
  ArrowUpRight,
  Megaphone,
  FileImage,
  FileText,
  FileVideo,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { useDeviceType } from '../hooks/useDeviceType';
import type { AdAttachmentType, StoredAdvertisement } from '../utils/adminContentStorage';
import { api } from '../api/adminApi';

type HighlightedAd = StoredAdvertisement & { highlight: string };

type StatDescriptor = {
  label: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  chip: string;
  accent: string;
};

type QuickLinkDescriptor = {
  label: string;
  description: string;
  target: string;
  tone: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const ATTACHMENT_META: Record<AdAttachmentType, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }> = {
  link: { icon: Link2, label: 'Веб холбоос' },
  image: { icon: FileImage, label: 'Зураг' },
  video: { icon: FileVideo, label: 'Видео' },
  pdf: { icon: FileText, label: 'PDF' },
};

const AD_STATUS_LABELS: Record<StoredAdvertisement['status'], string> = {
  draft: 'Ноорог',
  scheduled: 'Төлөвлөгдсөн',
  running: 'Идэвхтэй',
  completed: 'Дууссан',
  approved: 'Баталгаажсан',
};

const AD_STATUS_STYLES: Record<StoredAdvertisement['status'], string> = {
  draft: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  scheduled: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  running: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  completed: 'bg-purple-500/15 text-purple-600 dark:text-purple-300',
  approved: 'bg-green-600/15 text-green-600 dark:text-green-300',
};

const AD_STATUS_PRIORITY: Record<StoredAdvertisement['status'], number> = {
  running: 0,
  approved: 0,
  scheduled: 1,
  completed: 2,
  draft: 3,
};

const getAdHighlight = (ad: Pick<StoredAdvertisement, 'status'>): string => {
  switch (ad.status) {
    case 'running':
      return 'Идэвхтэй кампанит ажил';
    case 'scheduled':
      return 'Төлөвлөгдсөн эвент';
    case 'completed':
      return 'Саяхан дууссан сурталчилгаа';
    default:
      return 'Ноорог санал';
  }
};

// Helper interface for Firestore timestamp format
interface FirestoreTimestamp {
  _seconds?: number;
  _nanoseconds?: number;
}

// Safe date parsing helper to prevent Invalid time value errors
const parseDateSafely = (dateValue: unknown, allowUndefined = false): string | undefined => {
  if (!dateValue) {
    return allowUndefined ? undefined : new Date().toISOString();
  }
  
  // Already a valid ISO string
  if (typeof dateValue === 'string') {
    return dateValue;
  }
  
  // Firestore Timestamp format
  if (typeof dateValue === 'object' && '_seconds' in dateValue) {
    const timestamp = dateValue as FirestoreTimestamp;
    if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000).toISOString();
    }
    return allowUndefined ? undefined : new Date().toISOString();
  }
  
  // Try to convert to Date
  const date = new Date(dateValue as string | number | Date);
  if (isNaN(date.getTime())) {
    return allowUndefined ? undefined : new Date().toISOString();
  }
  
  return date.toISOString();
};

export default function Home() {
  const { setCurrentPage } = useNavigation();
  const deviceType = useDeviceType();
  const isNotebookOrUp = deviceType !== 'mobile';
  const featuresRef = React.useRef<HTMLDivElement>(null);
  const [ads, setAds] = React.useState<StoredAdvertisement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activities, setActivities] = React.useState<Array<{
    id: string;
    action: string;
    item: string;
    type: string;
    timestamp: string;
    time?: string; // Formatted time for display
    tone?: string; // UI styling
  }>>([]);
  const [activitiesLoading, setActivitiesLoading] = React.useState(true);
  const [upcomingEvents, setUpcomingEvents] = React.useState<Array<{
    id: string;
    title: string;
    subtitle?: string;
    date: string;
  }>>([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const recordedImpressions = React.useRef<Set<string>>(new Set());
  const [currentAdIndex, setCurrentAdIndex] = React.useState(0);

  // Fetch advertisements from backend
  React.useEffect(() => {
    const fetchAds = async () => {
      try {
        setLoading(true);
        // Fetch only first 10 ads for better performance
        const response = await api.advertisements.getAll({ limit: 10, page: 1 });
        // Convert Date objects to strings for compatibility using safe parser
        const normalizedAds = (response.advertisements || []).map(ad => {
          const createdAt = parseDateSafely(ad.createdAt, false) ?? new Date().toISOString();
          const startDate = parseDateSafely(ad.startDate, true);
          const endDate = parseDateSafely(ad.endDate, true);
          
          // Convert backend 'approved' status to frontend 'running' status
          let displayStatus: StoredAdvertisement['status'] = ad.status;
          if (ad.frontendStatus) {
            displayStatus = ad.frontendStatus;
          } else if (ad.status === 'approved') {
            displayStatus = 'running'; // Treat approved ads as running
          }
          
          return {
            ...ad,
            status: displayStatus,
            createdAt,
            startDate,
            endDate,
          } as StoredAdvertisement;
        });
        setAds(normalizedAds);
      } catch (error) {
        console.error('Failed to fetch advertisements:', error);
        // Fallback to empty array or show error message
        setAds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();

    // Auto-refresh every 5 minutes (optimized for performance)
    const interval = setInterval(fetchAds, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const storedAdIds = React.useMemo(() => new Set(ads.map((ad) => ad.id)), [ads]);

  const prioritizedAds = React.useMemo(() => {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const sorted = ads
      .slice()
      // Filter out ads older than 14 days
      .filter((ad) => {
        const createdDate = new Date(ad.createdAt);
        return createdDate >= fourteenDaysAgo;
      })
      .sort((a, b) => {
        const priorityDiff = AD_STATUS_PRIORITY[a.status] - AD_STATUS_PRIORITY[b.status];
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .map((ad) => ({
        ...ad,
        highlight: getAdHighlight(ad),
      }));

    // Return all sorted ads (including approved, running, scheduled)
    // This ensures all ads within 14 days are shown
    return sorted;
  }, [ads]);

  const displayAds = React.useMemo<HighlightedAd[]>(() => prioritizedAds, [prioritizedAds]);

  const cardsToShow = isNotebookOrUp ? 3 : 2;
  const liveAdsCount = ads.filter((ad) => ad.status === 'running').length;
  
  // Carousel navigation handlers
  const totalPages = Math.ceil(displayAds.length / cardsToShow);
  const canGoPrevious = currentAdIndex > 0;
  const canGoNext = currentAdIndex < totalPages - 1;
  
  const handlePreviousAds = () => {
    if (canGoPrevious) {
      setCurrentAdIndex(prev => prev - 1);
    }
  };
  
  const handleNextAds = () => {
    if (canGoNext) {
      setCurrentAdIndex(prev => prev + 1);
    }
  };
  
  // Get current page ads
  const currentPageAds = React.useMemo(() => {
    const start = currentAdIndex * cardsToShow;
    const end = start + cardsToShow;
    return displayAds.slice(start, end);
  }, [displayAds, currentAdIndex, cardsToShow]);
  
  // Reset carousel when ads change
  React.useEffect(() => {
    setCurrentAdIndex(0);
  }, [displayAds.length]);

  const stats = React.useMemo<StatDescriptor[]>(() => {
    const impressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
    const clicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
    const activeCampaigns = ads.filter((ad) => ad.status === 'running').length;

    return [
      {
        label: 'Нийт импрешн',
        value: impressions.toLocaleString('en-US'),
        icon: TrendingUp,
        chip: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
        accent: 'from-blue-500/25 via-blue-500/10 to-transparent',
      },
      {
        label: 'Нийт даралт',
        value: clicks.toLocaleString('en-US'),
        icon: Zap,
        chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
        accent: 'from-amber-500/25 via-amber-500/10 to-transparent',
      },
      {
        label: 'Идэвхтэй кампани',
        value: activeCampaigns.toString(),
        icon: Megaphone,
        chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
        accent: 'from-emerald-500/25 via-emerald-500/10 to-transparent',
      },
    ];
  }, [ads]);

  const quickLinks = React.useMemo<QuickLinkDescriptor[]>(
    () => [
      {
        label: 'Marketplace',
        description: 'Борлуулалтыг нэмэх, шинэ бүтээгдэхүүнээ зарлах онцлох хэсэг рүү чиглүүлнэ.',
        target: 'marketplace',
        tone: 'from-blue-500/20 via-blue-500/10 to-transparent',
        icon: ShoppingBag,
      },
      {
        label: 'Судалгааны төв',
        description: 'Сүүлийн үеийн сэдвүүдээр оноо цуглуулахуйц судалгаанууд.',
        target: 'surveys',
        tone: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
        icon: Users,
      },
      {
        label: 'Вэб нөөц',
        description: 'Сонгогдсон веб холбоосуудаар шууд үйлчилгээнд холбогдоорой.',
        target: 'weblinks',
        tone: 'from-violet-500/20 via-violet-500/10 to-transparent',
        icon: Link2,
      },
      {
        label: 'Мэдээ, нийтлэл',
        description: 'Комьюнити, marketplace болон апдейтүүдийн долоо хоногийн тойм.',
        target: 'news',
        tone: 'from-rose-500/20 via-rose-500/10 to-transparent',
        icon: Newspaper,
      },
    ],
    [],
  );

  React.useEffect(() => {
    currentPageAds.forEach(async (ad) => {
      if (!storedAdIds.has(ad.id)) {
        return;
      }
      if (recordedImpressions.current.has(ad.id)) {
        return;
      }
      recordedImpressions.current.add(ad.id);
      
      try {
        await api.advertisements.recordImpression(ad.id);
        // Optionally update local state
        setAds((prev) => 
          prev.map((item) => 
            item.id === ad.id 
              ? { ...item, impressions: (item.impressions || 0) + 1 } 
              : item
          )
        );
      } catch (error) {
        console.error('Failed to record impression:', error);
      }
    });
  }, [currentPageAds, storedAdIds]);

  const handleAdClick = React.useCallback(
    async (adId: string) => {
      if (!storedAdIds.has(adId)) {
        return;
      }
      
      try {
        await api.advertisements.recordClick(adId);
        // Optionally update local state
        setAds((prev) => 
          prev.map((item) => 
            item.id === adId 
              ? { ...item, clicks: (item.clicks || 0) + 1 } 
              : item
          )
        );
      } catch (error) {
        console.error('Failed to record click:', error);
      }
    },
    [storedAdIds],
  );

  const features = [
    {
      title: 'Нэг платформоос бүх боломж',
      description: 'Судалгаа бөглөж оноо авах, marketplace-д бараа арилжаалах, мөнгө хөрвүүлэх зэрэг үйлдлийг нэг данснаас удирдаарай.',
      icon: Award,
      highlights: ['0₮-ийн анхан шатны гишүүнчлэл', 'Шөнийн горим, төрөлжсөн виджет', 'Оноо → бэлэн мөнгө хөрвүүлэлт'],
      cta: { label: 'Судалгааг үзэх', target: 'surveys' },
    },
    {
      title: 'Автоматжуулсан мэдээллийн урсгал',
      description: 'AI суурьтай мэдэгдэл, санал болгосон судалгаа/барааг алгоритм бодитоор санал болгоно.',
      icon: TrendingUp,
      highlights: ['Ил тод статистик ба тайлан', 'Зорилтот push мэдэгдэл', 'Нэг товшилтоор дуудлага хийх CTA'],
      cta: { label: 'Зах зээл рүү очих', target: 'marketplace' },
    },
    {
      title: 'Комьюнити ба сургалт',
      description: 'Сарын webinar, хэрэглэгчдийн туршлага хуваалцах хэсэг, академи контент.',
      icon: Sparkles,
      highlights: ['Захиалгат сургалтын багц', 'Комьюнити бэйж, шат ахилт', '3 талын баталгаажуулалт'],
      cta: { label: 'Мэдээг үзэх', target: 'news' },
    },
  ];

  // Fetch activities from backend
  React.useEffect(() => {
    const fetchActivities = async () => {
      try {
        setActivitiesLoading(true);
        const response = await api.activities.getAll(4); // Get 4 most recent activities
        
        // Transform activities to include display formatting
        const formattedActivities = response.activities.map(activity => {
          // Calculate relative time
          const timestamp = new Date(activity.timestamp);
          const now = new Date();
          const diffMs = now.getTime() - timestamp.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          
          let time = '';
          if (diffHours < 1) {
            time = 'Саяхан';
          } else if (diffHours < 24) {
            time = `${diffHours} цагийн өмнө`;
          } else if (diffDays === 1) {
            time = 'Өчигдөр';
          } else {
            time = `${diffDays} хоногийн өмнө`;
          }
          
          // Assign color tone based on type
          const toneMap: Record<string, string> = {
            survey: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
            product: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
            ui_update: 'bg-purple-500/15 text-purple-600 dark:text-purple-300',
            rank: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
            news: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
            advertisement: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
            weblink: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
          };
          
          return {
            ...activity,
            time,
            tone: toneMap[activity.type] || 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
          };
        });
        
        setActivities(formattedActivities);
      } catch (error) {
        console.error('❌ Failed to fetch activities:', error);
        // Fallback to empty array on error
        setActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    };

    fetchActivities();

    // Auto-refresh every 2 minutes (optimized for performance)
    const interval = setInterval(fetchActivities, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  // Fetch upcoming events from backend
  React.useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        setEventsLoading(true);
        const response = await api.activities.getUpcoming(3); // Get 3 upcoming events
        
        setUpcomingEvents(response.events);
      } catch (error) {
        console.error('❌ Failed to fetch upcoming events:', error);
        // Fallback to empty array on error
        setUpcomingEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchUpcomingEvents();

    // Auto-refresh every 5 minutes (optimized for performance)
    const interval = setInterval(fetchUpcomingEvents, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-10 mobile:space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border-main)] bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 px-6 py-10 text-white shadow-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)]" />
        <div className="relative z-10 flex flex-col gap-10 notebook:flex-row notebook:items-center notebook:justify-between">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em]">
              <Sparkles className="h-4 w-4" />
              ШИНЭ ЭРЧИМ
            </span>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight mobile:text-4xl computer:text-5xl">
                Судалгаа, зах зээл, веб нөөцийн экосистемийг нэг дор удирдах
              </h1>
              <p className="text-base text-blue-100/90 mobile:text-lg">
                Хэрэглэгч төвтэй дижитал платформоор дамжуулан оноо цуглуулах, бараа арилжаалах, мэдээ мэдээллийг шуурхай авах боломжийг танд санал болгож байна.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage('surveys');
                  window.location.hash = 'surveys';
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                Эхлэх
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (featuresRef.current) {
                    featuresRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Дэлгэрэнгүй
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 mobile:grid-cols-2 notebook:hidden">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold ${stat.chip}`}>
                      <stat.icon className="h-4 w-4" />
                      {stat.label}
                    </span>
                    <span className="text-xl font-semibold">{stat.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {isNotebookOrUp && (
            <div className="grid gap-4 notebook:grid-cols-2 notebook:w-72 computer:w-80">
              {stats.map((stat) => (
                <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.accent}`} />
                  <div className="relative z-10 space-y-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600">
                      <stat.icon className="h-4 w-4 text-slate-500" />
                      {stat.label}
                    </span>
                    <p className="text-2xl font-semibold">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick links */}
      <section className="grid gap-4 mobile:grid-cols-2 computer:grid-cols-4">
        {quickLinks.map((link) => (
          <button
            key={link.label}
            type="button"
            onClick={() => {
              setCurrentPage(link.target);
              window.location.hash = link.target;
            }}
            className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${link.tone}`} />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-[var(--color-text-main)] dark:bg-slate-900/70 dark:text-white/80">
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-blue-500" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{link.description}</p>
            </div>
          </button>
        ))}
      </section>

      {/* Features Section */}
      <section ref={featuresRef} id="features-section" className="space-y-6">
        <div className="flex flex-col gap-3 notebook:flex-row notebook:items-end notebook:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">Бидний платформын үнэ цэнэ</p>
            <h2 className="text-2xl font-semibold text-[var(--color-text-main)] dark:text-white mobile:text-3xl computer:text-4xl">
              Танд зориулагдсан гурван үндсэн тулгуур
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--color-border-main)] px-4 py-2 text-xs font-semibold text-[var(--color-text-main)] transition hover:bg-blue-50 dark:hover:bg-slate-800"
            onClick={() => {
              setCurrentPage('profile');
              window.location.hash = 'profile';
            }}
          >
            Профайлаа тохируулах
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 notebook:grid-cols-2 computer:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="relative overflow-hidden rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/0 via-white/4 to-white/0 dark:via-slate-900/20" />
              <div className="relative z-10 space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
                  <feature.icon className="h-4 w-4" />
                  {feature.title}
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-300">{feature.description}</p>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {feature.highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(feature.cta.target);
                    window.location.hash = feature.cta.target;
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:translate-x-1"
                >
                  {feature.cta.label}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Admin ads spotlight */}
      <section className="space-y-5 rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] p-6 shadow-sm">
        <div className="flex flex-col gap-3 notebook:flex-row notebook:items-center notebook:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
              <Megaphone className="h-4 w-4" />
              Админ онцлох зарууд
            </p>
            <h3 className="mt-1 text-xl font-semibold text-[var(--color-text-main)] dark:text-white">
              Marketplace ба судалгаанд зориулагдсан кампаниуд
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {loading ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-main)]/60 bg-white/60 px-4 py-1.5 text-xs font-semibold text-[var(--color-text-main)] dark:border-white/20 dark:bg-white/5 dark:text-white/70">
                Ачааллаж байна...
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-main)]/60 bg-white/60 px-4 py-1.5 text-xs font-semibold text-[var(--color-text-main)] dark:border-white/20 dark:bg-white/5 dark:text-white/70">
                  {liveAdsCount} кампани идэвхтэй
                </span>
                {displayAds.length > cardsToShow && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePreviousAds}
                      disabled={!canGoPrevious}
                      className={`rounded-full border p-2 transition ${
                        canGoPrevious
                          ? 'border-[var(--color-border-main)] bg-white hover:bg-slate-50 dark:border-white/20 dark:bg-slate-800 dark:hover:bg-slate-700'
                          : 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-50 dark:border-slate-700 dark:bg-slate-800'
                      }`}
                      aria-label="Өмнөх зарууд"
                    >
                      <ChevronLeft className="h-4 w-4 text-[var(--color-text-main)] dark:text-white" />
                    </button>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {currentAdIndex + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextAds}
                      disabled={!canGoNext}
                      className={`rounded-full border p-2 transition ${
                        canGoNext
                          ? 'border-[var(--color-border-main)] bg-white hover:bg-slate-50 dark:border-white/20 dark:bg-slate-800 dark:hover:bg-slate-700'
                          : 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-50 dark:border-slate-700 dark:bg-slate-800'
                      }`}
                      aria-label="Дараагийн зарууд"
                    >
                      <ChevronRight className="h-4 w-4 text-[var(--color-text-main)] dark:text-white" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Зарууд ачааллаж байна...</p>
            </div>
          </div>
        ) : ads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-main)]/40 bg-slate-50/50 py-12 text-center dark:border-white/10 dark:bg-slate-800/20">
            <Megaphone className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">
              Одоогоор зар байхгүй байна
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Админ панелаар дамжуулан зар нэмэх боломжтой
            </p>
          </div>
        ) : (
          <div className="grid gap-4 mobile:grid-cols-2 computer:grid-cols-3">
          {currentPageAds.map((ad) => {
            const schedule = ad.startDate
              ? `${new Date(ad.startDate).toLocaleDateString('mn-MN', {
                  month: 'short',
                  day: 'numeric',
                })}${
                  ad.endDate
                    ? ` → ${new Date(ad.endDate).toLocaleDateString('mn-MN', {
                        month: 'short',
                        day: 'numeric',
                      })}`
                    : ''
                }`
              : 'Огноо тохируулаагүй';
            const attachments = Array.isArray(ad.attachments)
              ? ad.attachments.filter((attachment) => typeof attachment.url === 'string' && attachment.url.length > 0)
              : [];
            const primaryAttachment = attachments[0];
            const primaryLink = ad.targetUrl ?? primaryAttachment?.url;
            const primaryLabel = ad.targetUrl
              ? 'Дэлгэрэнгүй үзэх'
              : primaryAttachment
                ? primaryAttachment.label ?? ATTACHMENT_META[primaryAttachment.type].label
                : undefined;
            const isStoredAd = storedAdIds.has(ad.id);

            return (
              <article
                key={ad.id}
                className="relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-white/85 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-200">
                    {ad.highlight}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${AD_STATUS_STYLES[ad.status]}`}>
                    {AD_STATUS_LABELS[ad.status]}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white line-clamp-2">{ad.title}</h4>
                  <p className="text-sm text-[var(--color-text-main)]/70 dark:text-white/70 line-clamp-3">{ad.summary}</p>
                </div>

                <div className="mt-auto space-y-2 text-xs text-[var(--color-text-main)]/65 dark:text-white/60">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1 dark:border-white/15 dark:bg-white/5">
                    <CalendarRange className="h-3.5 w-3.5" />
                    {schedule}
                  </div>
                  {typeof ad.budget === 'number' && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1 font-semibold text-[var(--color-text-main)] dark:border-white/15 dark:bg-white/5 dark:text-white/80">
                      Төсөв: {ad.budget.toLocaleString('en-US')}₮
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {primaryLink ? (
                    <a
                      href={primaryLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (isStoredAd) {
                          handleAdClick(ad.id);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-500"
                    >
                      {primaryLabel ?? 'Дэлгэрэнгүй үзэх'}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] px-4 py-2 text-xs font-semibold text-[var(--color-text-main)]/60 dark:border-white/15 dark:text-white/50">
                      Холбоос нэмэгдээгүй
                    </span>
                  )}
                </div>
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-[var(--color-text-main)]/70 dark:text-white/70">
                    {attachments.map((attachment) => {
                      const meta = ATTACHMENT_META[attachment.type];
                      if (!attachment.url) {
                        return null;
                      }
                      const label = attachment.label ?? meta.label;
                      return (
                        <a
                          key={attachment.id}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (isStoredAd) {
                              handleAdClick(ad.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1 transition hover:border-[var(--color-border-main)] hover:text-[var(--color-text-main)] dark:border-white/15 dark:bg-white/5 dark:hover:border-white/30"
                        >
                          <meta.icon className="h-3.5 w-3.5" />
                          {label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
          </div>
        )}
      </section>

      {/* Activity Timeline */}
  <section className="grid gap-6 notebook:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Сүүлд болсон үйл явдал</h3>
            <span className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">ШИНЭЧЛЭЛ</span>
          </div>
          {activitiesLoading ? (
            <div className="mt-5 flex items-center justify-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border-main)]/40 bg-slate-50/50 py-8 text-center dark:border-white/10 dark:bg-slate-800/20">
              <Star className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Үйл явдал байхгүй байна
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 rounded-2xl border border-[var(--color-border-main)]/40 bg-white/80 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${activity.tone}`}>
                    <Star className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">{activity.action}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{activity.item}</p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{activity.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-[var(--color-border-main)] bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-transparent p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Ирэх долоо хоногт</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Платформын бүтээгдэхүүн хөгжүүлэлт, эвентүүд, хэрэглэгчийн тусламжийн шинэчлэл.</p>
          {eventsLoading ? (
            <div className="mt-5 flex items-center justify-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/40 bg-white/50 py-8 text-center dark:border-slate-700/40 dark:bg-slate-900/40">
              <CalendarRange className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Удахгүй эвент зарлагдана
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/40 bg-white/70 p-4 dark:border-slate-700/60 dark:bg-slate-900/60">
                  <p className="font-semibold text-[var(--color-text-main)] dark:text-white">{event.title}</p>
                  {event.subtitle && (
                    <p className="mt-1 text-xs text-slate-500">{event.subtitle}</p>
                  )}
                  {event.date && (
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(event.date).toLocaleDateString('mn-MN', { 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}