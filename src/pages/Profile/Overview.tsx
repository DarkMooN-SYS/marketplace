import React, { useMemo } from 'react';
import { CalendarDays, MapPin, Phone, ShieldCheck, Trophy, TrendingUp } from 'lucide-react';
import { formatDate, formatNumber } from '../../utils/dateHelpers';

const tierAnchors = [
  { label: 'Starter', value: 0 },
  { label: 'Bronze', value: 300 },
  { label: 'Silver', value: 700 },
  { label: 'Gold', value: 1500 },
  { label: 'Diamond', value: 3000 },
];

interface OverviewProfile {
  name?: string;
  email?: string;
  memberSince?: string;
  location?: string;
  phone?: string;
  points?: number;
}

interface OverviewProps {
  profile: OverviewProfile;
  membershipTier: string;
  nextMilestone: string;
  showMembership?: boolean;
}

const Overview: React.FC<OverviewProps> = ({ profile, membershipTier, nextMilestone, showMembership = true }) => {
  const points = profile.points ?? 0;

  const progress = useMemo(() => {
    const nextAnchor = tierAnchors.find((anchor) => points < anchor.value);
    const currentAnchor = [...tierAnchors].reverse().find((anchor) => points >= anchor.value) ?? tierAnchors[0];

    if (!nextAnchor) {
      return { percentage: 100, current: currentAnchor, next: null } as const;
    }

    const span = nextAnchor.value - currentAnchor.value || 1;
    const percentage = Math.min(100, Math.max(0, ((points - currentAnchor.value) / span) * 100));

    return { percentage, current: currentAnchor, next: nextAnchor } as const;
  }, [points]);

  const memberSinceLabel = useMemo(() => {
    if (!profile.memberSince) {
      return 'Тодорхойгүй';
    }
    try {
      return formatDate(profile.memberSince, 'mn-MN', {
        year: 'numeric',
        month: 'long',
      }, 'Мэдээлэл байхгүй');
    } catch {
      return profile.memberSince;
    }
  }, [profile.memberSince]);

  const formattedPhone = useMemo(() => {
    if (!profile.phone) {
      return null;
    }
    const digits = profile.phone.replace(/\D/g, '');
    if (digits.length === 8) {
      return `+976 ${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    if (profile.phone.startsWith('+')) {
      return profile.phone;
    }
    return profile.phone;
  }, [profile.phone]);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-border-main bg-bg-main dark:bg-slate-900 shadow-sm p-5 sm:p-6 space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-text-main dark:text-white">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              Хувийн мэдээлэл
            </h3>
            {showMembership && (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-300">
                <Trophy className="h-4 w-4" />
                {membershipTier}
              </span>
            )}
          </header>

          <div className="space-y-3 text-xs sm:text-sm text-text-main/80 dark:text-white/70">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wide text-text-main/50 dark:text-white/50">Гишүүн болсон</p>
                <p className="font-medium text-text-main dark:text-white">{memberSinceLabel}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-rose-500 flex-shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wide text-text-main/50 dark:text-white/50">Байршил</p>
                <p className="font-medium text-text-main dark:text-white">{profile.location || 'Улаанбаатар, Монгол'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wide text-text-main/50 dark:text-white/50">Холбоо барих</p>
                <p className="font-medium text-text-main dark:text-white">{formattedPhone || 'Мэдээлэл байхгүй'}</p>
              </div>
            </div>
          </div>
        </article>

        {showMembership && (
          <article className="rounded-2xl border border-border-main bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-purple-500/15 dark:from-indigo-500/10 dark:via-blue-500/10 dark:to-purple-500/5 p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-text-main dark:text-white">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Гишүүнчлэлийн ахиц
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-text-main/60 dark:text-white/60 mb-2">
                  <span>{progress.current.label}</span>
                  <span>{progress.next ? progress.next.label : 'Diamond'}</span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/30 dark:bg-slate-800">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-text-main/60 dark:text-white/60">Нийт оноо</p>
                  <p className="mt-1 text-base sm:text-lg font-semibold text-text-main dark:text-white">{formatNumber(points)}</p>
                </div>
                <div className="rounded-xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-text-main/60 dark:text-white/60">Одоогийн түвшин</p>
                  <p className="mt-1 text-base sm:text-lg font-semibold text-text-main dark:text-white">{membershipTier}</p>
                </div>
                <div className="rounded-xl bg-white/70 dark:bg-slate-900/60 border border-white/40 dark:border-slate-800 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-text-main/60 dark:text-white/60">Дараагийн түвшин</p>
                  <p className="mt-1 text-base sm:text-lg font-semibold text-text-main dark:text-white">{nextMilestone}</p>
                </div>
              </div>
            </div>
          </article>
        )}
      </section>
    </div>
  );
};

export default Overview;
