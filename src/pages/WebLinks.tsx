import { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Star,
  Calendar,
  Vote,
  Shield,
  Sparkles,
  Link2,
  BookmarkPlus,
  Filter,
  Trophy,
  Clock,
  ArrowRight,
} from 'lucide-react';
import FilterBar from '../components/FilterBar';
import { api } from '../api/adminApi';
import { formatDate } from '../utils/dateHelpers';

const linkFilters = [
  {
    key: 'category',
    label: 'Ангилал',
    options: [
      { value: 'development', label: 'Development' },
      { value: 'design', label: 'Design' },
      { value: 'learning', label: 'Learning' },
      { value: 'productivity', label: 'Productivity' },
      { value: 'tools', label: 'Tools' },
    ],
  },
  {
    key: 'type',
    label: 'Төрөл',
    options: [
      { value: 'official', label: 'Official' },
      { value: 'community', label: 'Community' },
    ],
  },
  {
    key: 'sort',
    label: 'Эрэмбэ',
    options: [
      { value: 'newest', label: 'Newest' },
      { value: 'votes', label: 'Most Voted' },
      { value: 'featured', label: 'Featured' },
    ],
  },
];

type LinkItem = {
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
};

const normalizeLink = (link: Partial<LinkItem> & {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  isOfficial: boolean;
}): LinkItem => ({
  votes: link.votes ?? 0,
  featured: link.featured ?? false,
  dateAdded: link.dateAdded ?? new Date().toISOString(),
  ...link,
});

type BaseLink = {
  id: string;
  title: string;
  description: string;
  category: string;
  authorId?: string;
  url: string;
  createdAt: string | Date;
  status: string;
  votes?: number;
  isOfficial?: boolean;
  featured?: boolean;
  logo?: string;
};

interface LinkCardProps {
  link: LinkItem;
  onVote: (id: string) => void;
}

function LinkCard({ link, onVote }: LinkCardProps) {
  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl mobile:p-7 ${link.featured ? 'ring-2 ring-blue-500/50' : ''}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.22),_transparent_65%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 flex flex-col gap-6">
        <header className="flex items-start gap-4">
          <div className="relative rounded-2xl border border-[var(--color-border-soft)] bg-white/80 p-2.5 shadow-sm dark:bg-slate-900/70 mobile:p-3">
            {link.logo ? (
              <img
                src={link.logo}
                alt={link.title}
                className="h-9 w-9 rounded-xl object-cover mobile:h-10 mobile:w-10"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent text-xs font-semibold uppercase text-[var(--color-text-main)] dark:text-white mobile:h-10 mobile:w-10">
                {link.title.slice(0, 2)}
              </span>
            )}
            {link.featured && (
              <span className="absolute -top-2.5 -right-2.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200 mobile:-top-3 mobile:-right-3 mobile:text-[10px]">
                <Star className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
                Онцлох
              </span>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--color-text-main)] dark:text-white mobile:text-lg">
                {link.title}
              </h3>
              {link.isOfficial && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-300 mobile:px-2.5 mobile:py-1 mobile:text-[11px]">
                  <Shield className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
                  Албан ёсны
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-main)]/75 line-clamp-3 mobile:text-sm">
              {link.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-text-main)]/60 mobile:gap-3 mobile:text-[11px]">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
                {formatDate(link.dateAdded)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Vote className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
                {link.votes.toLocaleString()} санал
              </span>
              <span className="inline-flex items-center gap-1">
                <Link2 className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
                {link.category}
              </span>
            </div>
          </div>
        </header>

        <footer className="flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
          <div className="flex flex-wrap gap-2 text-[10px] text-[var(--color-text-main)]/60 mobile:text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-2xl border border-[var(--color-border-soft)] bg-white/70 px-2.5 py-1 font-semibold uppercase tracking-[0.15em] text-[var(--color-border-main)] dark:bg-slate-900/60 mobile:px-3">
              <Filter className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
              {link.featured ? 'АМЖИЛТ' : 'САНАЛ'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-2xl border border-[var(--color-border-soft)] bg-white/70 px-2.5 py-1 font-semibold text-[var(--color-text-main)] dark:bg-slate-900/60 mobile:px-3">
              <Clock className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
              Сүүлд шинэчлэгдсэн: {formatDate(link.dateAdded)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onVote(link.id)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] px-3.5 py-1.5 text-[10px] font-semibold text-[var(--color-text-main)] transition hover:border-blue-400 hover:text-blue-500 mobile:px-4 mobile:py-2 mobile:text-xs"
            >
              <Vote className="h-3.5 w-3.5 mobile:h-4 mobile:w-4" />
              Санал өгөх
            </button>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Очих
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </footer>
      </div>
    </article>
  );
}

export default function WebLinks() {
  const [weblinksData, setWeblinksData] = useState<BaseLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 🆕 Default sort: newest (шинэ холбоосууд эхэнд)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    sort: 'newest'
  });

  useEffect(() => {
    const fetchWeblinks = async () => {
      try {
        setLoading(true);
        const response = await api.weblinks.getAll();
        setWeblinksData(response.weblinks || []);
      } catch (err) {
        console.error('Error fetching weblinks:', err);
        setError('Failed to load weblinks');
      } finally {
        setLoading(false);
      }
    };

    fetchWeblinks();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchWeblinks, 60000);
    return () => clearInterval(interval);
  }, []);

  const links = useMemo(() => {
    const normalized: LinkItem[] = weblinksData.map((item) => 
      normalizeLink({
        id: item.id,
        title: item.title,
        description: item.description,
        url: item.url,
        category: item.category,
        isOfficial: false,
        votes: 0,
        featured: false,
        logo: '',
        dateAdded: typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString()
      })
    );
    return normalized;
  }, [weblinksData]);

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setActiveFilters({});
  };

  const handleVote = async (id: string) => {
    try {
      const response = await api.weblinks.vote(id);
      // Update local state with new vote count
      setWeblinksData(prev => 
        prev.map(link => {
          if (link.id === id) {
            return { ...link, votes: response.votes } as BaseLink;
          }
          return link;
        })
      );
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const filteredLinks = useMemo(() => {
    const { category, type, sort } = activeFilters;

    let items = [...links];

    if (category) {
      items = items.filter(
        (link) => link.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (type) {
      items = items.filter((link) =>
        type === 'official' ? link.isOfficial : !link.isOfficial
      );
    }

    if (sort === 'newest') {
      items.sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      );
    } else if (sort === 'votes') {
      items.sort((a, b) => b.votes - a.votes);
    } else if (sort === 'featured') {
      items.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
    }

    return items;
  }, [activeFilters, links]);

  const featuredLinks = useMemo(
    () => filteredLinks.filter((link) => link.featured),
    [filteredLinks]
  );

  const regularLinks = useMemo(
    () => filteredLinks.filter((link) => !link.featured),
    [filteredLinks]
  );

  const totalVotes = filteredLinks.reduce((acc, link) => acc + link.votes, 0);
  const averageVotes = filteredLinks.length
    ? Math.round(totalVotes / filteredLinks.length)
    : 0;

  const heroStats = [
    {
      label: 'Нийт холбоос',
      value: filteredLinks.length.toLocaleString(),
      meta: `${featuredLinks.length} онцлох`,
      icon: Link2,
      tone: 'from-blue-500/15 via-blue-500/5 to-transparent',
    },
    {
      label: 'Саналын нийлбэр',
      value: totalVotes.toLocaleString(),
      meta: 'Одоогийн жагсаалт',
      icon: Trophy,
      tone: 'from-purple-500/15 via-purple-500/5 to-transparent',
    },
    {
      label: 'Дундаж санал',
      value: averageVotes ? `${averageVotes.toLocaleString()}` : '—',
      meta: 'Нэг холбоосын дундаж',
      icon: Sparkles,
      tone: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    },
  ];

  const toggleSort = (value: string) => {
    setActiveFilters((prev) => ({ ...prev, sort: prev.sort === value ? '' : value }));
  };

  const toggleType = (value: string) => {
    setActiveFilters((prev) => ({ ...prev, type: prev.type === value ? '' : value }));
  };

  const quickActions = [
    {
      label: 'Албан ёсны эх сурвалж',
      description: 'Баталгаатай, найдвартай эх сурвалжуудыг шүүн харах.',
      icon: Shield,
      tone: 'from-blue-500/15 via-blue-500/5 to-transparent',
      onClick: () => toggleType('official'),
    },
    {
      label: 'Коммюнити эх сурвалж',
      description: 'Нээлттэй эх сурвалж, хэрэглэгчийн санал болгосон холбоосууд.',
      icon: BookmarkPlus,
      tone: 'from-purple-500/15 via-purple-500/5 to-transparent',
      onClick: () => toggleType('community'),
    },
    {
      label: 'Шинэ холбоосууд',
      description: 'Сүүлийн нэмэгдсэн эх сурвалжуудаар эрэмбэлэх.',
      icon: Clock,
      tone: 'from-amber-500/15 via-amber-500/5 to-transparent',
      onClick: () => toggleSort('newest'),
    },
    {
      label: 'Их санал авсан',
      description: 'Хэрэглэгчдийн өндөр үнэлгээтэй эх сурвалжууд.',
      icon: Trophy,
      tone: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
      onClick: () => toggleSort('votes'),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Веб линкүүд ачааллаж байна...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-white text-center">
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 mobile:space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-6 text-white shadow-lg mobile:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_55%)]" />
        <div className="relative z-10 flex flex-col gap-8 notebook:flex-row notebook:items-center notebook:justify-between">
          <div className="space-y-4 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.35em]">
              <Link2 className="h-4 w-4" />
              WEB LINKS
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold leading-tight mobile:text-3xl computer:text-4xl">
                Танд хэрэгтэй вэб эх сурвалжуудыг нэг дороос хайж, хамтдаа нэмэцгээе
              </h1>
              <p className="text-sm text-blue-100/90 mobile:text-base">
                Шүүлтүүрүүдийг ашиглан албан ёсны эх сурвалж, коммюнити саналуудыг ялган харж, санал өгч дэмжээрэй.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-indigo-600 transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                Холбоос нэмэх
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Шүүлтүүрийг цэвэрлэх
              </button>
            </div>
          </div>

          <div className="grid gap-3 mobile:grid-cols-3 notebook:grid-cols-1 notebook:w-72">
            {heroStats.map((stat) => (
              <div key={stat.label} className="relative overflow-hidden rounded-[26px] border border-white/20 bg-white/10 p-4 backdrop-blur">
                <div className={`pointer-events-none absolute inset-0 rounded-[26px] bg-gradient-to-br ${stat.tone}`} />
                <div className="relative z-10 space-y-2 text-white">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                    <stat.icon className="h-3.5 w-3.5" />
                    {stat.label}
                  </span>
                  <div className="text-xl font-semibold">{stat.value}</div>
                  <p className="text-[11px] text-white/80">{stat.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 mobile:grid-cols-2 computer:grid-cols-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="group relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${action.tone}`} />
            <div className="relative z-10 space-y-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white/80 text-[var(--color-border-main)] dark:bg-slate-900/70">
                <action.icon className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">{action.label}</p>
                <p className="text-xs text-[var(--color-text-main)]/70 dark:text-white/70">{action.description}</p>
              </div>
            </div>
          </button>
        ))}
      </section>

      <FilterBar
        filters={linkFilters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearFilters}
      />

      {featuredLinks.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 mobile:flex-row mobile:items-end mobile:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Хамгийн хүмүүст таалагдсан
              </p>
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white mobile:text-2xl">
                Онцлох холбоосууд
              </h2>
            </div>
            <span className="text-xs font-semibold text-[var(--color-text-main)]/60 dark:text-white/60">
              Нийт {featuredLinks.length} онцолсон эх сурвалж
            </span>
          </div>
          <div className="grid gap-4 mobile:grid-cols-2">
            {featuredLinks.map((link) => (
              <LinkCard key={link.id} link={link} onVote={handleVote} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 mobile:flex-row mobile:items-end mobile:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
              Бүх эх сурвалжууд
            </p>
            <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white mobile:text-2xl">
              Шүүлтүүрт таарсан холбоосууд
            </h2>
          </div>
          <span className="text-xs font-semibold text-[var(--color-text-main)]/60 dark:text-white/60">
            Харагдаж буй {filteredLinks.length} холбоос
          </span>
        </div>

        {regularLinks.length === 0 ? (
          <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-6 text-center text-sm text-[var(--color-text-main)]/70">
            Таны сонгосон шүүлтүүрт тохирох холбоос одоогоор алга. Шүүлтүүрээ өөрчлөөд дахин хайгаарай.
          </div>
        ) : (
          <div className="grid gap-4 mobile:grid-cols-2">
            {regularLinks.map((link) => (
              <LinkCard key={link.id} link={link} onVote={handleVote} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}