import { useState } from 'react';
import { ShieldAlert, Phone, Lock, Loader2 } from 'lucide-react';
import { AdminLayout, type AdminSection } from './AdminLayout';
import { AdminUsersPage } from './Users';
import { AdminProductsPage } from './Products';
import AdminReviewsPage from './Reviews';
import { NewsSubmissionsPage } from './NewsSubmissions';
import { SurveySubmissionsPage } from './SurveySubmissions';
import { WebLinkSubmissionsPage } from './WebLinkSubmissions';
import { AdvertisementSubmissionsPage } from './AdvertisementSubmissions';
import SpinRewards from './SpinRewards';
import { useAuth } from '../../hooks/useAuth';

const SECTION_COPY: Record<AdminSection, { title: string; description: string }> = {
  users: {
    title: 'Хэрэглэгчдийн удирдлага',
    description: 'Marketplace-ийн идэвхтэй болон түдгэлзүүлсэн хэрэглэгчдийн жагсаалт, оноо, эрхийн мэдээлэл.',
  },
  products: {
    title: 'Бүтээгдэхүүний хяналт',
    description: 'Marketplace дээр байршуулсан бараануудын төлөв, үнэ, үлдэгдэл, категориудыг хянаж удирдана.',
  },
  reviews: {
    title: 'Сэтгэгдлийн хяналт',
    description: 'Бүтээгдэхүүн бүрийн оноо, сэтгэгдлийг шалгаж, шаардлагатай тохиолдолд арга хэмжээ авна.',
  },
  news: {
    title: 'Мэдээ нийтлэл',
    description: 'Комьюнити болон бүтээгдэхүүний талаархи нийтлэл, зарлалыг боловсруулж нийтлэнэ.',
  },
  surveys: {
    title: 'Судалгааны удирдлага',
    description: 'Админаас үүсгэсэн судалгааг хадгалж, Marketplace дээр шууд нийтэлнэ.',
  },
  links: {
    title: 'Web холбоосууд',
    description: 'Хэрэглэгчдэд зориулсан шалгарсан холбоосуудыг нэмэх, онцлох.',
  },
  ads: {
    title: 'Зар сурталчилгаа',
    description: 'Баннер, промо контентуудыг төлөвлөж, идэвхжүүлж, хянах.',
  },
  spinrewards: {
    title: 'Spin Wheel Шагнал',
    description: 'Эргүүлийн хүрдний шагнал, магадлал, утгуудыг тохируулна.',
  },
};

interface AdminRouterProps {
  section: AdminSection;
}

export function AdminRouter({ section }: AdminRouterProps) {
  const { user, login, isLoading } = useAuth();
  const [phone, setPhone] = useState('99119911');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);

  const handleNavigate = (next: AdminSection) => {
    window.location.hash = `admin/${next}`;
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      await login(phone, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Нэвтрэх явцад алдаа гарлаа');
    }
  };

  if (!user) {
    return (
      <div className="mx-auto grid max-w-xl gap-6 rounded-3xl border border-[var(--color-border-soft)] bg-white/80 p-8 text-center shadow-sm dark:border-white/12 dark:bg-slate-900/60">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--color-text-main)] dark:text-white">Админ хэсэгт нэвтрэх</h2>
          <p className="text-sm text-[var(--color-text-main)]/70 dark:text-white/60">
            Админ panel ашиглахын тулд баталгаажсан утасны дугаараар нэвтэрнэ үү. Туршилтын зорилгоор +97699119911 дугаарыг ашиглаж болно.
          </p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
            Утасны дугаар
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/70 px-4 py-2 text-sm dark:border-white/12 dark:bg-white/5">
            <Phone className="h-4 w-4 text-[var(--color-text-main)]/60" />
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-full bg-transparent text-[var(--color-text-main)] outline-none dark:text-white"
              placeholder="99119911"
              required
            />
          </div>
          <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
            Нууц үг (mock)
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/70 px-4 py-2 text-sm dark:border-white/12 dark:bg-white/5">
            <Lock className="h-4 w-4 text-[var(--color-text-main)]/60" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-transparent text-[var(--color-text-main)] outline-none dark:text-white"
              placeholder="Нууц үг"
              required
            />
          </div>
          {error && <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:border-red-400/40 dark:text-red-200">{error}</p>}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="mx-auto grid max-w-xl gap-4 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-8 text-center text-amber-600 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
        <ShieldAlert className="mx-auto h-10 w-10" />
        <h2 className="text-2xl font-semibold">Эрх хүрэлцэхгүй</h2>
        <p className="text-sm">
          Энэ хэсгийг зөвхөн админ эрхтэй хэрэглэгч ашиглана. Та +97699119911 утасны дугаар ашиглан админ эрхээр нэвтрэх боломжтой.
        </p>
      </div>
    );
  }

  const { title, description } = SECTION_COPY[section];

  return (
    <AdminLayout title={title} description={description} activeSection={section} onNavigate={handleNavigate}>
      {section === 'users' && <AdminUsersPage />}
      {section === 'products' && <AdminProductsPage />}
      {section === 'reviews' && <AdminReviewsPage />}
      {section === 'news' && <NewsSubmissionsPage />}
      {section === 'surveys' && <SurveySubmissionsPage />}
      {section === 'links' && <WebLinkSubmissionsPage />}
      {section === 'ads' && <AdvertisementSubmissionsPage />}
      {section === 'spinrewards' && <SpinRewards />}
    </AdminLayout>
  );
}
