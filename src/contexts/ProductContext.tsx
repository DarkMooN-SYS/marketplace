import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Product } from '../types/product';
import { api, type Product as ApiProduct } from '../api/adminApi';

type ProductContextValue = {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  findProductById: (id: string) => Product | undefined;
  searchProducts: (query: string, category?: string) => Promise<Product[]>;
};

export const ProductContext = createContext<ProductContextValue | undefined>(undefined);
// Convert API Product to local Product type
const convertApiProduct = (apiProduct: ApiProduct): Product => ({
  id: apiProduct.id,
  title: apiProduct.name,
  description: apiProduct.description,
  price: apiProduct.price,
  currency: '₮',
  category: apiProduct.category,
  images: apiProduct.images,
  location: apiProduct.location || 'Улаанбаатар',
  condition: (apiProduct.condition === 'used' ? 'used' : 'new') as 'new' | 'used',
  seller: apiProduct.seller ? {
    name: apiProduct.seller.name || 'Борлуулагч',
    avatar: apiProduct.seller.avatar || '/img/human.png',
    rating: apiProduct.seller.rating ?? 0,
    contact: apiProduct.seller.contact
  } : {
    name: 'Борлуулагч',
    avatar: '/img/human.png',
    rating: 0
  },
  rating: apiProduct.rating || 0,
  reviews: apiProduct.reviewCount || 0,
  views: ('views' in apiProduct && typeof apiProduct.views === 'number') ? apiProduct.views : 0, // Get view count from backend
  saves: ('saves' in apiProduct && typeof apiProduct.saves === 'number') ? apiProduct.saves : 0, // Get saves count from backend
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
});

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get approved products with pagination (optimized for performance)
      const response = await api.products.getAll({ limit: 50, page: 1 });
      const convertedProducts = response.products.map(convertApiProduct);
      setProducts(convertedProducts);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Бүтээгдэхүүн ачаалахад алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchProducts = useCallback(async (query: string, category?: string) => {
    try {
      const response = await api.products.getAll({ 
        search: query, 
        category: category && category !== 'all' ? category : undefined 
      });
      return response.products.map(convertApiProduct);
    } catch (err) {
      console.error('Failed to search products:', err);
      return [];
    }
  }, []);

  // Load products on mount
  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  // Listen for product refresh events
  useEffect(() => {
    const handleRefresh = () => {
      // Silent refresh - no console log needed
      refreshProducts();
    };

    window.addEventListener('products:refresh', handleRefresh);
    return () => window.removeEventListener('products:refresh', handleRefresh);
  }, [refreshProducts]);

  const findProductById = useCallback(
    (id: string) => products.find((product) => product.id === id),
    [products]
  );

  const value = useMemo(
    () => ({ 
      products, 
      isLoading, 
      error, 
      refreshProducts, 
      findProductById, 
      searchProducts 
    }),
    [products, isLoading, error, refreshProducts, findProductById, searchProducts]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

