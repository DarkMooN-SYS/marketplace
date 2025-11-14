import { useState, useEffect } from "react";
import { Heart, HeartOff, Eye, Calendar, User, Sparkles, TrendingUp, ExternalLink, ShoppingBag, Newspaper } from "lucide-react";
import { api, type NewsArticle } from "../../api/adminApi";
import { formatDate, formatNumber } from "../../utils/dateHelpers";
import type { Product } from "../../types/product";
import { useAuth } from "../../hooks/useAuth";

type LikedArticle = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  image: string;
  publishedAt: string;
  views: number;
  likes: number;
  trending?: boolean;
};

type WishlistTab = 'news' | 'products';

const DEFAULT_IMAGE = 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=400';

const Wishlist = ({ isMobile }: { isMobile: boolean }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<WishlistTab>('products');
  const [articles, setArticles] = useState<LikedArticle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedArticles, setLikedArticles] = useState<Set<string>>(new Set());
  const [savedProducts, setSavedProducts] = useState<Set<string>>(new Set());

  // Fetch liked articles
  useEffect(() => {
    const fetchLikedArticles = async () => {
      try {
        // Get liked article IDs from localStorage
        const savedLikes = localStorage.getItem('likedArticles');
        const likedIds = savedLikes ? JSON.parse(savedLikes) : [];
        setLikedArticles(new Set(likedIds));
        
        if (likedIds.length === 0) {
          setArticles([]);
          return;
        }
        
        // Fetch all news articles
        const response = await api.news.getAll({ limit: 1000 });
        
        // Filter only liked articles
        const liked = response.news.filter((article) => 
          likedIds.includes(article.id)
        ).map((article) => {
          const newsArticle = article as NewsArticle;
          
          // Handle publishedAt conversion safely
          let publishedAtStr = new Date().toISOString();
          const rawDate = newsArticle.publishedAt || newsArticle.createdAt;
          
          if (rawDate) {
            if (typeof rawDate === 'string') {
              publishedAtStr = rawDate;
            } else if (rawDate instanceof Date) {
              publishedAtStr = rawDate.toISOString();
            } else if (typeof rawDate === 'object' && rawDate !== null) {
              // Firestore Timestamp object
              const timestamp = rawDate as { toDate?: () => Date; _seconds?: number };
              if (timestamp.toDate) {
                publishedAtStr = timestamp.toDate().toISOString();
              } else if (timestamp._seconds) {
                publishedAtStr = new Date(timestamp._seconds * 1000).toISOString();
              }
            }
          }
          
          return {
            id: newsArticle.id,
            title: newsArticle.title,
            excerpt: newsArticle.excerpt || newsArticle.description || '',
            category: newsArticle.category,
            author: newsArticle.author || 'Admin Team',
            image: newsArticle.image || newsArticle.imageUrl || DEFAULT_IMAGE,
            publishedAt: publishedAtStr,
            views: newsArticle.views || 0,
            likes: newsArticle.likes || 0,
            trending: newsArticle.trending || false,
          };
        });
        
        setArticles(liked);
      } catch (error) {
        console.error('Failed to fetch liked articles:', error);
      }
    };
    
    fetchLikedArticles();
  }, []);

  // Fetch saved products
  useEffect(() => {
    const fetchSavedProducts = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged in
        if (!user) {
          setProducts([]);
          setLoading(false);
          return;
        }
        
        // Fetch user's wishlist from backend (only THIS user's saved products)
        const wishlist = await api.products.getWishlist();
        
        // Update localStorage with current wishlist IDs
        const savedIds = wishlist.map(p => p.id);
        setSavedProducts(new Set(savedIds));
        localStorage.setItem('savedProducts', JSON.stringify(savedIds));
        
        // Map backend Product to frontend Product format
        const saved = wishlist.map((apiProduct) => ({
          id: apiProduct.id,
          title: apiProduct.name,
          description: apiProduct.description,
          price: apiProduct.price,
          currency: '₮' as const,
          category: apiProduct.category,
          images: apiProduct.images,
          location: 'Улаанбаатар',
          condition: 'new' as const,
          seller: {
            name: 'Борлуулагч',
            avatar: '/img/human.png',
            rating: 4.8
          },
          rating: apiProduct.rating || 0,
          reviews: apiProduct.reviewCount || 0,
          views: apiProduct.views || 0,
          saves: apiProduct.saves || 0,
          status: apiProduct.status as 'pending' | 'approved' | 'rejected' | undefined,
          createdAt: (() => {
            if (!apiProduct.createdAt) return new Date().toISOString();
            
            const dateStr = typeof apiProduct.createdAt === 'string' 
              ? apiProduct.createdAt 
              : apiProduct.createdAt.toString();
            
            const parsedDate = new Date(dateStr);
            return isNaN(parsedDate.getTime()) 
              ? new Date().toISOString() 
              : parsedDate.toISOString();
          })()
        }));
        
        setProducts(saved);
      } catch (error) {
        console.error('[Wishlist] Failed to fetch saved products:', error);
        // If error, fallback to empty list (don't show other users' products)
        setProducts([]);
        setSavedProducts(new Set());
      } finally {
        setLoading(false);
      }
    };
    
    fetchSavedProducts();
    
    // Listen for wishlist updates from other components
    const handleWishlistUpdate = () => {
      fetchSavedProducts();
    };
    
    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    
    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
    };
  }, [user]);

  const handleUnlike = async (id: string) => {
    try {
      // Call API to unlike
      await api.news.like(id);
      
      // Remove from local state
      setArticles(prev => prev.filter(article => article.id !== id));
      
      // Update localStorage
      const newLiked = new Set(likedArticles);
      newLiked.delete(id);
      setLikedArticles(newLiked);
      localStorage.setItem('likedArticles', JSON.stringify([...newLiked]));
    } catch (error) {
      console.error('Failed to unlike article:', error);
    }
  };

  const handleViewArticle = (id: string) => {
    // Navigate to news page with article selected
    window.location.hash = 'news';
    // Store the article ID to open its detail
    sessionStorage.setItem('openArticleId', id);
  };

  const handleUnsaveProduct = async (id: string) => {
    try {
      // Call API to toggle wishlist
      await api.products.toggleWishlist(id);
      
      // Remove from local state
      setProducts(prev => prev.filter(product => product.id !== id));
      
      // Update localStorage
      const newSaved = new Set(savedProducts);
      newSaved.delete(id);
      setSavedProducts(newSaved);
      localStorage.setItem('savedProducts', JSON.stringify([...newSaved]));
      
      // Dispatch event to update ProductCard components
      window.dispatchEvent(new Event('wishlist-updated'));
    } catch (error) {
      console.error('Failed to unsave product:', error);
    }
  };

  const handleViewProduct = (id: string) => {
    // Navigate to product detail page
    window.location.hash = `product/${id}`;
  };

  const Card = ({ article }: { article: LikedArticle }) => (
    <article className="group relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-4 sm:p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <img
              src={article.image}
              alt={article.title}
              className="h-20 w-20 rounded-2xl object-cover shadow-sm sm:h-24 sm:w-24"
            />
            {article.trending && (
              <span className="absolute -right-2 -top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white shadow">
                <TrendingUp className="h-3 w-3" />
                Тренд
              </span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <h4 
              className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white sm:text-base cursor-pointer hover:text-blue-500 transition"
              onClick={() => handleViewArticle(article.id)}
            >
              {article.title}
            </h4>
            <p className="text-xs text-[var(--color-text-main)]/70 dark:text-slate-300 line-clamp-2 sm:text-sm">
              {article.excerpt}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-main)] dark:bg-slate-900/70 sm:text-[11px]">
                {article.category}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--color-text-main)]/60 sm:text-[11px]">
                <User className="h-3 w-3" />
                {article.author}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-soft)]/60 pt-3">
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-main)]/70">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatNumber(article.views)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              {formatNumber(article.likes)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(article.publishedAt)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleViewArticle(article.id)}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-600 transition hover:bg-blue-600 hover:text-white dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Үзэх
            </button>
            <button
              type="button"
              onClick={() => handleUnlike(article.id)}
              className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-600 transition hover:bg-rose-500 hover:text-white dark:border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400"
            >
              <HeartOff className="h-3.5 w-3.5" />
              Устгах
            </button>
          </div>
        </div>
      </div>
    </article>
  );

  const ProductCard = ({ product }: { product: Product }) => (
    <article className="group relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-4 sm:p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <img
              src={product.images[0] || DEFAULT_IMAGE}
              alt={product.title}
              className="h-20 w-20 rounded-2xl object-cover shadow-sm sm:h-24 sm:w-24"
            />
          </div>
          <div className="flex-1 space-y-2">
            <h4 
              className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white sm:text-base cursor-pointer hover:text-blue-500 transition"
              onClick={() => handleViewProduct(product.id)}
            >
              {product.title}
            </h4>
            <p className="text-xs text-[var(--color-text-main)]/70 dark:text-slate-300 line-clamp-2 sm:text-sm">
              {product.description}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-[var(--color-text-main)] dark:bg-slate-900/70 sm:text-[11px]">
                {product.category}
              </span>
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                {product.price.toLocaleString()}₮
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-soft)]/60 pt-3">
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-main)]/70">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatNumber(product.views)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              {formatNumber(product.saves || 0)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleViewProduct(product.id)}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-600 transition hover:bg-blue-600 hover:text-white dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Үзэх
            </button>
            <button
              type="button"
              onClick={() => handleUnsaveProduct(product.id)}
              className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-600 transition hover:bg-rose-500 hover:text-white dark:border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400"
            >
              <HeartOff className="h-3.5 w-3.5" />
              Устгах
            </button>
          </div>
        </div>
      </div>
    </article>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const currentCount = activeTab === 'news' ? articles.length : products.length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] px-4 py-6 shadow-lg dark:bg-slate-900 sm:px-5">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-br from-rose-500/20 via-transparent to-transparent blur-3xl opacity-70" />
        <div className="relative z-10 space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-main)]/60">Хадгалсан зүйлс</p>
            <h3 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white sm:text-2xl">
              Таны хадгалсан бараа болон нийтлэлүүд
            </h3>
            <p className="text-sm text-[var(--color-text-main)]/70 dark:text-slate-300 max-w-2xl">
              Marketplace болон News хуудсанд хадгалсан зүйлс энд харагдана.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'products'
                  ? 'border border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400'
                  : 'border border-[var(--color-border-soft)] bg-white/50 text-[var(--color-text-main)]/60 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-800/80'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Бараа ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('news')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'news'
                  ? 'border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400'
                  : 'border border-[var(--color-border-soft)] bg-white/50 text-[var(--color-text-main)]/60 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-800/80'
              }`}
            >
              <Newspaper className="h-4 w-4" />
              Нийтлэл ({articles.length})
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      {currentCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-[var(--color-border-soft)] bg-[var(--color-bg-main)] px-6 py-12 text-center text-[var(--color-text-main)]/70 dark:bg-slate-900/70">
          <HeartOff className="h-10 w-10 text-rose-400" />
          <div className="space-y-1">
            <h4 className="text-lg font-semibold text-[var(--color-text-main)] dark:text-white">
              {activeTab === 'news' ? 'Таалагдсан нийтлэл байхгүй байна' : 'Хадгалсан бараа байхгүй байна'}
            </h4>
            <p className="text-sm">
              {activeTab === 'news' 
                ? 'News хуудас руу очиж, сонирхолтой нийтлэлүүдэд "Таалагдлаа" дарж хадгалаарай.'
                : 'Marketplace хуудас руу очиж, таалагдсан бараануудыг хадгалаарай.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.hash = activeTab === 'news' ? 'news' : 'marketplace'}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            <Sparkles className="h-4 w-4" />
            {activeTab === 'news' ? 'News хуудас руу очих' : 'Marketplace руу очих'}
          </button>
        </div>
      ) : isMobile ? (
        <div className="space-y-4">
          {activeTab === 'news' 
            ? articles.map((article) => <Card key={article.id} article={article} />)
            : products.map((product) => <ProductCard key={product.id} product={product} />)
          }
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activeTab === 'news' 
            ? articles.map((article) => <Card key={article.id} article={article} />)
            : products.map((product) => <ProductCard key={product.id} product={product} />)
          }
        </div>
      )}
    </div>
  );
};

export default Wishlist;
