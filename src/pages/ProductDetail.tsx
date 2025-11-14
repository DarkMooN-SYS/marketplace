import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useProduct } from '../hooks/useProducts';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../hooks/useAuth';
import { useNotificationHelpers } from '../hooks/useNotificationHelpers';
import type { Product } from '../types/product';
import { reviewStore, type MarketplaceReview } from '../api/reviewApi';
import { api } from '../api/adminApi';
import { getUserAvatar, getSellerAvatar } from '../utils/avatarHelper';

interface ProductDetailProps {
  productId: string;
}

const FALLBACK_IMAGE = '/img/10.png';

// Helper function to safely format date
const formatReviewDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return 'Огноо тодорхойгүй';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Огноо тодорхойгүй';
    }
    
    return date.toLocaleString('mn-MN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Invalid date format:', dateString, error);
    return 'Огноо тодорхойгүй';
  }
};

const normalizeCategory = (product: Product) =>
  (product.categoryKey ?? product.category ?? '').toLowerCase();

export default function ProductDetail({ productId }: ProductDetailProps) {
  const { findProductById, products } = useProduct();
  const { setCurrentPage } = useNavigation();
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotificationHelpers();
  const [activeImage, setActiveImage] = useState<string>(FALLBACK_IMAGE);
  const [userReviews, setUserReviews] = useState<MarketplaceReview[]>([]);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [commentInput, setCommentInput] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'idle' | 'success'>('idle');

  // Load reviews on component mount
  useEffect(() => {
    const loadReviews = async () => {
      try {
        const reviews = await reviewStore.loadAll();
        setUserReviews(reviews);
      } catch (error) {
        console.error('Failed to load reviews:', error);
      }
    };
    
    loadReviews();
  }, []);
  const activeUserName = user?.name?.trim() && user.name.trim().length > 0 ? user.name.trim() : 'Зочин хэрэглэгч';
  const activeUserAvatar = getUserAvatar(user?.avatar);

  const product = useMemo(() => {
    if (!productId) return undefined;
    return findProductById(productId);
  }, [findProductById, productId]);

  useEffect(() => {
    setCurrentPage('marketplace');
  }, [setCurrentPage]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [productId]);

  useEffect(() => {
    if (!product) {
      setActiveImage(FALLBACK_IMAGE);
      return;
    }
    const firstImage = product.images?.[0] ?? FALLBACK_IMAGE;
    setActiveImage(firstImage);
  }, [product]);

  const similarProducts = useMemo(() => {
    if (!product) return [];
    const category = normalizeCategory(product);
    const pool = products.filter((item: Product) => item.id !== product.id);
    const matched = pool.filter((item: Product) => normalizeCategory(item) === category);
    if (matched.length >= 4) {
      return matched.slice(0, 4);
    }
    const remaining = pool.filter((item: Product) => !matched.includes(item));
    return [...matched, ...remaining].slice(0, 4);
  }, [product, products]);

  const productReviews = useMemo(() => {
    if (!product) return [];
    return userReviews.filter((review) => review.productId === product.id && review.status !== 'hidden');
  }, [userReviews, product]);

  const aggregateRating = useMemo(() => {
    if (!product) {
      return { average: 0, count: 0 };
    }

    const baseCount = product.reviews;
    const userCount = productReviews.length;
    const totalCount = baseCount + userCount;

    if (totalCount === 0) {
      return { average: 0, count: 0 };
    }

    const baseTotal = product.rating * baseCount;
    const userTotal = productReviews.reduce((sum, review) => sum + review.rating, 0);
    const average = (baseTotal + userTotal) / totalCount;

    return { average, count: totalCount };
  }, [product, productReviews]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleStoreChange = async (event: Event) => {
      const detail = (event as CustomEvent<MarketplaceReview[]>).detail;
      if (Array.isArray(detail)) {
        setUserReviews(detail);
      } else {
        try {
          const reviews = await reviewStore.loadAll();
          setUserReviews(reviews);
        } catch (error) {
          console.error('Failed to reload reviews:', error);
        }
      }
    };

    window.addEventListener('marketplace:review-store-changed', handleStoreChange as EventListener);
    return () => window.removeEventListener('marketplace:review-store-changed', handleStoreChange as EventListener);
  }, []);

  useEffect(() => {
    if (formStatus !== 'success' || typeof window === 'undefined') {
      return undefined;
    }
    const timeout = window.setTimeout(() => setFormStatus('idle'), 2500);
    return () => window.clearTimeout(timeout);
  }, [formStatus]);

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;

    // Check if user is logged in
    if (!user) {
      notifyError(
        'Нэвтрэх шаардлагатай',
        'Сэтгэгдэл үлдээхийн тулд эхлээд нэвтэрнэ үү.'
      );
      return;
    }

    const trimmed = commentInput.trim();
    if (trimmed.length === 0) {
      return;
    }

    if (trimmed.length < 5) {
      alert('Сэтгэгдэл хамгийн багадаа 5 тэмдэгт байх ёстой.');
      return;
    }

    try {
      await reviewStore.create({
        productId: product.id,
        productTitle: product.title,
        rating: ratingInput,
        comment: trimmed,
        userName: activeUserName,
        userAvatar: activeUserAvatar,
      });

      // Reload reviews
      const updatedReviews = await reviewStore.loadAll();
      setUserReviews(updatedReviews);
      
      setRatingInput(5);
      setCommentInput('');
      setFormStatus('success');
      
      // Show success notification
      notifySuccess(
        'Үнэлгээ нэмэгдлээ',
        `Таны ${ratingInput} одны үнэлгээ амжилттай нэмэгдлээ. Баярлалаа!`
      );
    } catch (error) {
      console.error('Failed to submit review:', error);
      notifyError(
        'Алдаа гарлаа',
        'Сэтгэгдэл нэмэхэд алдаа гарлаа. Дахин оролдоно уу.'
      );
    }
  };

  const handleGoBack = () => {
    window.location.hash = 'marketplace';
  };

  const handleViewSimilar = (id: string) => {
    window.location.hash = `product/${id}`;
  };

  const handleSaveProduct = async (id: string) => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent('auth:open', {
          detail: { mode: 'login' as const },
        })
      );
      return;
    }

    try {
      // Call backend API to toggle wishlist
      const response = await api.products.toggleWishlist(id);
      
      // Dispatch event to update UI
      window.dispatchEvent(new Event('wishlist-updated'));
      
      if (response.isSaved) {
        notifySuccess('Амжилттай', 'Хадгалсан бараанд нэмэгдлээ');
      } else {
        notifySuccess('Амжилттай', 'Хадгалсан бараанаас хасагдлаа');
      }
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      notifyError('Алдаа', 'Хадгалахад алдаа гарлаа');
    }
  };

  if (!product) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-8 text-center shadow-sm">
        <Sparkles className="h-10 w-10 text-[var(--color-border-main)]" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">Бараа олдсонгүй</h1>
          <p className="text-sm text-[var(--color-text-main)]/70">
            Таны үзэх гэсэн бараа устгагдсан эсвэл түр хугацаанд идэвхгүй болсон байж магадгүй.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Marketplace руу буцах
        </button>
      </div>
    );
  }

  const sellerAvatar = getSellerAvatar(product.seller);

  const isOwner = (() => {
    if (!user) return false;
    if (product.sellerUserId && product.sellerUserId === user.id) return true;
    return (
      product.seller.name === user.name &&
      product.seller.avatar === (user.avatar || '/img/human.png')
    );
  })();

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-4">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--color-text-main)] transition hover:-translate-y-0.5 hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/60"
            >
              <ArrowLeft className="h-4 w-4" />
              Marketplace руу буцах
            </button>

            <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-black/5 aspect-[4/3]">
              <img
                src={activeImage}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            </div>

            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((image: string) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={`overflow-hidden rounded-2xl border transition ${
                      image === activeImage
                        ? 'border-[var(--color-border-main)] ring-2 ring-[var(--color-border-main)]/40'
                        : 'border-[var(--color-border-soft)] hover:border-[var(--color-border-main)]'
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-xl">
                      <img src={image} alt={product.title} className="h-full w-full object-cover" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-text-main)]/70 dark:bg-slate-900/60">
                <ShoppingBag className="h-4 w-4" />
                Барааны дэлгэрэнгүй
              </span>
              <h1 className="text-3xl font-semibold text-[var(--color-text-main)]">
                {product.title}
              </h1>
              {isOwner && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => (window.location.hash = `product/${product.id}/edit`)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-main)]/60 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:from-indigo-500/50 dark:via-blue-500/50 dark:to-purple-500/50"
                  >
                    Өөрчлөх
                  </button>
                </div>
              )}
              <p className="text-sm leading-relaxed text-[var(--color-text-main)]/80">
                {product.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-4 py-2 text-lg font-semibold text-[var(--color-text-main)] dark:bg-slate-900/60">
                <Sparkles className="h-4 w-4" />
                {product.currency}
                {product.price.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                {product.condition === 'new' ? 'Шинэ бараа' : 'Хэрэглэсэн бараа'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/80 p-4 text-sm text-[var(--color-text-main)] dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-[var(--color-text-main)]/60">
                  <MapPin className="h-4 w-4" />
                  Байршил
                </div>
                <p className="mt-1 font-semibold text-[var(--color-text-main)]">{product.location}</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/80 p-4 text-sm text-[var(--color-text-main)] dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-[var(--color-text-main)]/60">
                  <Star className="h-4 w-4" />
                  Үзэлт ба үнэлгээ
                </div>
                <p className="mt-1 font-semibold text-[var(--color-text-main)]">
                  {product.views.toLocaleString()} үзэлт · {aggregateRating.average.toFixed(1)} ★ ({aggregateRating.count} сэтгэгдэл)
                </p>
              </div>
              {product.contact && (
                <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/80 p-4 text-sm text-[var(--color-text-main)] dark:bg-slate-900/60">
                  <div className="flex items-center gap-2 text-[var(--color-text-main)]/60">
                    <Phone className="h-4 w-4" />
                    Холбогдох
                  </div>
                  <p className="mt-1 font-semibold text-[var(--color-text-main)]">{product.contact}</p>
                </div>
              )}
              <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/80 p-4 text-sm text-[var(--color-text-main)] dark:bg-slate-900/60">
                <div className="flex items-center gap-2 text-[var(--color-text-main)]/60">
                  <ShoppingBag className="h-4 w-4" />
                  Ангилал
                </div>
                <p className="mt-1 font-semibold text-[var(--color-text-main)]">{product.category}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-white/80 p-4 dark:bg-slate-900/60">
              <img
                src={sellerAvatar}
                alt={product.seller.name}
                className="h-16 w-16 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-main)]">{product.seller.name}</p>
                <p className="text-xs text-[var(--color-text-main)]/70">
                  Үнэлгээ: {product.seller.rating.toFixed(1)} ★
                  {product.seller.contact ? ` · ${product.seller.contact}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
              Сэтгэгдэл ба үнэлгээ
            </p>
            <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white">
              Энэ барааны талаар таны сэтгэгдэл
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-4 py-2 text-sm text-[var(--color-text-main)] dark:bg-slate-900/60">
            Дундаж үнэлгээ: {aggregateRating.average.toFixed(1)} ★ · {aggregateRating.count} сэтгэгдэл
          </div>
        </div>

        {!user ? (
          <div className="rounded-3xl border border-[var(--color-border-soft)] bg-gradient-to-br from-indigo-50/50 via-blue-50/30 to-purple-50/50 p-8 text-center shadow-sm dark:border-white/12 dark:from-indigo-950/20 dark:via-blue-950/20 dark:to-purple-950/20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-border-main)] to-indigo-600 shadow-lg">
              <Star className="h-8 w-8 fill-white text-white" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text-main)] dark:text-white">
              Сэтгэгдэл үлдээх
            </h3>
            <p className="mb-4 text-sm text-[var(--color-text-main)]/70 dark:text-white/70">
              Энэ бүтээгдэхүүний талаар сэтгэгдэл үлдээхийн тулд эхлээд нэвтэрнэ үү.
            </p>
            <button
              type="button"
              onClick={() => {
                // Open auth modal in signup mode
                window.dispatchEvent(new CustomEvent('auth:open', { detail: { mode: 'signup' } }));
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-main)]/70 bg-gradient-to-r from-[var(--color-border-main)] via-indigo-500 to-[var(--color-border-main)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <Star className="h-4 w-4" />
              Бүртгүүлэх
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitReview} className="space-y-4 rounded-3xl border border-[var(--color-border-soft)] bg-white/85 p-5 shadow-sm dark:border-white/12 dark:bg-slate-900/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)]/80 bg-white/75 px-3 py-2 shadow-inner dark:border-white/10 dark:bg-white/5">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--color-border-main)]/20 to-transparent blur-md" aria-hidden="true" />
                <img
                  src={activeUserAvatar}
                  alt={activeUserName}
                  className="relative h-11 w-11 rounded-full object-cover ring-2 ring-[var(--color-border-main)]/50 dark:ring-white/15"
                />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">{activeUserName}</p>
                <p className="text-[11px] text-[var(--color-text-main)]/60 dark:text-white/50">Сэтгэгдэл таны профайлд холбогдоно</p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-main)]/60 dark:text-white/50">
                  Үнэлгээ сонгох
                </span>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    const active = value <= ratingInput;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRatingInput(value)}
                        className={`rounded-full p-1 transition ${
                          active
                            ? 'text-amber-400 drop-shadow-[0_2px_6px_rgba(250,204,21,0.35)]'
                            : 'text-[var(--color-border-soft)] hover:text-amber-300'
                        }`}
                        aria-label={`${value} од өгөх`}
                      >
                        <Star className={`h-6 w-6 ${active ? 'fill-amber-300' : ''}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {formStatus === 'success' && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                  <Sparkles className="h-4 w-4" />
                  Сэтгэгдэл амжилттай хадгалагдлаа
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="product-review-comment" className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-main)]/60 dark:text-white/50">
              Сэтгэгдэл бичих
            </label>
            <textarea
              id="product-review-comment"
              value={commentInput}
              onChange={(event) => setCommentInput(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-[var(--color-border-soft)] bg-white/90 px-4 py-3 text-sm text-[var(--color-text-main)] shadow-sm transition focus:border-[var(--color-border-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-main)]/30 dark:border-white/12 dark:bg-slate-900/70 dark:text-white"
              placeholder="Энэ барааны талаар таны сэтгэгдэл..."
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/50">
              Таны сэтгэгдэл таны профайлын "Сэтгэгдэл" хэсэгт автоматаар нэмэгдэнэ.
            </p>
            <button
              type="submit"
              className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-border-main)]/70 bg-gradient-to-r from-[var(--color-border-main)] via-indigo-500 to-[var(--color-border-main)] px-6 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_-15px_rgba(99,102,241,0.65)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(99,102,241,0.75)] dark:border-transparent dark:from-indigo-500/40 dark:via-blue-500/40 dark:to-purple-500/40 dark:text-white dark:hover:from-indigo-500/55 dark:hover:via-blue-500/55 dark:hover:to-purple-500/55"
            >
              <Sparkles className="h-4 w-4" />
              Илгээх
            </button>
          </div>
        </form>
        )}

        {productReviews.length > 0 ? (
          <div className="space-y-3">
            {productReviews
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((review) => (
                <article
                  key={review.id}
                  className="rounded-3xl border border-[var(--color-border-soft)] bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-white/12 dark:bg-slate-900/65"
                >
                  <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/30 to-transparent blur-md" aria-hidden="true" />
                        <img
                          src={review.userAvatar || '/img/human.png'}
                          alt={review.userName}
                          className="relative h-11 w-11 rounded-full object-cover ring-2 ring-amber-400/50 dark:ring-amber-300/30"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">
                          {review.userName}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-amber-500">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, index) => {
                              const filled = index < review.rating;
                              return (
                                <Star
                                  key={`${review.id}-${index}`}
                                  className={`h-4 w-4 ${filled ? 'fill-amber-300 text-amber-400' : 'text-[var(--color-border-soft)] dark:text-white/15'}`}
                                />
                              );
                            })}
                          </div>
                          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:bg-amber-400/10 dark:text-amber-200">
                            {review.rating.toFixed(1)} ★
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--color-text-main)]/60 dark:text-white/40">
                      {formatReviewDate(review.createdAt)}
                    </span>
                  </header>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-main)]/80 dark:text-white/70">
                    {review.comment}
                  </p>
                </article>
              ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--color-border-soft)] bg-white/70 p-6 text-center text-sm text-[var(--color-text-main)]/60 dark:border-white/12 dark:bg-slate-900/50 dark:text-white/60">
            Энэ бараанд хараахан сэтгэгдэл байхгүй байна. Анхны үнэлгээг өөрөө үлдээгээрэй!
          </div>
        )}
      </section>

      {similarProducts.length > 0 && (
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
              Ижил бараанууд
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white">
                Санал болгож буй ижил төрлийн бараа
              </h2>
              <p className="text-xs text-[var(--color-text-main)]/60 dark:text-white/60">
                Нийт {similarProducts.length} бараа
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {similarProducts.map((similar: Product) => (
              <ProductCard
                key={similar.id}
                product={similar}
                onView={handleViewSimilar}
                onSave={handleSaveProduct}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
