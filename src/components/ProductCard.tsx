import { MapPin, Heart, Star, Eye, ShieldCheck, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Product } from '../types/product';
import { getSellerAvatar } from '../utils/avatarHelper';

interface ProductCardProps {
  product: Product;
  onView: (id: string) => void;
  onSave: (id: string) => void;
  isAuthenticated?: boolean; // Add authentication status
}

export default function ProductCard({ product, onView, onSave, isAuthenticated = false }: ProductCardProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);

  // Check wishlist status from localStorage
  useEffect(() => {
    const checkWishlistStatus = () => {
      const savedStr = localStorage.getItem('savedProducts');
      if (savedStr) {
        const saved = new Set<string>(JSON.parse(savedStr));
        setIsInWishlist(saved.has(product.id));
      } else {
        setIsInWishlist(false);
      }
    };

    checkWishlistStatus();

    // Listen for localStorage changes (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'savedProducts') {
        checkWishlistStatus();
      }
    };

    // Listen for custom event (from same tab)
    const handleWishlistChange = () => {
      checkWishlistStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('wishlist-updated', handleWishlistChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wishlist-updated', handleWishlistChange);
    };
  }, [product.id]);

  const sellerAvatar = getSellerAvatar(product.seller);
  
  // Debug: Log seller info
  if (!sellerAvatar || sellerAvatar === '/img/human.png') {
    console.log('ProductCard Debug:', {
      productId: product.id,
      sellerName: product.seller?.name,
      sellerAvatar: product.seller?.avatar,
      computedAvatar: sellerAvatar
    });
  }

  const isNew = product.condition === 'new';
  const conditionLabel = isNew ? 'Шинэ бараа' : 'Хэрэглэсэн бараа';

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl notebook:rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl`}
      onClick={() => onView(product.id)}
    >
      <div className="relative h-40 w-full overflow-hidden mobile:h-48">
        <img
          src={product.images[0]}
          alt={product.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        {product.featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-border-main)]/15 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur mobile:left-4 mobile:top-4 mobile:px-3 mobile:text-xs">
            <Star className="h-3.5 w-3.5 mobile:h-4 mobile:w-4" />
            Онцлох
          </span>
        )}
        
        {product.status === 'pending' && (
          <span className="absolute left-3 top-12 inline-flex items-center gap-2 rounded-full bg-yellow-500/90 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur mobile:left-4 mobile:top-14 mobile:px-3 mobile:text-xs">
            ⏳ Хянагдаж байна
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave(product.id);
          }}
          disabled={!isAuthenticated}
          className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition mobile:right-4 mobile:top-4 mobile:h-9 mobile:w-9 ${
            !isAuthenticated
              ? 'border-gray-300/50 bg-white/60 text-gray-400 cursor-not-allowed dark:bg-slate-800/60 dark:border-gray-600/50'
              : isInWishlist
              ? 'border-red-500 bg-red-500 text-white hover:bg-red-600 hover:border-red-600'
              : 'border-[var(--color-border-soft)] bg-[var(--color-bg-main)]/90 text-[var(--color-text-main)] hover:border-[var(--color-border-main)] hover:text-[var(--color-border-main)] dark:bg-slate-900/80'
          }`}
          title={!isAuthenticated ? 'Нэвтэрч орсны дараа хадгалах боломжтой' : isInWishlist ? 'Хадгаласнаас хасах' : 'Хадгалах'}
        >
          <Heart className={`h-3.5 w-3.5 mobile:h-4 mobile:w-4 ${isInWishlist && isAuthenticated ? 'fill-current' : ''}`} />
        </button>

        <span className="absolute bottom-3 right-3 rounded-full border border-white/30 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur mobile:bottom-4 mobile:right-4 mobile:px-3 mobile:text-[11px]">
          {product.images.length} зураг
        </span>
      </div>

      <div className="space-y-3 p-4 mobile:space-y-4 mobile:p-5">
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-[var(--color-text-main)] transition group-hover:text-[var(--color-border-main)] mobile:text-base">
            {product.title}
          </h3>
          <p className="text-xs text-[var(--color-text-main)]/80 line-clamp-2 mobile:text-sm">
            {product.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mobile:gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-2.5 py-1.5 text-[10px] font-semibold text-[var(--color-text-main)] dark:bg-slate-900/60 mobile:gap-2 mobile:px-3 mobile:py-2 mobile:text-[11px]">
            {isNew ? <ShieldCheck className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" /> : <RefreshCw className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />}
            {conditionLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--color-border-soft)] bg-white/80 px-2.5 py-1.5 text-[10px] font-semibold text-[var(--color-text-main)] dark:bg-slate-900/60 mobile:gap-2 mobile:px-3 mobile:py-2 mobile:text-[11px]">
            <MapPin className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
            {product.location}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--color-text-main)]/80 mobile:text-sm">
          <div className="flex items-center gap-2">
            <img
              src={sellerAvatar}
              alt={product.seller.name}
              className="h-7 w-7 rounded-full object-cover border border-[var(--color-border-soft)] mobile:h-8 mobile:w-8"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Only set fallback once to avoid infinite loop
                if (!target.dataset.fallbackApplied) {
                  console.warn('Failed to load seller avatar:', target.src);
                  target.src = '/img/human.png';
                  target.dataset.fallbackApplied = 'true';
                }
              }}
            />
            <div className="text-[11px] text-[var(--color-text-main)] mobile:text-xs">
              <div className="font-semibold line-clamp-1">{product.seller.name}</div>
              <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-main)]/70 mobile:text-[11px]">
                <Star className="h-3 w-3 text-yellow-400" />
                {product.seller.rating}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-base font-semibold text-[var(--color-text-main)] mobile:text-lg">
              {product.currency}
              {product.price.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-[var(--color-text-main)]/70 mobile:gap-2 mobile:text-[11px]">
              <Eye className="h-3 w-3 mobile:h-3.5 mobile:w-3.5" />
              {product.views.toLocaleString()}
              {product.reviews > 0 && (
                <span className="inline-flex items-center gap-1">
                  ·
                  <Star className="h-3 w-3 text-yellow-400" />
                  {product.rating}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}