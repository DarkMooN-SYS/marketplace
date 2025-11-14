import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import ProfileEdit from './Profile/ProfileEdit';
import Overview from './Profile/Overview';
import Orders from './Profile/Orders';
import Wishlist from './Profile/Wishlist';
import Payments from './Profile/Payments';
import Security from './Profile/Security';
import Reviews from './Profile/Reviews';
import Activities from './Profile/Activities';
import { getMembershipTier, getNextMilestone } from '../constants/membership';
import { profileApi } from '../api/profileApi';
import { formatDate } from '../utils/dateHelpers';
import { DEFAULT_AVATARS } from '../utils/avatarHelper';
import {
  User,
  ShoppingCart,
  Heart,
  CreditCard,
  Shield,
  MessageSquare,
  Edit3,
  Sparkles,
  Trophy,
  Star,
  CalendarDays,
  Phone,
  MapPin,
  Wallet,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type TabKey =
  | 'overview'
  | 'orders'
  | 'wishlist'
  | 'editprofile'
  | 'payments'
  | 'security'
  | 'reviews'
  | 'activities';

interface ProfileState {
  name?: string;
  email?: string;
  avatar: string;
  memberSince: string;
  points: number;
  balance: number;
  phone?: string;
  location?: string;
  title?: string;
}

interface TabItem {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

const tabs: TabItem[] = [
  { key: 'overview', label: 'Хураангуй', icon: User },
  { key: 'orders', label: 'Захиалгууд', icon: ShoppingCart },
  { key: 'wishlist', label: 'Хадгалсан', icon: Heart },
  { key: 'editprofile', label: 'Профайл засах', icon: Edit3 },
  { key: 'payments', label: 'Төлбөрүүд', icon: CreditCard },
  { key: 'security', label: 'Аюулгүй байдал', icon: Shield },
  { key: 'reviews', label: 'Сэтгэгдэл', icon: MessageSquare },
  { key: 'activities', label: 'Үйл ажиллагаа', icon: Activity },
];

const Profile: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileState>(() => {
    const baseProfile: ProfileState = {
  name: isAdmin ? 'Admin' : user?.name ?? '',
      email: user?.phone ? `${user.phone}@mail.mn` : '',
  avatar: isAdmin ? '/img/AdminChat.png' : user?.avatar ?? DEFAULT_AVATARS.default,
      memberSince: new Date().toISOString(),
      points: user?.points ?? 0,
      balance: user?.balance ?? 0,
      phone: user?.phone,
      location: 'Улаанбаатар',
  title: isAdmin ? 'Admin' : 'Marketplace хэрэглэгч',
    };

    if (isAdmin) {
      return baseProfile;
    }

    if (typeof window === 'undefined') {
      return baseProfile;
    }

    const saved = localStorage.getItem('profile');
    if (!saved) {
      return baseProfile;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<ProfileState>;
      const merged = { ...baseProfile, ...parsed };
      if (!merged.avatar) {
        merged.avatar = DEFAULT_AVATARS.default;
      }
      return merged;
    } catch (error) {
      console.warn('Failed to parse stored profile', error);
      return baseProfile;
    }
  });

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || isAdmin) {
      return;
    }
    localStorage.setItem('profile', JSON.stringify(profile));
  }, [isAdmin, profile]);

  // Backend-ээс profile татах
  useEffect(() => {
    // Хэрэглэгч нэвтрээгүй эсвэл admin бол API дуудалт хийхгүй
    if (!user || isAdmin) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const backendProfile = await profileApi.getProfile();
        setProfile({
          name: backendProfile.name,
          email: backendProfile.email,
          avatar: backendProfile.avatar || DEFAULT_AVATARS.default,
          memberSince: backendProfile.createdAt || new Date().toISOString(),
          points: backendProfile.points,
          balance: backendProfile.balance,
          phone: backendProfile.phone,
          location: backendProfile.location || 'Улаанбаатар',
          title: backendProfile.title || 'Marketplace хэрэглэгч',
        });
      } catch (error) {
        console.error('Failed to fetch profile from backend:', error);
        // localStorage-с унших, эсвэл default утга ашиглах
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, isAdmin]);

  // Re-fetch profile when switching to overview tab to show updated points
  useEffect(() => {
    // Хэрэглэгч нэвтрээгүй эсвэл admin бол, эсвэл overview tab биш бол дуудалт хийхгүй
    if (!user || isAdmin || activeTab !== 'overview') return;
    
    const refetchProfile = async () => {
      try {
        const backendProfile = await profileApi.getProfile();
        setProfile((prev) => ({
          ...prev,
          points: backendProfile.points,
          balance: backendProfile.balance,
        }));
      } catch (error) {
        console.error('Failed to refresh profile:', error);
      }
    };

    refetchProfile();
  }, [activeTab, user, isAdmin]);

  const [editAvatar, setEditAvatar] = useState(profile.avatar);
  const [editName, setEditName] = useState(profile.name);

  // Энэ useEffect-г устгасан - handleSave дээр л profile шинэчлэгдэнэ
  // useEffect нь editAvatar, editName өөрчлөгдөх бүрд profile-г шинэчилж байсан
  // Энэ нь ProfileEdit компонент руу avatar prop дахин явуулж, localAvatar-ийг reset хийж байлаа

  useEffect(() => {
    if (isAdmin) {
  setEditAvatar('/img/AdminChat.png');
  setEditName('Admin');
      return;
    }
    setEditAvatar(profile.avatar);
    setEditName(profile.name);
  }, [isAdmin, profile.avatar, profile.name]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    setProfile((prev) => {
  if (prev.name === 'Admin' && prev.avatar === '/img/AdminChat.png') {
        return prev;
      }
      return {
        ...prev,
  name: 'Admin',
  avatar: '/img/AdminChat.png',
      };
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!user) {
      return;
    }
    setProfile((prev) => {
      const next = { ...prev };
      let changed = false;

      if (!prev.name && user.name) {
        next.name = user.name;
        changed = true;
      }

      if ((!prev.avatar || prev.avatar === DEFAULT_AVATARS.default) && user.avatar) {
        next.avatar = user.avatar;
        changed = true;
      }

      if (!prev.phone && user.phone) {
        next.phone = user.phone;
        changed = true;
      }

      if (typeof user.points === 'number' && user.points !== prev.points) {
        next.points = user.points;
        changed = true;
      }

      if (typeof user.balance === 'number' && user.balance !== prev.balance) {
        next.balance = user.balance;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [user]);

  const points = profile.points ?? 0;
  const balance = profile.balance ?? 0;

  const membershipTier = useMemo(() => getMembershipTier(points), [points]);

  const nextMilestone = useMemo(() => getNextMilestone(points), [points]);

  const memberSinceLabel = useMemo(() => {
    return formatDate(profile.memberSince, 'mn-MN', {
      year: 'numeric',
      month: 'long',
    }, 'Мэдээлэл байхгүй');
  }, [profile.memberSince]);

  const formattedPhone = useMemo(() => {
    const raw = profile.phone || user?.phone;
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 8) {
      return `+976 ${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    if (raw.startsWith('+')) {
      return raw;
    }
    return raw;
  }, [profile.phone, user?.phone]);

  const stats = useMemo(() => {
    if (isAdmin) {
      return [];
    }
    return [
      {
        label: 'Дансны үлдэгдэл',
        value: `₮${balance.toLocaleString('en-US')}`,
        icon: <Wallet className="h-5 w-5" />,
      },
      {
        label: 'Нийт оноо',
        value: points.toLocaleString('en-US'),
        icon: <Star className="h-5 w-5" />,
      },
      {
        label: 'Гишүүнчлэл',
        value: membershipTier,
        icon: <Trophy className="h-5 w-5" />,
      },
    ];
  }, [isAdmin, membershipTier, balance, points]);

  const availableTabs = useMemo(
    () =>
      isAdmin
        ? tabs.filter((tab) => tab.key === 'overview' || tab.key === 'security')
        : tabs,
    [isAdmin]
  );

  useEffect(() => {
    if (availableTabs.length === 0) {
      return;
    }
    const isActiveAllowed = availableTabs.some((tab) => tab.key === activeTab);
    if (!isActiveAllowed) {
      setActiveTab(availableTabs[0].key as TabKey);
    }
  }, [activeTab, availableTabs]);

  const renderTabs = (orientation: 'horizontal' | 'vertical') =>
    availableTabs.map((tab) => {
      const isActive = tab.key === activeTab;
      const Icon = tab.icon;
      const iconSizeClass =
        orientation === 'horizontal'
          ? 'h-4 w-4 sm:h-5 sm:w-5'
          : 'h-4 w-4 lg:h-5 lg:w-5';
      const iconWrapperClass =
        'flex-shrink-0 inline-flex items-center justify-center rounded-full bg-blue-600/5 dark:bg-white/10 p-1';

      if (orientation === 'horizontal') {
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 sm:px-3 py-2 sm:py-2.5 min-w-[68px] sm:min-w-[80px] font-medium transition-all text-[11px] sm:text-xs ${
              isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                : 'bg-white dark:bg-slate-800/90 text-blue-700 dark:text-slate-100 border border-blue-100/60 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600'
            }`}
          >
            <span className={iconWrapperClass}>
              <Icon className={iconSizeClass} />
            </span>
            <span className="leading-tight text-center truncate w-full">{tab.label}</span>
          </button>
        );
      }

      return (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex items-center justify-between gap-2 lg:gap-3 rounded-xl px-3 lg:px-3.5 py-2 lg:py-2.5 text-xs lg:text-sm font-medium transition-all ${
            isActive
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'border border-border-main bg-transparent text-text-main dark:text-white hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-300'
          }`}
        >
          <span className="flex items-center gap-1.5 lg:gap-2">
            <span className={iconWrapperClass}>
              <Icon className={iconSizeClass} />
            </span>
            <span className="leading-tight">{tab.label}</span>
          </span>
          {isActive && <span className="h-1.5 w-1.5 lg:h-2 lg:w-2 rounded-full bg-white flex-shrink-0" />}
        </button>
      );
    });

  function renderTabContent() {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview
            profile={profile}
            membershipTier={membershipTier}
            nextMilestone={nextMilestone}
            showMembership={!isAdmin}
          />
        );
      case 'orders':
        if (isAdmin) {
          return (
            <div className="rounded-3xl border border-border-main bg-white/80 p-6 text-sm text-text-main dark:border-white/10 dark:bg-slate-900/80 dark:text-white/70">
              Админ эрхтэй хэрэглэгчдэд энэ хэсэг харагдахгүй.
            </div>
          );
        }
        return <Orders />;
      case 'wishlist':
        if (isAdmin) {
          return (
            <div className="rounded-3xl border border-border-main bg-white/80 p-6 text-sm text-text-main dark:border-white/10 dark:bg-slate-900/80 dark:text-white/70">
              Админ эрхтэй хэрэглэгчдэд энэ хэсэг харагдахгүй.
            </div>
          );
        }
        return <Wishlist isMobile={isMobile} />;
      case 'editprofile': {
        if (isAdmin) {
          return (
            <div className="rounded-3xl border border-border-main bg-white/80 p-6 text-sm text-text-main dark:border-white/10 dark:bg-slate-900/80 dark:text-white/70">
              Admin нэр, зураг системээс тогтоосон бөгөөд өөрчлөх боломжгүй.
            </div>
          );
        }
        const handleSave = async (avatar: string, name: string) => {
          try {
            // Backend рүү update илгээх
            await profileApi.updateProfile({ name, avatar });
            
            // Local state шинэчлэх
            const updatedProfile = { ...profile, avatar, name };
            setProfile(updatedProfile);
            
            // localStorage шинэчлэх
            if (typeof window !== 'undefined') {
              localStorage.setItem('profile', JSON.stringify(updatedProfile));
              
              // Header-д мэдээлэл шинэчлүүлэх event trigger
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'profile',
                newValue: JSON.stringify(updatedProfile),
                oldValue: localStorage.getItem('profile'),
                url: window.location.href,
                storageArea: localStorage
              }));
            }
          } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Профайл шинэчлэхэд алдаа гарлаа');
          }
        };
        return (
          <ProfileEdit
            avatar={editAvatar}
            name={editName || ''}
            onAvatarChange={setEditAvatar}
            onNameChange={setEditName}
            onSave={handleSave}
          />
        );
      }
      case 'payments':
        if (isAdmin) {
          return (
            <div className="rounded-3xl border border-border-main bg-white/80 p-6 text-sm text-text-main dark:border-white/10 dark:bg-slate-900/80 dark:text-white/70">
              Админ эрхтэй хэрэглэгчдэд энэ хэсэг харагдахгүй.
            </div>
          );
        }
        return <Payments />;
      case 'security':
        return <Security />;
      case 'reviews':
        if (isAdmin) {
          return (
            <div className="rounded-3xl border border-border-main bg-white/80 p-6 text-sm text-text-main dark:border-white/10 dark:bg-slate-900/80 dark:text-white/70">
              Админ эрхтэй хэрэглэгчдэд энэ хэсэг харагдахгүй.
            </div>
          );
        }
        return <Reviews />;
      case 'activities':
        return <Activities />;
      default:
        return null;
    }
  }

  if (loading && !isAdmin) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-text-main dark:text-white">Профайл ачааллаж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 py-4 sm:py-6 lg:py-10 px-3 sm:px-4 lg:px-10 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.6),_transparent_45%)]" />
          <div className="absolute inset-y-0 right-0 w-1/2 opacity-20 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.45),_transparent_55%)]" />
          <div className="relative px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="relative flex-shrink-0">
                  <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur text-white">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <img
                    src={profile.avatar || DEFAULT_AVATARS.default}
                    alt={profile.name || 'Профайл'}
                    className="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-white/40 object-cover shadow-2xl"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2 lg:space-y-3 min-w-0 flex-1">
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] lg:tracking-[0.25em] text-white/70 leading-tight">Миний профайл</p>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-semibold truncate leading-tight">{profile.name || 'Шинэ хэрэглэгч'}</h1>
                    <p className="text-white/80 text-[11px] sm:text-xs lg:text-sm xl:text-base leading-relaxed">
                      {profile.title || 'Marketplace хэрэглэгч'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:gap-3 text-white/80">
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 lg:gap-2 rounded-full bg-white/15 px-2 sm:px-2.5 lg:px-3 py-0.5 sm:py-1 backdrop-blur text-[10px] sm:text-xs lg:text-sm">
                      <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 flex-shrink-0" />
                      <span className="truncate leading-tight">{memberSinceLabel}</span>
                    </span>
                    {formattedPhone && (
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 lg:gap-2 rounded-full bg-white/15 px-2 sm:px-2.5 lg:px-3 py-0.5 sm:py-1 backdrop-blur text-[10px] sm:text-xs lg:text-sm">
                        <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 flex-shrink-0" />
                        <span className="truncate leading-tight">{formattedPhone}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 lg:gap-2 rounded-full bg-white/15 px-2 sm:px-2.5 lg:px-3 py-0.5 sm:py-1 backdrop-blur text-[10px] sm:text-xs lg:text-sm">
                      <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 flex-shrink-0" />
                      <span className="truncate leading-tight">{profile.location || 'Улаанбаатар'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {stats.length > 0 && (
                <div className="w-full lg:max-w-lg grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                  {stats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl sm:rounded-2xl bg-white/15 p-2.5 sm:p-3 lg:p-4 backdrop-blur shadow-lg border border-white/10 flex flex-col gap-1 sm:gap-1.5 lg:gap-2"
                    >
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-wider text-white/70">
                        <span className="truncate leading-tight">{item.label}</span>
                        <span className="flex-shrink-0 scale-75 sm:scale-90 lg:scale-100">{item.icon}</span>
                      </div>
                      <div className="text-base sm:text-lg lg:text-xl xl:text-2xl font-semibold text-white truncate leading-tight">{item.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {!isAdmin && (
                <button
                  onClick={() => setActiveTab('editprofile')}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full bg-white/90 px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs lg:text-sm font-semibold text-blue-700 shadow-lg hover:bg-white transition-colors whitespace-nowrap"
                >
                  <Edit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" />
                  <span className="hidden xs:inline sm:inline">Профайл засах</span>
                  <span className="xs:hidden sm:hidden">Засах</span>
                </button>
              )}
            </div>
          </div>
        </section>

        <nav className="lg:hidden -mx-3 sm:-mx-4 px-3 sm:px-4 border-b border-border-main/30 dark:border-white/5">
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-3 scrollbar-hide">{renderTabs('horizontal')}</div>
        </nav>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[240px,1fr] xl:grid-cols-[260px,1fr]">
          <aside className="hidden lg:flex flex-col gap-4 lg:gap-5 sticky top-28 h-fit">
            <div className="rounded-2xl border border-border-main bg-bg-main text-text-main dark:bg-slate-900 dark:text-white shadow-sm p-4 lg:p-5 space-y-3 lg:space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-main/60 dark:text-white/60">
                Хэсгүүд
              </h3>
              <div className="flex flex-col gap-2">{renderTabs('vertical')}</div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="rounded-2xl sm:rounded-3xl border border-border-main bg-bg-main dark:bg-slate-900 shadow-lg shadow-slate-900/5 dark:shadow-black/40 p-4 sm:p-6 lg:p-8 transition-colors">
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Profile;
