import { Clock, Star, Trophy, Users } from 'lucide-react';

interface Survey {
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
}

interface SurveyCardProps {
  survey: Survey;
  onTake: (id: string) => void;
}

export default function SurveyCard({ survey, onTake }: SurveyCardProps) {
  const rewardText = survey.rewardType === 'cash'
    ? `${survey.reward.toLocaleString('en-US')} ₮`
    : `${survey.reward.toLocaleString('en-US')} оноо`;

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl notebook:rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900 ${
        survey.featured ? 'ring-2 ring-blue-500/60' : ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 dark:via-slate-900/20" />

      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 gap-y-4">
          <div className="min-w-[200px] flex-1 space-y-2">
            {survey.featured && (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                <Star className="h-4 w-4" />
                Онцлох судалгаа
              </span>
            )}
            <h3 className="text-base font-semibold leading-snug text-[var(--color-text-main)] text-balance line-clamp-2 dark:text-white">
              {survey.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
              {survey.description}
            </p>
          </div>
          <div className="flex min-w-[120px] shrink-0 flex-col items-end gap-2 text-right">
            <span className="inline-flex min-w-[110px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
              <Trophy className="h-4 w-4" />
              {rewardText}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {survey.responses.toLocaleString('en-US')} хүн оролцсон
            </span>
          </div>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,_minmax(128px,_1fr))]">
          <div className="flex min-h-[52px] min-w-[128px] items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-3 py-2 text-xs font-semibold text-[var(--color-text-main)] dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-white/80">
            <Clock className="h-4 w-4" />
            <span className="text-balance leading-snug">{survey.duration} минут</span>
          </div>
          <div className="flex min-h-[52px] min-w-[128px] items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-3 py-2 text-xs font-semibold text-[var(--color-text-main)] dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-white/80">
            <Star className="h-4 w-4" />
            <span className="text-balance leading-snug">Үнэлгээ {survey.rating.toFixed(1)}</span>
          </div>
          <div className="flex min-h-[52px] min-w-[128px] items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-3 py-2 text-xs font-semibold text-[var(--color-text-main)] dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-white/80">
            <Users className="h-4 w-4" />
            <span className="text-balance leading-snug">Ангилал: {survey.category}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 mobile:flex-row mobile:items-center mobile:justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 text-[11px] font-semibold text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200">
              {survey.rewardType === 'cash' ? 'Бэлэн мөнгө' : 'Оноо' }
            </span>
          </div>
          <button
            type="button"
            onClick={() => onTake(survey.id)}
            className="inline-flex min-w-[170px] items-center justify-center rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500"
          >
            Судалгааг эхлэх
          </button>
        </div>
      </div>
    </article>
  );
}