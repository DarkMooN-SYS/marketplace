import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  Target,
  Clock,
  Trophy,
  ArrowRight,
  Flame,
  SlidersHorizontal,
} from 'lucide-react';
import SurveyCard from '../components/SurveyCard';
import FilterBar from '../components/FilterBar';
import SurveyFlowModal from '../components/SurveyFlowModal';
import type { SurveyQuestion } from '../utils/adminContentStorage';
import { api } from '../api/adminApi';

const surveyFilters = [
  {
    key: 'category',
    label: 'Ангилал',
    options: [
      { value: 'shopping', label: 'Дэлгүүр хэсэх' },
      { value: 'technology', label: 'Технологи' },
      { value: 'health', label: 'Эрүүл мэнд' },
      { value: 'lifestyle', label: 'Амьдралын хэв маяг' },
    ],
  },
  {
    key: 'duration',
    label: 'Үргэлжлэх хугацаа',
    options: [
      { value: 'short', label: 'Түргэн (≤10 мин)' },
      { value: 'medium', label: 'Дунд (10-20 мин)' },
      { value: 'long', label: 'Урт (>20 мин)' },
    ],
  },
  {
    key: 'reward',
    label: 'Шагналын төрөл',
    options: [
      { value: 'points', label: 'Оноо' },
      { value: 'cash', label: 'Бэлэн мөнгө' },
    ],
  },
  {
    key: 'sort',
    label: 'Эрэмбэлэх',
    options: [
      { value: 'newest', label: 'Шинэчлэлээр' },
      { value: 'reward', label: 'Их шагналтай' },
      { value: 'rating', label: 'Өндөр үнэлгээтэй' },
      { value: 'duration', label: 'Богино хугацаатай' },
    ],
  },
];

const quickFilters = [
  { id: 'duration:short', label: '≤ 10 минутын судалгаа', key: 'duration', value: 'short' },
  { id: 'reward:cash', label: 'Бэлэн мөнгөний шагнал', key: 'reward', value: 'cash' },
  { id: 'sort:reward', label: 'Их шагналтайгаар эрэмблэх', key: 'sort', value: 'reward' },
  { id: 'sort:duration', label: 'Хугацаагаар эрэмблэх', key: 'sort', value: 'duration' },
];

function getFilterLabel(key: string, value: string) {
  const filter = surveyFilters.find((item) => item.key === key);
  const option = filter?.options.find((opt) => opt.value === value);
  return option?.label ?? value;
}

type SurveyItem = {
  id: string;
  title: string;
  description: string;
  reward: number;
  rewardType: 'points' | 'cash';
  duration: number;
  category: string;
  rating: number;
  responses: number;
  featured?: boolean;
  createdAt?: string;
  durationRange?: {
    min: number;
    max: number;
  };
  questions?: SurveyQuestion[];
};

const normalizeSurvey = (survey: Partial<SurveyItem> & {
  id: string;
  title: string;
  description: string;
  reward: number;
  rewardType: 'points' | 'cash';
  duration: number;
  category: string;
}): SurveyItem => ({
  rating: survey.rating ?? 4.5,
  responses: survey.responses ?? 0,
  featured: survey.featured ?? false,
  durationRange: survey.durationRange,
  questions: survey.questions,
  createdAt: survey.createdAt,
  ...survey,
});

type BaseSurvey = {
  id: string;
  title: string;
  description: string;
  category: string;
  authorId?: string;
  createdAt: string | Date;
  status: string;
  questions?: SurveyQuestion[];
};

// Removed deprecated loadSurveys function - using API data instead

export default function Surveys() {
  const [surveysData, setSurveysData] = useState<BaseSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 🆕 Default sort: newest (шинэ судалгаа эхэнд)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    sort: 'newest'
  });
  const [activeSurvey, setActiveSurvey] = useState<SurveyItem | null>(null);

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        setLoading(true);
        const response = await api.surveys.getAll();
        setSurveysData(response.surveys || []);
      } catch (err) {
        console.error('Error fetching surveys:', err);
        setError('Failed to load surveys');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();

    // Auto-refresh every 5 minutes (optimized for performance)
    const interval = setInterval(fetchSurveys, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const catalog = useMemo(() => {
    const normalized: SurveyItem[] = surveysData.map((item) => 
      normalizeSurvey({
        id: item.id,
        title: item.title,
        description: item.description,
        reward: 100,
        rewardType: 'points' as const,
        duration: 5,
        category: item.category,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString(),
        questions: item.questions
      })
    );
    return normalized;
  }, [surveysData]);

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setActiveFilters({});
  };

  const handleRemoveFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleQuickFilter = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  };



  const filteredSurveys = useMemo(() => {
    let result = [...catalog];

    if (activeFilters.category) {
      result = result.filter(
        (survey) => survey.category.toLowerCase() === activeFilters.category.toLowerCase(),
      );
    }

    if (activeFilters.duration) {
      result = result.filter((survey) => {
        if (activeFilters.duration === 'short') return survey.duration <= 10;
        if (activeFilters.duration === 'medium') return survey.duration > 10 && survey.duration <= 20;
        return survey.duration > 20;
      });
    }

    if (activeFilters.reward) {
      result = result.filter((survey) => survey.rewardType === activeFilters.reward);
    }

    if (activeFilters.sort) {
      result.sort((a, b) => {
        switch (activeFilters.sort) {
          case 'reward':
            return b.reward - a.reward;
          case 'rating':
            return b.rating - a.rating;
          case 'duration':
            return a.duration - b.duration;
          case 'newest':
          default:
            return Number(b.id) - Number(a.id);
        }
      });
    }

    return result;
  }, [activeFilters, catalog]);

  const featuredSurveys = useMemo(
    () => filteredSurveys.filter((survey) => Boolean(survey.featured)),
    [filteredSurveys],
  );

  const otherSurveys = useMemo(
    () => filteredSurveys.filter((survey) => !survey.featured),
    [filteredSurveys],
  );

  const quickStartSurveys = useMemo(
    () => filteredSurveys.filter((survey) => survey.duration <= 10).slice(0, 3),
    [filteredSurveys],
  );

  const highRewardSurveys = useMemo(
    () =>
      filteredSurveys
        .filter((survey) => survey.rewardType === 'cash' || survey.reward >= 180)
        .slice(0, 3),
    [filteredSurveys],
  );

  const averageDuration =
    filteredSurveys.length > 0
      ? Math.round(
          filteredSurveys.reduce((acc, survey) => acc + survey.duration, 0) / filteredSurveys.length,
        )
      : 0;

  const averageRewardPoints =
    filteredSurveys.length > 0
      ? Math.round(
          filteredSurveys.reduce((acc, survey) => acc + survey.reward, 0) / filteredSurveys.length,
        )
      : 0;

  const activeFilterEntries = Object.entries(activeFilters).filter(([, value]) => value);

  const handleTakeSurvey = (id: string) => {
    setActiveSurvey(() => {
      const fromCatalog = catalog.find((survey) => survey.id === id);
      return fromCatalog ?? null;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Судалгаанууд ачааллаж байна...</p>
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
    <div className="flex flex-col gap-[var(--section-gap)]">
      <section className="relative overflow-hidden rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-[var(--card-padding)] text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_55%)]" />
        <div className="relative z-10 flex flex-col gap-[var(--card-gap)] notebook:flex-row notebook:items-center notebook:justify-between">
          <div className="space-y-5 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em]">
              <Sparkles className="h-4 w-4" />
              СУДАЛГААНЫ ХӨТӨЛБӨР
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight mobile:text-4xl computer:text-5xl">
                Судалгаа бөглөж оноо, бэлэн мөнгөний шагналыг бодитоор авах боломж
              </h1>
              <p className="text-base text-blue-100/90 mobile:text-lg">
                Платформын санал болгож буй шинэ судалгаануудыг үзэж, богино хугацаанд олон төрлийн шагнал цуглуулцгаая.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleQuickFilter('sort', 'reward')}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                Их шагналтай судалгаанууд
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Шүүлтүүрийг дахин тохируулах
              </button>
            </div>
          </div>

          <div className="grid gap-4 mobile:grid-cols-2 notebook:grid-cols-1 notebook:w-72">
            <div className="rounded-[var(--card-radius)] border border-white/25 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3 text-white/90">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                  <Target className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm opacity-80">Нийт нээлттэй судалгаа</p>
                  <p className="text-2xl font-semibold">{filteredSurveys.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[var(--card-radius)] border border-white/25 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center gap-3 text-white/90">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                  <Clock className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm opacity-80">Дундаж хугацаа</p>
                  <p className="text-2xl font-semibold">{averageDuration} мин</p>
                </div>
              </div>
            </div>
            <div className="rounded-[var(--card-radius)] border border-white/25 bg-white/10 p-4 backdrop-blur notebook:col-span-1">
              <div className="flex items-center gap-3 text-white/90">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                  <Trophy className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm opacity-80">Дундаж шагнал</p>
                  <p className="text-2xl font-semibold">{averageRewardPoints} оноо</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
          <div className="flex items-center gap-2 text-[var(--color-text-main)] dark:text-white">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Түргэн шүүлтүүр</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Нэг товшилтоор хамгийн тохиромжтой судалгааг хай.</p>
            </div>
          </div>
          {activeFilterEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-300">Идэвхтэй:</span>
              {activeFilterEntries.map(([key, value]) => (
                <button
                  key={`${key}-${value}`}
                  type="button"
                  onClick={() => handleRemoveFilter(key)}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-3 py-1 font-semibold text-[var(--color-text-main)] shadow-sm transition hover:bg-blue-50 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white"
                >
                  {getFilterLabel(key, value)}
                  <span className="text-slate-400">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

    <div className="flex flex-wrap gap-3">
          {quickFilters.map((item) => {
            const isActive = activeFilters[item.key] === item.value;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleQuickFilter(item.key, item.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'border-blue-500 bg-blue-500 text-white shadow'
                    : 'border-[var(--color-border-soft)] bg-white/80 text-[var(--color-text-main)] hover:border-blue-400 hover:text-blue-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-white'
                }`}
              >
                <Flame className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      <FilterBar
        filters={surveyFilters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearFilters}
      />

      {featuredSurveys.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 mobile:flex-row mobile:items-end mobile:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Хамт олны сонголт</p>
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white mobile:text-2xl">
                Онцлох судалгаанууд
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Дундаж шагнал: {averageRewardPoints} оноо · Дундаж хугацаа: {averageDuration} мин
            </p>
          </div>

          <div className="grid gap-4 mobile:grid-cols-2 computer:grid-cols-3">
            {featuredSurveys.map((survey) => (
              <SurveyCard key={survey.id} survey={survey} onTake={handleTakeSurvey} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 notebook:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <header className="flex flex-col gap-2 mobile:flex-row mobile:items-end mobile:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Бүх боломжууд</p>
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white mobile:text-2xl">
                Бүх судалгааны жагсаалт
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
              Харуулж буй {filteredSurveys.length} судалгаанаас {featuredSurveys.length} нь онцлох
            </span>
          </header>

          <div className="grid gap-4 mobile:grid-cols-2 computer:grid-cols-3">
            {(otherSurveys.length > 0 ? otherSurveys : featuredSurveys).map((survey) => (
              <SurveyCard key={survey.id} survey={survey} onTake={handleTakeSurvey} />
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          {quickStartSurveys.length > 0 && (
            <div className="rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-5 shadow-sm dark:bg-slate-900">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)] dark:text-white">
                <Clock className="h-4 w-4" />
                Богино хугацааны судалгаанууд
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">5-10 минутын дотор дуусгах боломжтой.</p>
              <div className="mt-4 space-y-3">
                {quickStartSurveys.map((survey) => (
                  <button
                    key={survey.id}
                    type="button"
                    onClick={() => handleTakeSurvey(survey.id)}
                    className="w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-4 py-3 text-left text-sm font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-blue-500 hover:text-blue-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-white"
                  >
                    {survey.title}
                    <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">{survey.duration} минут · {survey.reward} {survey.rewardType === 'cash' ? '₮' : 'оноо'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {highRewardSurveys.length > 0 && (
            <div className="rounded-[var(--card-radius)] border border-[var(--color-border-soft)] bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent p-5 shadow-sm dark:from-amber-500/20 dark:via-orange-500/20">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)] dark:text-white">
                <Trophy className="h-4 w-4" />
                Шагнал өндөртэй судалгаанууд
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Бэлэн мөнгө болон өндөр оноотой судалгаануудыг эндээс шууд эхлүүлээрэй.</p>
              <div className="mt-4 space-y-3">
                {highRewardSurveys.map((survey) => (
                  <button
                    key={survey.id}
                    type="button"
                    onClick={() => handleTakeSurvey(survey.id)}
                    className="group flex w-full items-center justify-between rounded-2xl border border-white/50 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-white"
                  >
                    <span>{survey.title}</span>
                    <span className="text-xs text-blue-600 transition group-hover:translate-x-1">{survey.reward} {survey.rewardType === 'cash' ? '₮' : 'оноо'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>

        {activeSurvey && (
          <SurveyFlowModal
            survey={activeSurvey}
            onClose={() => setActiveSurvey(null)}
          />
        )}
    </div>
  );
}