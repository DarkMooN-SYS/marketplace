import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Package,
  Sparkles,
  Clock,
  ShieldCheck,
  PhoneCall,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import ProductForm, { ProductFormValues } from '../components/ProductForm';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/adminApi';

interface StoredProfile {
  name?: string;
  avatar?: string;
  points?: number;
}

const loadStoredProfile = (): StoredProfile | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem('profile');
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as StoredProfile) : null;
  } catch (error) {
    console.warn('Unable to parse stored profile', error);
    return null;
  }
};

const categoryLabelMap: Record<string, string> = {
  electronics: 'Цахилгаан бараа',
  fashion: 'Гоёл загвар',
  furniture: 'Тавилга',
  books: 'Ном',
  sports: 'Спорт, Гадаа',
  other: 'Бусад',
};

export default function SubmitProductPage() {
  const { setCurrentPage } = useNavigation();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [postedCount, setPostedCount] = React.useState(0);
  const [storedProfile, setStoredProfile] = React.useState<StoredProfile | null>(null);

  const promptLogin = (mode: 'login' | 'signup' = 'login') => {
    window.dispatchEvent(
      new CustomEvent('auth:open', {
        detail: { mode },
      })
    );
  };

  const fetchPostedCount = React.useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.products.getMyProducts();
      setPostedCount(response.length);
    } catch (error) {
      console.error('Failed to fetch posted count:', error);
    }
  }, [user]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setStoredProfile(loadStoredProfile());
    fetchPostedCount();
  }, [fetchPostedCount]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setStoredProfile(loadStoredProfile());
  }, [user]);

  const handleSubmit = async (data: ProductFormValues) => {
    if (!user) {
      setErrorMessage('Та бараа нэмэхийн өмнө нэвтэрч орно уу.');
      promptLogin('login');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const categoryLabel = categoryLabelMap[data.category] ?? data.category;
      const storedProfile = loadStoredProfile();
      const sellerName =
        typeof storedProfile?.name === 'string' && storedProfile.name.trim().length > 0
          ? storedProfile.name.trim()
          : user.name;
      const sellerAvatar =
        typeof storedProfile?.avatar === 'string' && storedProfile.avatar.trim().length > 0
          ? storedProfile.avatar
          : user.avatar ?? '/img/human.png';

      const productData = {
        title: data.title.trim(),
        description: data.description.trim(),
        price: data.price,
        currency: '₮' as const,
        location: data.location.trim() || 'Улаанбаатар',
        category: categoryLabel,
        categoryKey: data.category,
        condition: data.condition,
        images: [data.primaryImage, ...data.gallery].filter(Boolean),
        rating: 0,
        reviews: 0,
        views: 0,
        seller: {
          name: sellerName,
          avatar: sellerAvatar,
          rating: 5,
          contact: data.contact.trim(),
        },
        contact: data.contact.trim(),
      };

      // Submit to backend API
      await api.products.create(productData);

      setSuccessMessage('✅ Бараа амжилттай нэмэгдлээ! Marketplace хэсэгт бүх хэрэглэгчдэд харагдаж байна.');

      // Update posted count
      await fetchPostedCount();

      // Refresh products list to include newly added product
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('products:refresh'));
      }

      setTimeout(() => {
        setCurrentPage('marketplace');
        window.location.hash = 'marketplace';
      }, 2000);
    } catch (error) {
      console.error('Failed to submit product:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Тодорхойгүй алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = React.useMemo(() => {
    const candidate = storedProfile?.name ?? user?.name;
    return candidate && candidate.trim().length > 0 ? candidate.trim() : 'Та';
  }, [storedProfile?.name, user?.name]);

  const highlights = [
    {
      title: 'Мэдээллээ бөглөх',
      description: 'Гарчиг, үнэ, тайлбар хэсгийг нарийн бөглөвөл илүү хурдан борлуулна.',
      icon: ClipboardList,
    },
    {
      title: 'Зураг нэмэх',
      description: 'Өндөр чанартай зураг хэрэглэгчийн итгэлийг нэмэгдүүлдэг.',
      icon: Sparkles,
    },
    {
      title: 'Нийтлэх',
      description: 'Илгээсний дараа Marketplace хэсэгт автоматаар нийтлэгдэнэ.',
      icon: Package,
    },
  ];

  const tips = [
    'Үнийн санал, төлбөр, хүргэлтийн нөхцөлийг тодорхой бичих.',
    'Гэмтэл, сэв, хэрэглэж байсан тухай мэдээллийг нуухгүй үнэн зөв тайлбарлах.',
    'Хэрэглэгчийн асуултад хурдан хариулахын тулд холбоо барих сувгуудаа нээлттэй байлгах.',
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-border-main/40 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.35),_transparent_55%)]" />
        <div className="absolute -bottom-16 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-10 px-8 py-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Marketplace Pro зөвлөмж
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {displayName}, бүтээгдэхүүнээ онцгой байршлаас эхэлцгээе
              </h1>
              <p className="text-sm sm:text-base text-white/80">
                Нэмэх гэж буй бараандаа итгэл төрүүлэх бүх мэдээллийг багтааж, худалдан авагчдын анхаарлыг хамгийн богино хугацаанд татах боломжийг эндээс эхлүүлээрэй.
              </p>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/15 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-white/70">Нийт нэмсэн бараа</dt>
                <dd className="mt-2 flex items-baseline gap-1 text-2xl font-semibold">
                  <Package className="h-5 w-5" />
                  {postedCount}
                </dd>
              </div>
              <div className="rounded-2xl bg-white/15 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-white/70">Дундаж нийтлэх хугацаа</dt>
                <dd className="mt-2 flex items-center gap-2 text-2xl font-semibold">
                  <Clock className="h-5 w-5" />
                  1.5 мин
                </dd>
              </div>
              <div className="rounded-2xl bg-white/15 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-white/70">Итгэлцлийн оноо</dt>
                <dd className="mt-2 flex items-center gap-2 text-2xl font-semibold">
                  <ShieldCheck className="h-5 w-5" />
                  {storedProfile?.points ?? user?.points ?? 100}
                </dd>
              </div>
            </dl>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {highlights.map(({ title, description, icon: Icon }) => (
              <li
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-base font-semibold">{title}</p>
                  <p className="text-sm text-white/80">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4">
          {successMessage && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-5 py-4 text-emerald-700 shadow-sm transition-all dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm" role="status" aria-live="polite">
                {successMessage}
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200/70 bg-red-50/70 px-5 py-4 text-red-700 shadow-sm transition-all dark:border-red-800/60 dark:bg-red-900/30 dark:text-red-300">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm" role="alert">
                {errorMessage}
              </span>
            </div>
          )}

          {!user ? (
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border-main/40 bg-white/90 p-8 text-center shadow-xl dark:bg-slate-900/80">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/15" />
              <div className="relative z-10 space-y-4">
                <h2 className="text-2xl font-semibold text-text-main">
                  Нэвтэрч орсноор бараагаа даруй нийтлээрэй
                </h2>
                <p className="mx-auto max-w-md text-sm text-text-main/70">
                  Танай бүтээлийг Marketplace-н шидэт тавцанд аваачихад ганцхан алхам үлдлээ. Нэвтрээд,
                  эсвэл шинэ бүртгэл үүсгээд эхний бараагаа нийтлээрэй.
                </p>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    onClick={() => promptLogin('login')}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Нэвтрэх
                  </button>
                  <button
                    onClick={() => promptLogin('signup')}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-600 px-6 py-3 text-sm font-semibold text-blue-600 transition-transform hover:-translate-y-0.5 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/20"
                  >
                    Шинэ бүртгэл үүсгэх
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="surface-card surface-card--outlined rounded-[1.75rem] border border-border-main/40 shadow-xl">
              <div className="flex flex-col gap-6 border-b border-border-main/20 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-text-main">Барааны дэлгэрэнгүй мэдээлэл</h2>
                  <p className="mt-1 text-sm text-text-main/70">
                    Худалдан авагчдын итгэлийг нэмэгдүүлэхийн тулд аль болох үнэн зөв, тодорхой мэдээлэл илгээж
                    өгнө үү.
                  </p>
                </div>
                <div className="inline-flex items-center gap-3 rounded-full border border-border-main/30 px-4 py-2 text-sm font-medium text-text-main/80">
                  <ClipboardList className="h-4 w-4" />
                  2 үе шаттай алхам
                </div>
              </div>
              <div className="pt-6">
                <ProductForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="surface-card surface-card--outlined rounded-[1.75rem] border border-border-main/40 shadow-lg">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-text-main">Шуурхай зөвлөмж</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-text-main/80">
              {tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.5rem] border border-dashed border-border-main/50 bg-white/60 p-6 shadow-sm dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <h4 className="text-base font-semibold text-text-main">Баталгаажуулалтын урсгал</h4>
                <p className="text-xs uppercase tracking-wide text-text-main/50">Ердөө 2 минут</p>
              </div>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-text-main/80">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  1
                </span>
                <p>Манай баг автомат шалгалтаар зургийг тань баталгаажуулна.</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  2
                </span>
                <p>Зар Marketplace-д нийтлэгдэж, сонирхсон хэрэглэгчид шууд холбогдоно.</p>
              </li>
            </ol>
          </div>

          <div className="surface-card surface-card--outlined rounded-[1.5rem] border border-border-main/40 shadow-lg">
            <div className="flex items-center gap-3">
              <PhoneCall className="h-5 w-5 text-blue-500" />
              <div>
                <h4 className="text-base font-semibold text-text-main">Тусламж хэрэгтэй байна уу?</h4>
                <p className="text-xs uppercase tracking-wide text-text-main/50">24/7 Marketplace support</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-text-main/80">
              Бидний тусгайлсан борлуулалтын баг таны барааг хамгийн өвөрмөц байдлаар харуулахад тусална.
              Чатаар эсвэл утсаар холбогдоорой.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <a
                href="tel:+97677119900"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-300"
              >
                <PhoneCall className="h-4 w-4" />
                +976 7711 9900
              </a>
              <a
                href="mailto:seller-support@3say.mn"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-300"
              >
                <ArrowRight className="h-4 w-4" />
                seller-support@3say.mn
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
