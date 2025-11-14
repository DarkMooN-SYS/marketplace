import { useMemo, useState, useEffect } from "react";
import { showConfetti } from "../utils/confetti";
import { useAuth } from "../hooks/useAuth";
import AuthModal from "../components/AuthModal";
import { formatDate } from "../utils/dateHelpers";
import {
  RotateCcw,
  Gift,
  Trophy,
  Coins,
  ShieldCheck,
  Sparkles,
  Info,
} from "lucide-react";

type SegmentType = "discount" | "bonus" | "retry" | "none";

interface WheelSegment {
  id: number;
  label: string;
  icon: string;
  color: string;
  type: SegmentType;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function SpinWheel() {
  const { user, token, refreshUser, isLoading: authLoading } = useAuth();
  const userPoints = user?.points ?? 0;
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastResult, setLastResult] = useState<{ label: string; icon: string; type: SegmentType } | null>(null);
  const [spinsLeft, setSpinsLeft] = useState(3);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ label: string; icon: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Array<{ id: string; reward: string; type: string; date: string }>>([]);
  const [totalSpins, setTotalSpins] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [wheelSegments, setWheelSegments] = useState<WheelSegment[]>([]);

  // Fetch spin data from backend
  useEffect(() => {
    const fetchSpinData = async () => {
      try {
        if (!token || !user) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/spin/data`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSpinsLeft(data.spinsLeft);
          setHistory(data.history || []);
          setTotalSpins(data.totalSpins || 0);
        } else {
          console.error('Failed to fetch spin data:', response.status);
        }

        // Fetch wheel segments configuration
        try {
          const segmentsResponse = await fetch(`${API_BASE_URL}/spin/segments`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (segmentsResponse.ok) {
            const segmentsData = await segmentsResponse.json();
            setWheelSegments(segmentsData.segments || []);
          } else {
            // Use default segments if fetch fails
            setWheelSegments([
              { id: 1, label: "5% хөнгөлөлт", icon: "🎁", color: "#7c3aed", type: "discount" },
              { id: 2, label: "10% бонус", icon: "💰", color: "#ec4899", type: "bonus" },
              { id: 3, label: "15% бонус", icon: "🎉", color: "#22c55e", type: "bonus" },
              { id: 4, label: "Амжилтгүй", icon: "😢", color: "#94a3b8", type: "none" },
              { id: 5, label: "20% хөнгөлөлт", icon: "🏆", color: "#f97316", type: "discount" },
              { id: 6, label: "Дахин оролд", icon: "🔄", color: "#eab308", type: "retry" },
              { id: 7, label: "5% бонус", icon: "🎈", color: "#0ea5e9", type: "bonus" },
              { id: 8, label: "10% хөнгөлөлт", icon: "🎊", color: "#ef4444", type: "discount" },
            ]);
          }
        } catch {
          // Silently use default segments on error
          setWheelSegments([
            { id: 1, label: "5% хөнгөлөлт", icon: "🎁", color: "#7c3aed", type: "discount" },
            { id: 2, label: "10% бонус", icon: "💰", color: "#ec4899", type: "bonus" },
            { id: 3, label: "15% бонус", icon: "🎉", color: "#22c55e", type: "bonus" },
            { id: 4, label: "Амжилтгүй", icon: "😢", color: "#94a3b8", type: "none" },
            { id: 5, label: "20% хөнгөлөлт", icon: "🏆", color: "#f97316", type: "discount" },
            { id: 6, label: "Дахин оролд", icon: "🔄", color: "#eab308", type: "retry" },
            { id: 7, label: "5% бонус", icon: "🎈", color: "#0ea5e9", type: "bonus" },
            { id: 8, label: "10% хөнгөлөлт", icon: "🎊", color: "#ef4444", type: "discount" },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch spin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpinData();
  }, [user, token, authLoading]);

  const statCards = useMemo(() => [
    {
      id: "points",
      label: "Нийт оноо",
      value: userPoints.toLocaleString('en-US'),
      icon: Coins,
      accent: "from-sky-500/15 via-sky-500/5 to-transparent",
    },
    {
      id: "prize",
      label: "Энэ сарын хожил",
      value: "₮42,000",
      icon: Trophy,
      accent: "from-amber-500/15 via-amber-500/5 to-transparent",
    },
    {
      id: "spins",
      label: "Нийт эргүүлсэн",
      value: totalSpins.toString(),
      icon: RotateCcw,
      accent: "from-purple-500/15 via-purple-500/5 to-transparent",
    },
  ], [userPoints, totalSpins]);

  const sliceAngle = wheelSegments.length > 0 ? 360 / wheelSegments.length : 45;

  const gradient = useMemo(() => {
    if (wheelSegments.length === 0) return '';
    
    return wheelSegments
      .map((segment, index) => {
        const start = index * sliceAngle;
        const end = (index + 1) * sliceAngle;
        return `${segment.color} ${start}deg ${end}deg`;
      })
      .join(", ");
  }, [wheelSegments, sliceAngle]);

  const handleSpin = async () => {
    if (spinsLeft <= 0 || isSpinning) return;

    if (!token || !user) {
      setShowAuthModal(true);
      return;
    }

    setIsSpinning(true);

    try {
      // Call backend API
      const response = await fetch(`${API_BASE_URL}/spin/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Алдаа гарлаа');
        setIsSpinning(false);
        return;
      }

      const data = await response.json();
      const segment = data.segment;

      // Find matching wheel segment for animation
      const segmentIndex = wheelSegments.findIndex(s => s.label === segment.label);
      const randomIndex = segmentIndex >= 0 ? segmentIndex : 0;
      
      const spins = 5 + Math.floor(Math.random() * 4);
      const segmentCenter = -90 + randomIndex * sliceAngle + sliceAngle / 2;
      const finalRotation = spins * 360 + (360 - segmentCenter);

      setRotation((prev) => prev + finalRotation);

      setTimeout(async () => {
        const icon = wheelSegments[randomIndex]?.icon || "🎁";
        setLastResult({ label: segment.label, icon, type: segment.type });

        // Update spins left
        setSpinsLeft(data.spinsLeft);
        setTotalSpins((prev) => prev + 1);

        // Refresh user data to update points/balance
        await refreshUser();

        if (segment.type === "none") {
          setModalContent({ label: "Амжилтгүй боллоо", icon: "😢" });
          setShowModal(true);
        } else if (segment.type === "retry") {
          setModalContent({ label: "Дахин оролдох боломж!", icon: "🔄" });
          setShowModal(true);
        } else {
          showConfetti();
          const rewardMsg = data.rewardAmount > 0 
            ? `${segment.label} - ${data.rewardAmount}${segment.type === 'bonus' ? ' оноо' : '₮'}!`
            : segment.label;
          setModalContent({ label: rewardMsg, icon });
          setShowModal(true);
        }

        setIsSpinning(false);
      }, 3200);
    } catch (error) {
      console.error('Spin error:', error);
      alert('Хүрд эргүүлэхэд алдаа гарлаа');
      setIsSpinning(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-sm text-slate-600 dark:text-slate-300">Хүрд ачааллаж байна...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="space-y-8">
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onModeChange={setAuthMode}
        />

        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-6 text-center max-w-md">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Gift className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-[var(--color-text-main)] dark:text-white">
                Нэвтэрч орно уу
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Азын хүрд эргүүлэхийн тулд эхлээд нэвтрэх шаардлагатай. 
                Бүртгэлтэй бол нэвтрэх, эсвэл шинээр бүртгүүлнэ үү.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
              >
                Нэвтрэх
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-full border-2 border-blue-600 px-6 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
              >
                Бүртгүүлэх
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />

      {/* Modal */}
      {showModal && modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-blue-200/40 bg-white/90 p-8 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900/95">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-transparent" />
            <span className="text-6xl">{modalContent.icon}</span>
            <h3 className="mt-4 text-2xl font-semibold text-[var(--color-text-main)] dark:text-white">
              {modalContent.label}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Таны урамшууллыг "Миний шагнал" хэсгээс шалгаж баталгаажуулна уу.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
            >
              Хаах
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
  <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] px-4 py-7 shadow-lg dark:bg-slate-900 sm:px-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-blue-600 dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-200">
              Азын хүрд
            </p>
            <h1 className="text-2xl font-semibold text-[var(--color-text-main)] dark:text-white sm:text-3xl lg:text-4xl">
              Өдөр бүрийн азын сорил – хүрд эргүүлээд онцгой шагнал ав
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 sm:text-base lg:text-lg">
              Эргүүлэх бүрт таньд оноо, купон, бэлэн мөнгөний хөнгөлөлт хүртэх шинэ боломж нээгдэнэ. Өнөөдөр танд <strong>{spinsLeft}</strong> удаа эргүүлэх эрх байна.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-300 sm:gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/60 sm:px-4">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Шударга алгоритмтай баталгаажсан систем
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/60 sm:px-4">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Ховор шагналууд долоо хоног бүр шинэчлэгдэнэ
              </span>
            </div>
          </div>
          <div className="flex items-end gap-3 text-xs text-slate-500 dark:text-slate-300 sm:text-sm">
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Тайлбар</p>
              <p className="mt-1 text-xs sm:text-sm">
                Эргүүлэх эрх өдөр бүр 00:00 цагт шинэчлэгдэнэ. Дахин оролдох шагнал авбал эрх автоматаар нэмэгдэнэ.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Wheel card */}
        <div className="relative rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] p-6 shadow-xl dark:bg-slate-900">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div
              className="relative mx-auto w-full"
              style={{ maxWidth: "23rem" }}
            >
              <div
                className="relative w-full"
                style={{ aspectRatio: "1 / 1" }}
              >
                <div className="absolute inset-0">
                  <div
                    className={`h-full w-full rounded-full border-[10px] border-white bg-white shadow-[0_30px_60px_rgba(59,130,246,0.18)] transition-transform duration-[3200ms] ease-out dark:border-slate-800 dark:bg-slate-900 sm:border-[12px]`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    <div
                      className="relative h-full w-full rounded-full"
                      style={{ backgroundImage: `conic-gradient(from -90deg, ${gradient})` }}
                    >
                      {wheelSegments.map((segment, index) => {
                        const rotationDeg = index * sliceAngle + sliceAngle / 2;
                        return (
                          <span
                            key={segment.id}
                            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-white"
                            style={{ transform: `rotate(${rotationDeg}deg) translateY(-72%)` }}
                          >
                            <span className="text-lg drop-shadow sm:text-xl">{segment.icon}</span>
                            <span
                              className="mt-1 whitespace-nowrap rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]"
                              style={{ transform: `rotate(${-rotationDeg}deg)` }}
                            >
                              {segment.label}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                    <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white shadow-inner dark:border-slate-700 dark:bg-slate-900 sm:h-14 sm:w-14" />
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-5 sm:-translate-y-6">
                <div className="relative h-12 w-12">
                  <div className="absolute left-1/2 top-0 h-12 w-12 -translate-x-1/2">
                    <div className="mx-auto h-full w-2 rounded-b-full bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 shadow-lg sm:w-3" />
                  </div>
                  <div className="absolute left-1/2 top-12 -translate-x-1/2">
                    <div className="h-0 w-0 border-x-[12px] border-b-[16px] border-x-transparent border-b-amber-500 drop-shadow sm:border-x-[14px] sm:border-b-[18px]" />
                    <div className="-mt-1 h-2 w-2 rounded-full bg-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-5">
              {lastResult ? (
                <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/80 p-4 text-emerald-700 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200 sm:p-5">
                  <div className="flex items-center gap-3">
                    <Gift className="h-6 w-6" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em]">Сүүлийн үр дүн</p>
                      <p className="mt-1 text-base font-semibold sm:text-lg">
                        {lastResult.icon} {lastResult.label}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200/80 bg-slate-50/60 p-4 text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300 sm:p-5">
                  <div className="flex items-center gap-3">
                    <Info className="h-6 w-6" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em]">Заавар</p>
                      <p className="mt-1 text-xs sm:text-sm">
                        Эргүүлэх товч дээр дармагц хүрд автоматаар зогсож, шагнал тань модал цонхонд харагдана.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSpin}
                disabled={spinsLeft <= 0 || isSpinning}
                className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 px-5 py-3.5 text-sm font-semibold text-white shadow-xl transition hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 sm:px-6 sm:py-4 sm:text-base disabled:from-slate-400 disabled:via-slate-500 disabled:to-slate-600 disabled:shadow-none disabled:hover:scale-100"
              >
                <RotateCcw className={`h-6 w-6 ${isSpinning ? "animate-spin" : ""}`} />
                {isSpinning ? "Эргүүлж байна..." : spinsLeft > 0 ? "Хүрд эргүүлэх" : "Эрх дууссан"}
              </button>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-300 sm:gap-3 sm:text-xs">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/60 sm:px-4">
                  Үлдсэн эрх: <strong className="text-blue-600 dark:text-blue-300">{spinsLeft}</strong>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/60 sm:px-4">
                  Эргэлтийн хугацаа: ~3.2 сек
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {statCards.map((card) => {
                  const IconComp = card.icon;
                  return (
                    <article
                      key={card.id}
                      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/80 sm:p-4"
                    >
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`} />
                      <div className="relative z-10 space-y-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-800/70 dark:text-slate-200 sm:text-[11px]">
                          <IconComp className="h-4 w-4" />
                          {card.label}
                        </span>
                        <p className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white sm:text-2xl">{card.value}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] p-6 shadow-lg dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Сүүлийн эргүүлэлтүүд</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              Хожлын түүхийг автоматаар хадгална. Захиалгын хэсгээс дэлгэрэнгүйг шалгана уу.
            </p>
            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <p className="text-center text-sm text-slate-500 dark:text-slate-300 py-4">
                  Одоогоор түүх байхгүй байна
                </p>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">{entry.reward}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        {formatDate(entry.date, "mn-MN", {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  <span
                    className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold text-white ${
                      entry.type === "bonus"
                        ? "bg-sky-500"
                        : entry.type === "cash"
                        ? "bg-emerald-500"
                        : entry.type === "discount"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                    }`}
                  >
                    {entry.type === "bonus"
                      ? "Бонус"
                      : entry.type === "cash"
                      ? "Бэлэн"
                      : entry.type === "discount"
                      ? "Хөнгөлөлт"
                      : "Дахин"}
                  </span>
                </div>
              ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--color-border-main)] bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-transparent p-6 shadow-lg dark:from-blue-500/20 dark:via-purple-500/15 dark:to-transparent">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">Шагналын журам</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>• "Дахин оролд" хожвол эрх тань автоматаар нэмэгдэнэ.</li>
              <li>• Хямдралын купоныг 7 хоногийн дотор ашиглана.</li>
              <li>• Бонус оноо шууд таны дансанд шилжинэ.</li>
              <li>• Бэлэн мөнгөний хөнгөлөлтийг TopUp хэсгээр авна.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}