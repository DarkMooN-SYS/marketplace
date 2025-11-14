import { useMemo, useState, useEffect } from 'react';
import {
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Package,
  Tag,
  TrendingUp,
  ShieldCheck,
  Layers,
  Plus,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import FilterBar from '../components/FilterBar';
import { useProducts } from '../hooks/useProducts';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/adminApi';
import type { Product } from '../types/product';

type MarketplaceFilterConfig = Array<{
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}>;

const marketplaceFilters: MarketplaceFilterConfig = [
  {
    key: 'category',
    label: 'Ангилал',
    options: [
      { value: 'electronics', label: 'Цахилгаан бараа' },
      { value: 'fashion', label: 'Гоёл загвар' },
      { value: 'furniture', label: 'Тавилга' },
      { value: 'books', label: 'Ном' },
      { value: 'sports', label: 'Спорт, Гадаа' },
      { value: 'other', label: 'Бусад' },
    ],
  },
  {
    key: 'condition',
    label: 'Байдал',
    options: [
      { value: 'new', label: 'Шинэ' },
      { value: 'used', label: 'Хуучин' },
    ],
  },
  {
    key: 'price',
    label: 'Үнэний хүрээ',
    options: [
      { value: 'under-200k', label: '200,000₮-өөс доош' },
      { value: '200k-500k', label: '200,000₮ - 500,000₮' },
      { value: '500k-1m', label: '500,000₮ - 1,000,000₮' },
      { value: '1m-3m', label: '1,000,000₮ - 3,000,000₮' },
      { value: 'over-3m', label: '3,000,000₮-аас дээш' },
    ],
  },
  {
    key: 'sort',
    label: 'Эрэмбэлэх',
    options: [
      { value: 'newest', label: 'Шинээр нэмэгдсэн' },
      { value: 'price-low', label: 'Үнэ: багаас их' },
      { value: 'price-high', label: 'Үнэ: ихээс бага' },
      { value: 'rating', label: 'Хамгийн өндөр үнэлгээтэй' },
    ],
  },
];

const matchPriceFilter = (product: Product, value: string) => {
  const price = product.price;

  switch (value) {
    case 'under-200k':
      return price < 200_000;
    case '200k-500k':
      return price >= 200_000 && price <= 500_000;
    case '500k-1m':
      return price > 500_000 && price <= 1_000_000;
    case '1m-3m':
      return price > 1_000_000 && price <= 3_000_000;
    case 'over-3m':
      return price > 3_000_000;
    default:
      return true;
  }
};

const sortProducts = (items: Product[], sortKey?: string) => {
  const list = [...items];

  switch (sortKey) {
    case 'price-low':
      return list.sort((a, b) => a.price - b.price);
    case 'price-high':
      return list.sort((a, b) => b.price - a.price);
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating);
    case 'newest':
      return list.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : Number(a.id) || 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : Number(b.id) || 0;
        return bDate - aDate;
      });
    default:
      return list;
  }
};

export default function Marketplace() {
  const { setCurrentPage } = useNavigation();
  const { user } = useAuth();
  const { products, refreshProducts } = useProducts();
  // 🆕 Default sort: newest (шинэ зүйлс эхэнд)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    sort: 'newest'
  });
  const [savedProducts, setSavedProducts] = useState<Set<string>>(new Set());
  const [viewedProducts, setViewedProducts] = useState<Set<string>>(new Set());

  // Load saved and viewed products from localStorage on mount
  useEffect(() => {
    const savedStr = localStorage.getItem('savedProducts');
    if (savedStr) {
      setSavedProducts(new Set(JSON.parse(savedStr)));
    }
    const viewedStr = localStorage.getItem('viewedProducts');
    if (viewedStr) {
      setViewedProducts(new Set(JSON.parse(viewedStr)));
    }
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setActiveFilters({});
  };

  const handleSellClick = () => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent('auth:open', {
          detail: { mode: 'login' as const },
        })
      );
      return;
    }
    setCurrentPage('submit-product');
    window.location.hash = 'submit-product';
  };

  const handleViewProduct = async (id: string) => {
    // Increment view count only if not viewed before
    if (!viewedProducts.has(id)) {
      try {
        // Call backend API to increment view
        await api.products.view(id);
        
        // Mark as viewed locally
        const newViewed = new Set(viewedProducts);
        newViewed.add(id);
        setViewedProducts(newViewed);
        localStorage.setItem('viewedProducts', JSON.stringify([...newViewed]));
        
        // Refresh products to get updated view count
        await refreshProducts();
      } catch (error) {
        console.error('Failed to increment view:', error);
        // Still mark as viewed locally to prevent multiple attempts
        const newViewed = new Set(viewedProducts);
        newViewed.add(id);
        setViewedProducts(newViewed);
        localStorage.setItem('viewedProducts', JSON.stringify([...newViewed]));
      }
    }
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
      
      // Update local state based on backend response
      const newSaved = new Set(savedProducts);
      if (response.isSaved) {
        newSaved.add(id);
      } else {
        newSaved.delete(id);
      }
      setSavedProducts(newSaved);
      localStorage.setItem('savedProducts', JSON.stringify([...newSaved]));
      
      // Dispatch custom event to notify ProductCard components
      window.dispatchEvent(new Event('wishlist-updated'));
      
      // Refresh products to get updated save count
      await refreshProducts();
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    }
  };

  const toggleSort = (value: string) => {
    setActiveFilters((prev) => ({ ...prev, sort: prev.sort === value ? '' : value }));
  };

  const togglePrice = (value: string) => {
    setActiveFilters((prev) => ({ ...prev, price: prev.price === value ? '' : value }));
  };

  const filteredProducts = useMemo<Product[]>(() => {
    const { category, condition, price, sort } = activeFilters;

    const items = products.filter((product) => {
      const categoryKey = product.categoryKey ?? product.category.toLowerCase();
      const matchesCategory = category ? categoryKey === category : true;
      const matchesCondition = condition ? product.condition === condition : true;
      const matchesPrice = price ? matchPriceFilter(product, price) : true;

      return matchesCategory && matchesCondition && matchesPrice;
    });

    return sortProducts(items, sort);
  }, [products, activeFilters]);

  const featuredProducts = useMemo<Product[]>(
    () => filteredProducts.filter((product) => product.featured),
    [filteredProducts]
  );

  const regularProducts = useMemo<Product[]>(
    () => filteredProducts.filter((product) => !product.featured),
    [filteredProducts]
  );

  // All products are now from API, no need to calculate user added count
  const totalViews = filteredProducts.reduce((acc, item) => acc + (item.views || 0), 0);

  const heroStats = [
    {
      label: 'Нийт бараа',
      value: filteredProducts.length.toLocaleString(),
      meta: `${featuredProducts.length} онцлох`,
      icon: ShoppingBag,
      tone: 'from-pink-500/15 via-pink-500/5 to-transparent',
    },
    {
      label: 'API-аас ачаалсан',
      value: products.length.toLocaleString(),
      meta: 'Өгөгдлийн сангаас',
      icon: Sparkles,
      tone: 'from-yellow-500/15 via-yellow-500/5 to-transparent',
    },
    {
      label: 'Нийт үзэлт',
      value: totalViews.toLocaleString(),
      meta: 'Үзсэн тоо (сүүлийн жагсаалт)',
      icon: TrendingUp,
      tone: 'from-green-500/15 via-green-500/5 to-transparent',
    },
  ];

  const quickActions = [
    {
      label: 'Бараа нэмэх',
      description: 'Шинэ бүтээгдэхүүн зах зээлд нэмэх.',
      icon: Plus,
      tone: 'from-blue-500/15 via-blue-500/5 to-transparent',
      onClick: handleSellClick,
    },
    {
      label: 'Шүүлтүүр',
      description: 'Барааг төрөл, үнэ, нөхцөлөөр шүүх.',
      icon: Layers,
      tone: 'from-indigo-500/15 via-indigo-500/5 to-transparent',
      onClick: handleClearFilters,
    },
    {
      label: 'Өндөр үнэлгээтэй',
      description: 'Өндөр үнэлгээтэй барааг эрэмбэлж харах.',
      icon: ShieldCheck,
      tone: 'from-purple-500/15 via-purple-500/5 to-transparent',
      onClick: () => toggleSort('rating'),
    },
    {
      label: 'Хямдралтай хайлт',
      description: '500,000₮ хүртэлх барааг харуулах.',
      icon: Tag,
      tone: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
      onClick: () => togglePrice('200k-500k'),
    },
    {
      label: 'Саяхан нэмэгдсэн',
      description: 'Шинээр орсон барааг түрүүлж үзэх.',
      icon: Package,
      tone: 'from-amber-500/15 via-amber-500/5 to-transparent',
      onClick: () => toggleSort('newest'),
    },
  ];

  return (
    <div className="space-y-10 mobile:space-y-12">
      <section className="relative overflow-hidden rounded-3xl notebook:rounded-2xl border border-[var(--color-border-soft)] bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-6 text-white shadow-lg mobile:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_55%)]" />
        <div className="relative z-10 flex flex-col gap-10 notebook:flex-row notebook:items-center notebook:justify-between">
          <div className="space-y-6 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em]">
              <Layers className="h-4 w-4" />
              ЗАХ ЗЭЭЛ
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight mobile:text-4xl computer:text-5xl">
                Дижитал зах зээл дээрээ бараагаа байршуулж, борлуулалтаа түргэсгэе
              </h1>
              <p className="text-base text-blue-100/90 mobile:text-lg">
                Хэрэглэгчидтэй шууд холбогдож, тодорхой шүүлтүүрүүдээр бараагаа онцолж, үнэ цэнээ өсгөөрэй.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSellClick}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                Бараа зарах
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Шүүлтүүрийг цэвэрлэх
              </button>
            </div>
          </div>

          <div className="grid gap-4 mobile:grid-cols-2 notebook:grid-cols-1 notebook:w-72">
            {heroStats.map((stat) => (
              <div key={stat.label} className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${stat.tone}`} />
                <div className="relative z-10 space-y-2 text-white">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700">
                    <stat.icon className="h-4 w-4" />
                    {stat.label}
                  </span>
                  <div className="text-2xl font-semibold">{stat.value}</div>
                  <p className="text-xs text-white/80">{stat.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 mobile:grid-cols-2 computer:grid-cols-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="group relative overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${action.tone}`} />
            <div className="relative z-10 space-y-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-white/80 text-[var(--color-border-main)] dark:bg-slate-900/70">
                <action.icon className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--color-text-main)] dark:text-white">{action.label}</p>
                <p className="text-xs text-[var(--color-text-main)]/70 dark:text-white/70">{action.description}</p>
              </div>
            </div>
          </button>
        ))}
      </section>

      <FilterBar
        filters={marketplaceFilters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearFilters}
      />

      {featuredProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 mobile:flex-row mobile:items-end mobile:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
                Хамгийн эрэлттэй
              </p>
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white mobile:text-2xl">
                Онцлох бараанууд
              </h2>
            </div>
            <p className="text-xs font-semibold text-[var(--color-text-main)]/60 dark:text-white/60">
              Нийт {featuredProducts.length} онцлох бараа
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 notebook:grid-cols-3 computer:grid-cols-4 notebook:gap-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={handleViewProduct}
                onSave={handleSaveProduct}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 mobile:flex-row mobile:items-end mobile:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-text-main)]/60 dark:text-white/50">
              Бүх бараанууд
            </p>
            <h2 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white mobile:text-2xl">
              Шүүлтүүрт таарах бүх жагсаалт
            </h2>
          </div>
          <span className="text-xs font-semibold text-[var(--color-text-main)]/60 dark:text-white/60">
            Харагдаж буй {regularProducts.length || filteredProducts.length} бараа
          </span>
        </div>

        {regularProducts.length === 0 ? (
          <div className="rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-bg-main)] p-6 text-center text-sm text-[var(--color-text-main)]/70">
            Таны сонгосон шүүлтүүрт тохирох бараа одоогоор алга. Шүүлтүүрээ өөрчлөөд дахин хайгаарай.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 notebook:grid-cols-3 computer:grid-cols-4 notebook:gap-4">
            {regularProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={handleViewProduct}
                onSave={handleSaveProduct}
                isAuthenticated={!!user}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}