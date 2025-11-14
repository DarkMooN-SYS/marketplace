import React, { useEffect, useState, useMemo } from 'react';
import { Edit3, MessageCircle, Sparkles, Star, Trash2, Loader2 } from 'lucide-react';
import { profileApi } from '../../api/profileApi';
import { formatDateTime } from '../../utils/dateHelpers';
import { useAuth } from '../../hooks/useAuth';

type Review = {
  id: string;
  product: string;
  rating: number;
  comment: string;
  createdAt?: string;
  productId?: string;
};

const Reviews: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(1);
  const [sellerRating, setSellerRating] = useState<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load cached data first for instant display
        const cachedReviews = localStorage.getItem('cachedMyReviews');
        const cachedRating = localStorage.getItem('cachedSellerRating');
        
        if (cachedReviews) {
          try {
            const parsed = JSON.parse(cachedReviews);
            setReviews(parsed);
          } catch {
            console.warn('Failed to parse cached reviews');
          }
        }

        if (cachedRating) {
          try {
            const parsed = JSON.parse(cachedRating);
            setSellerRating(parsed);
          } catch {
            console.warn('Failed to parse cached rating');
          }
        }

        // If we have cache, stop loading immediately
        if (cachedReviews || cachedRating) {
          setLoading(false);
        }

        // Хэрэглэгч нэвтрээгүй бол API дуудалт хийхгүй
        if (!user) {
          setLoading(false);
          return;
        }

        // Load fresh data in parallel
        const [apiReviews, rating] = await Promise.all([
          profileApi.getMyReviews().catch(err => {
            console.error('Failed to load reviews:', err);
            return [];
          }),
          profileApi.getSellerRating().catch(err => {
            console.error('Failed to load seller rating:', err);
            return {
              averageRating: 0,
              totalReviews: 0,
              ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            };
          })
        ]);

        const mappedReviews: Review[] = apiReviews.map((review) => ({
          id: review.id,
          product: review.productName,
          productId: review.productId,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
        }));
        
        setReviews(mappedReviews);
        setSellerRating(rating);

        // Cache the fresh data
        localStorage.setItem('cachedMyReviews', JSON.stringify(mappedReviews));
        localStorage.setItem('cachedSellerRating', JSON.stringify(rating));
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const distribution = useMemo(() => {
    // Use seller rating distribution (reviews from others about my products)
    return Array.from({ length: 5 }, (_, idx) => {
      const rating = 5 - idx;
      const count = sellerRating.ratingDistribution[rating] || 0;
      const percentage = sellerRating.totalReviews ? Math.round((count / sellerRating.totalReviews) * 100) : 0;
      return { rating, count, percentage };
    });
  }, [sellerRating]);

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditComment(review.comment);
    setEditRating(review.rating);
  };

  const handleSave = async (id: string) => {
    const trimmed = editComment.trim();
    if (trimmed.length === 0) return;

    try {
      await profileApi.updateReview(id, { comment: trimmed, rating: editRating });
      const apiReviews = await profileApi.getMyReviews();
      const mappedReviews: Review[] = apiReviews.map((review) => ({
        id: review.id,
        product: review.productName,
        productId: review.productId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      }));
      setReviews(mappedReviews);
      
      // Update cache
      localStorage.setItem('cachedMyReviews', JSON.stringify(mappedReviews));
      
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update review:', error);
      alert('Сэтгэгдэл шинэчлэхэд алдаа гарлаа');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Энэ сэтгэгдлийг устгах уу?')) return;

    try {
      await profileApi.deleteReview(id);
      const apiReviews = await profileApi.getMyReviews();
      const mappedReviews: Review[] = apiReviews.map((review) => ({
        id: review.id,
        product: review.productName,
        productId: review.productId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      }));
      setReviews(mappedReviews);
      
      // Update cache
      localStorage.setItem('cachedMyReviews', JSON.stringify(mappedReviews));
      
      if (editingId === id) setEditingId(null);
    } catch (error) {
      console.error('Failed to delete review:', error);
      alert('Сэтгэгдэл устгахад алдаа гарлаа');
    }
  };

  const cancelEdit = () => setEditingId(null);

  const renderStars = (rating: number, size: 'sm' | 'md' = 'md') => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < rating;
        return (
          <Star
            key={index}
            className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${filled ? 'text-amber-400 fill-amber-300' : 'text-slate-300'}`}
          />
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--color-border-main)] bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent dark:from-amber-500/15 dark:via-yellow-500/10 px-6 py-5 shadow-sm">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-600 dark:text-amber-300">Сэтгэгдлийн тойм</p>
            <h3 className="text-xl sm:text-2xl font-semibold text-[var(--color-text-main)] dark:text-white flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-amber-500" />
              Миний үнэлгээ
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-300">Таны үлдээсэн бүх сэтгэгдлүүд</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">Миний үнэлгээ</p>
              <p className="text-3xl font-semibold text-[var(--color-text-main)] dark:text-white">{sellerRating.averageRating.toFixed(1) || '0.0'}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{sellerRating.totalReviews} үнэлгээ</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 px-3 py-2 shadow-inner">
              {renderStars(Math.round(sellerRating.averageRating), 'sm')}
            </div>
          </div>
        </header>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {distribution.map((item) => (
            <div key={item.rating} className="rounded-2xl border border-[var(--color-border-main)]/50 bg-white/70 dark:bg-slate-900/60 p-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                <span>{item.rating} од</span>
                <span>{item.count}</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${item.percentage}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{item.percentage}%</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-[var(--color-border-main)] bg-[var(--color-bg-main)] dark:bg-slate-900 shadow-lg p-5 sm:p-6 space-y-4">
        <header className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Миний үлдээсэн сэтгэгдлүүд
          </h3>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">{reviews.length} бүртгэл</span>
        </header>
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-main)]/60 bg-white/70 dark:bg-slate-900/60 px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-300">
            Одоогоор сэтгэгдэл байхгүй. Бүтээгдэхүүнд анхны сэтгэгдлээ үлдээгээрэй!
          </div>
        ) : (
          <ul className="space-y-3">
            {reviews.map((review) => {
              const isEditing = editingId === review.id;
              return (
                <li key={review.id} className="rounded-2xl border border-[var(--color-border-main)] bg-white/80 dark:bg-slate-900/70 px-4 py-4 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Бүтээгдэхүүн</span>
                        <h4 className="text-base font-semibold text-[var(--color-text-main)] dark:text-white">{review.product}</h4>
                        {review.createdAt && (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {formatDateTime(review.createdAt, 'mn-MN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">Үнэлгээ:</span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, idx) => {
                                const value = idx + 1;
                                const selected = value <= editRating;
                                return (
                                  <button key={value} type="button" onClick={() => setEditRating(value)} className={`transition ${selected ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}>
                                    <Star className={`h-5 w-5 ${selected ? 'fill-amber-300' : ''}`} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} rows={3} className="w-full rounded-2xl border border-[var(--color-border-main)] bg-white/90 dark:bg-slate-900/70 px-3 py-2 text-sm text-[var(--color-text-main)] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60" placeholder="Тайлбараа энд бичнэ үү" />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {renderStars(review.rating)}
                          <p className="text-sm text-slate-600 dark:text-slate-300">{review.comment}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isEditing ? (
                        <>
                          <button className="inline-flex items-center gap-2 rounded-full border border-emerald-500/70 bg-emerald-500/90 px-3 md:px-4 py-1.5 text-sm md:text-base font-semibold text-white shadow-sm hover:bg-emerald-600 transition" onClick={() => handleSave(review.id)}>
                            <Sparkles className="w-4 h-4 flex-shrink-0" />
                            <span>Хадгалах</span>
                          </button>
                          <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 md:px-4 py-1.5 text-sm md:text-base font-semibold text-slate-600 hover:bg-slate-100 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700" onClick={cancelEdit}>
                            <span>Болих</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-main)] px-3 md:px-4 py-1.5 text-sm md:text-base font-semibold text-slate-600 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800 transition" onClick={() => startEdit(review)}>
                            <Edit3 className="w-4 h-4 flex-shrink-0" />
                            <span>Засах</span>
                          </button>
                          <button className="inline-flex items-center gap-2 rounded-full border border-rose-400 px-3 md:px-4 py-1.5 text-sm md:text-base font-semibold text-rose-500 hover:bg-rose-50 transition dark:border-rose-500 dark:text-rose-300 dark:hover:bg-rose-500/20" onClick={() => handleDelete(review.id)}>
                            <Trash2 className="w-4 h-4 flex-shrink-0" />
                            <span>Устгах</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Reviews;
