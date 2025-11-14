import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  User,
  Eye,
  Heart,
  TrendingUp,
  BookOpen,
  Sparkles,
  ArrowRight,
  Clock,
  Flame,
} from 'lucide-react';
import FilterBar from '../components/FilterBar';
import type { StoredNewsArticle } from '../utils/adminContentStorage';
import { api } from '../api/adminApi';
import { formatDate, formatNumber, getTimestamp } from '../utils/dateHelpers';
import { useAuth } from '../hooks/useAuth';

const newsFilters = [
  {
    key: 'category',
    label: 'Ангилал',
    options: [
      { value: 'technology', label: 'Технологи' },
      { value: 'business', label: 'Бизнес' },
      { value: 'environment', label: 'Байгаль орчин' },
      { value: 'health', label: 'Эрүүл мэнд' },
      { value: 'lifestyle', label: 'Амьдралын хэв маяг' },
    ],
  },
  {
    key: 'date',
    label: 'Огноо',
    options: [
      { value: 'today', label: 'Өнөөдөр' },
      { value: 'week', label: 'Энэ 7 хоног' },
      { value: 'month', label: 'Энэ сар' },
    ],
  },
  {
    key: 'sort',
    label: 'Эрэмбэлэх',
    options: [
      { value: 'newest', label: 'Шинээр нэмэгдсэн' },
      { value: 'trending', label: 'Тренд' },
      { value: 'most-liked', label: 'Хамгийн их таалагдсан' },
      { value: 'most-viewed', label: 'Хамгийн их үзсэн' },
    ],
  },
];

type BaseArticle = {
  id: string;
  title: string;
  description?: string;
  category: string;
  authorId?: string;
  imageUrl?: string;
  image?: string;
  createdAt?: string | Date;
  status: string;
  excerpt?: string;
  content?: string;
  publishedAt?: string | Date;
  trending?: boolean;
  author?: string;
  views?: number;
  likes?: number;
  readTime?: number;
};

type Article = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  publishedAt: string;
  readTime: number;
  views: number;
  likes: number;
  author: string;
  image: string;
  trending: boolean;
};

interface NewsCardProps {
  article: Article;
  onRead: (id: string) => void;
  onLike: (id: string) => void;
  isLiked: boolean;
  isAuthenticated?: boolean;
}

function NewsCard({ article, onRead, onLike, isLiked, isAuthenticated = false }: NewsCardProps) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img
          src={article.image}
          alt={article.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white mobile:px-3 mobile:text-[11px]">
            <BookOpen className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
            {article.category}
          </span>
          {article.trending && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-200 mobile:px-3 mobile:text-[11px]">
              <Flame className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
              Тренд
            </span>
          )}
        </div>

        <div className="absolute bottom-3 left-4 flex items-center gap-2 text-[10px] font-semibold text-white mobile:bottom-4 mobile:text-[11px]">
          <Clock className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
          {article.readTime} мин унших
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5 mobile:gap-5 mobile:p-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-text-main)]/60 mobile:gap-3 mobile:text-[11px]">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
              {formatDate(article.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
              {article.author}
            </span>
          </div>
          <h3
            className="text-base font-semibold leading-snug text-[var(--color-text-main)] transition hover:text-blue-500 dark:text-white mobile:text-lg"
            onClick={() => onRead(article.id)}
          >
            {article.title}
          </h3>
          <p className="text-xs text-[var(--color-text-main)]/75 line-clamp-3 mobile:text-sm">
            {article.excerpt}
          </p>
        </header>

        <footer className="flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-[var(--color-text-main)]/70 mobile:gap-4 mobile:text-sm">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5 mobile:h-4 mobile:w-4" />
              {formatNumber(article.views)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 mobile:h-4 mobile:w-4" />
              {formatNumber(article.likes)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onLike(article.id)}
              disabled={!isAuthenticated}
              className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-[10px] font-semibold transition mobile:px-4 mobile:py-2 mobile:text-xs ${
                !isAuthenticated
                  ? 'border-gray-300/50 bg-white/60 text-gray-400 cursor-not-allowed dark:bg-slate-800/60 dark:border-gray-600/50'
                  : isLiked
                  ? 'border-rose-400 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/20 dark:text-rose-400'
                  : 'border-[var(--color-border-soft)] text-[var(--color-text-main)] hover:border-rose-400 hover:text-rose-500'
              }`}
              title={!isAuthenticated ? 'Нэвтэрч орсны дараа таалагдах боломжтой' : ''}
            >
              <Heart className={`h-3.5 w-3.5 mobile:h-4 mobile:w-4 ${isLiked && isAuthenticated ? 'fill-rose-500 dark:fill-rose-400' : ''}`} />
              Таалагдлаа
            </button>
            <button
              type="button"
              onClick={() => onRead(article.id)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Дэлгэрэнгүй
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </div>
    </article>
  );
}

const DEFAULT_IMAGE = 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=400';

const normalizeArticle = (article: BaseArticle | StoredNewsArticle): Article => {
  const isBaseArticle = (item: BaseArticle | StoredNewsArticle): item is BaseArticle => {
    return 'description' in item;
  };

  const publishedAtRaw = article.publishedAt || (isBaseArticle(article) && article.createdAt ? article.createdAt : new Date().toISOString());
  
  // Handle Date, string, or fallback to current date
  let publishedAt: string;
  if (typeof publishedAtRaw === 'string') {
    publishedAt = publishedAtRaw;
  } else if (publishedAtRaw instanceof Date) {
    publishedAt = publishedAtRaw.toISOString();
  } else {
    publishedAt = new Date().toISOString();
  }

  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt || (isBaseArticle(article) ? article.description : '') || '',
    content: article.content || (isBaseArticle(article) ? article.description : '') || '',
    category: article.category,
    publishedAt,
    trending: article.trending ?? false,
    author: article.author ?? 'Admin Team',
    image: 'image' in article && article.image ? article.image : DEFAULT_IMAGE,
    readTime: ('readTime' in article && typeof article.readTime === 'number') ? article.readTime : 6,
    views: ('views' in article && typeof article.views === 'number') ? article.views : 0,
    likes: ('likes' in article && typeof article.likes === 'number') ? article.likes : 0,
  };
};

export default function News() {
  const { user } = useAuth();
  const [newsData, setNewsData] = useState<BaseArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 🆕 Default sort: newest (шинэ мэдээ эхэнд)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    sort: 'newest'
  });
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [likedArticles, setLikedArticles] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('likedArticles');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [viewedArticles, setViewedArticles] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('viewedArticles');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await api.news.getAll();
        setNewsData(response.news || []);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Failed to load news articles');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, []);

  const articles = useMemo(() => {
    const normalized: Article[] = newsData.map((item) => normalizeArticle(item));
    return normalized;
  }, [newsData]);

  // Check if coming from Profile/Wishlist - open specific article
  useEffect(() => {
    const openArticleId = sessionStorage.getItem('openArticleId');
    if (openArticleId && articles.length > 0) {
      const article = articles.find(a => a.id === openArticleId);
      if (article) {
        handleReadArticle(openArticleId);
        sessionStorage.removeItem('openArticleId');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles]);

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setActiveFilters({});
  };

  const handleReadArticle = async (id: string) => {
    const article = articles.find((a) => a.id === id);
    if (article) {
      setSelectedArticle(article);
      
      // Increment views only if not viewed before
      if (!viewedArticles.has(id)) {
        try {
          // Call backend API to increment view
          const response = await api.news.view(id);
          
          // Update local state with backend response
          setNewsData((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, views: response.views } : item
            )
          );
          
          // Mark as viewed locally
          const newViewed = new Set(viewedArticles);
          newViewed.add(id);
          setViewedArticles(newViewed);
          localStorage.setItem('viewedArticles', JSON.stringify([...newViewed]));
        } catch (error) {
          console.error('Failed to increment view:', error);
          // Still mark as viewed locally to prevent multiple attempts
          const newViewed = new Set(viewedArticles);
          newViewed.add(id);
          setViewedArticles(newViewed);
          localStorage.setItem('viewedArticles', JSON.stringify([...newViewed]));
        }
      }
    }
  };

  const handleLikeArticle = async (id: string) => {
    // Check if user is authenticated
    if (!user) {
      window.dispatchEvent(
        new CustomEvent('auth:open', {
          detail: { mode: 'login' as const },
        })
      );
      return;
    }

    try {
      // Call backend API to toggle like
      const response = await api.news.like(id);
      
      // Update local state with backend response
      setNewsData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, likes: response.likes } : item
        )
      );
      
      // Update liked articles based on backend response
      const newLiked = new Set(likedArticles);
      if (response.isLiked) {
        newLiked.add(id);
      } else {
        newLiked.delete(id);
      }
      setLikedArticles(newLiked);
      localStorage.setItem('likedArticles', JSON.stringify([...newLiked]));
    } catch (error) {
      console.error('Failed to like article:', error);
      // Show error message to user if needed
    }
  };

  const handleCloseModal = () => {
    setSelectedArticle(null);
  };



  const filteredArticles = useMemo(() => {
  const { category } = activeFilters;
  let items = [...articles];

    if (category) {
      items = items.filter(
        (article) => article.category.toLowerCase() === category.toLowerCase()
      );
    }

    switch (activeFilters.sort) {
      case 'newest':
        items.sort(
          (a, b) =>
            getTimestamp(b.publishedAt) - getTimestamp(a.publishedAt)
        );
        break;
      case 'trending':
        items.sort(
          (a, b) => Number(b.trending ?? false) - Number(a.trending ?? false)
        );
        break;
      case 'most-liked':
        items.sort((a, b) => b.likes - a.likes);
        break;
      case 'most-viewed':
        items.sort((a, b) => b.views - a.views);
        break;
      default:
        break;
    }

    return items;
  }, [activeFilters, articles]);

  const trendingArticles = useMemo(
    () => filteredArticles.filter((article) => article.trending),
    [filteredArticles]
  );

  const regularArticles = useMemo(
    () => filteredArticles.filter((article) => !article.trending),
    [filteredArticles]
  );

  const totalViews = filteredArticles.reduce((acc, article) => acc + article.views, 0);
  const totalLikes = filteredArticles.reduce((acc, article) => acc + article.likes, 0);

  const heroStats = [
    {
      label: 'Нийт нийтлэл',
      value: formatNumber(filteredArticles.length),
      meta: `${trendingArticles.length} тренд`,
      icon: BookOpen,
      tone: 'from-blue-500/15 via-blue-500/5 to-transparent',
    },
    {
      label: 'Нийт үзэлт',
      value: formatNumber(totalViews),
      meta: 'Нийт үзсэн тоо',
      icon: Eye,
      tone: 'from-purple-500/15 via-purple-500/5 to-transparent',
    },
    {
      label: 'Нийт лайк',
      value: formatNumber(totalLikes),
      meta: 'Уншигчдын урвал',
      icon: Heart,
      tone: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    },
  ];

  const toggleSort = (value: string) => {
    setActiveFilters((prev) => ({ ...prev, sort: prev.sort === value ? '' : value }));
  };

  const toggleCategory = (value: string) => {
    setActiveFilters((prev) => ({ ...prev, category: prev.category === value ? '' : value }));
  };

    const quickActions = [
      {
        label: 'Тренд нийтлэлүүд',
        description: 'Одоо хүмүүст хамгийн их сонирхол татаж буй контентууд.',
        icon: Flame,
        tone: 'from-amber-500/15 via-amber-500/5 to-transparent',
        onClick: () => toggleSort('trending'),
      },
      {
        label: 'Технологийн мэдээ',
        description: 'Технологи салбарын хамгийн сүүлийн үеийн нийтлэлүүд.',
        icon: Sparkles,
        tone: 'from-blue-500/15 via-blue-500/5 to-transparent',
        onClick: () => toggleCategory('technology'),
      },
      {
        label: 'Бизнесийн анализ',
        description: 'Бизнесийн салбар дахь шинжилгээ, ярилцлагууд.',
        icon: TrendingUp,
        tone: 'from-purple-500/15 via-purple-500/5 to-transparent',
        onClick: () => toggleCategory('business'),
      },
      {
        label: 'Хамгийн их лайктай',
        description: 'Уншигчдаас хамгийн их үнэлгээ авсан контент.',
        icon: Heart,
        tone: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
        onClick: () => toggleSort('most-liked'),
      },
    ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Мэдээ ачааллаж байна...</p>
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
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-6 text-white shadow-lg mobile:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_55%)]" />
        <div className="relative z-10 flex flex-col gap-8 notebook:flex-row notebook:items-center notebook:justify-between">
          <div className="space-y-5 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.35em]">
              <BookOpen className="h-4 w-4" />
              NEWS & STORIES
            </span>
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold leading-tight mobile:text-3xl computer:text-4xl">
                Салбар бүрийн халуун мэдээ, анализ, түүхүүдийг нэг дороос уншаарай
              </h1>
              <p className="text-sm text-blue-100/90 mobile:text-base">
                Тренд нийтлэлүүдийг өдөр бүр шинэчлэн хүргэж, таалагдсан контентдоо like дарж, бусадтай хуваалцан санаагаа солилцоорой.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-indigo-600 transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                Нийтлэл нэмэх
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Шүүлтүүрийг шинэчлэх
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
        filters={newsFilters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearFilters}
      />

      {trendingArticles.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 mobile:flex-row mobile:items-end mobile:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Хамгийн их анхаарал татсан
              </p>
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white mobile:text-2xl">
                Тренд нийтлэлүүд
              </h2>
            </div>
            <span className="text-xs font-semibold text-[var(--color-text-main)]/60 dark:text-white/60">
              Нийт {trendingArticles.length} тренд нийтлэл
            </span>
          </div>
          <div className="grid gap-4 mobile:grid-cols-2 computer:grid-cols-3">
            {trendingArticles.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                onRead={handleReadArticle}
                onLike={handleLikeArticle}
                isLiked={likedArticles.has(article.id)}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 mobile:flex-row mobile:items-end mobile:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
              Бүх нийтлэлүүд
            </p>
            <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white mobile:text-2xl">
              Шүүлтүүрт таарсан нийтлэлүүд
            </h2>
          </div>
          <span className="text-xs font-semibold text-[var(--color-text-main)]/60 dark:text-white/60">
            Харагдаж буй {filteredArticles.length} нийтлэл
          </span>
        </div>

        {regularArticles.length === 0 ? (
          <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-6 text-center text-sm text-[var(--color-text-main)]/70">
            Таны сонгосон шүүлтүүрт тохирох нийтлэл одоогоор алга. Өөр ангилал, эрэмбэ сонгож дахин үзнэ үү.
          </div>
        ) : (
          <div className="grid gap-4 mobile:grid-cols-2 computer:grid-cols-3">
            {regularArticles.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                onRead={handleReadArticle}
                onLike={handleLikeArticle}
                isLiked={likedArticles.has(article.id)}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        )}
      </section>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-6 shadow-2xl mobile:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="relative">
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute -right-2 -top-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] text-[var(--color-text-main)] shadow-lg transition hover:bg-red-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Article Image */}
            <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-2xl">
              <img
                src={selectedArticle.image}
                alt={selectedArticle.title}
                className="h-full w-full object-cover"
              />
              {selectedArticle.trending && (
                <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                  <Flame className="h-4 w-4" />
                  Тренд
                </span>
              )}
            </div>

            {/* Article Header */}
            <div className="mb-6 space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-main)]">
                {selectedArticle.category}
              </span>
              
              <h1 className="text-2xl font-bold text-[var(--color-text-main)] mobile:text-3xl computer:text-4xl">
                {selectedArticle.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-main)]/70">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {selectedArticle.author}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(selectedArticle.publishedAt, 'mn-MN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {selectedArticle.readTime} мин унших
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {formatNumber(selectedArticle.views)} үзсэн
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="h-4 w-4" />
                  {formatNumber(selectedArticle.likes)} лайк
                </span>
              </div>
            </div>

            {/* Article Excerpt */}
            <div className="mb-6 rounded-2xl border border-[var(--color-border-soft)] bg-blue-500/5 p-4">
              <p className="text-base font-medium italic text-[var(--color-text-main)]/80">
                {selectedArticle.excerpt}
              </p>
            </div>

            {/* Article Content */}
            <div className="prose prose-slate max-w-none dark:prose-invert">
              <div
                className="whitespace-pre-wrap text-base leading-relaxed text-[var(--color-text-main)]"
                style={{ wordBreak: 'break-word' }}
              >
                {selectedArticle.content}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--color-border-soft)] pt-6">
              <button
                type="button"
                onClick={() => handleLikeArticle(selectedArticle.id)}
                disabled={!user}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                  !user
                    ? 'border-gray-300/50 bg-white/60 text-gray-400 cursor-not-allowed dark:bg-slate-800/60 dark:border-gray-600/50'
                    : likedArticles.has(selectedArticle.id)
                    ? 'border-rose-400 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/20 dark:text-rose-400'
                    : 'border-[var(--color-border-soft)] text-[var(--color-text-main)] hover:border-rose-400 hover:text-rose-500'
                }`}
                title={!user ? 'Нэвтэрч орсны дараа таалагдах боломжтой' : ''}
              >
                <Heart className={`h-4 w-4 ${likedArticles.has(selectedArticle.id) && user ? 'fill-rose-500 dark:fill-rose-400' : ''}`} />
                Таалагдлаа
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Хаах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}