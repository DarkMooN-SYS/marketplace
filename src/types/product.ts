export interface ProductSeller {
  name: string;
  avatar: string;
  rating: number;
  contact?: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: '₮';
  location: string;
  category: string;
  categoryKey?: string;
  condition: 'new' | 'used';
  images: string[];
  rating: number;
  reviews: number;
  views: number;
  saves?: number; // Number of times product was saved to wishlist
  seller: ProductSeller;
  sellerUserId?: string; // owner user id for edit authorization
  featured?: boolean;
  contact?: string;
  status?: 'pending' | 'approved' | 'rejected'; // approval status
  details?: {
    highlights?: string[];
    specs?: Record<string, string>;
  };
  createdAt?: string;
}
