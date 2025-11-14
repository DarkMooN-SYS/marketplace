import { secureLocalStorage } from '../utils/secureStorage';

// Backend API base URL
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5001/api';

// 🔒 SECURE: Get auth token from secureLocalStorage
const getAuthToken = (): string | null => {
  // Try secure storage first
  let token = secureLocalStorage.getItem('authToken');
  
  // Fallback: migrate from old localStorage
  if (!token) {
    const oldToken = localStorage.getItem('authToken');
    if (oldToken) {
      secureLocalStorage.setItem('authToken', oldToken);
      localStorage.removeItem('authToken');
      token = oldToken;
    }
  }
  
  return token;
};

const withBase = (endpoint: string) => {
  if (!endpoint.startsWith('/')) {
    return `${BASE_URL}/${endpoint}`;
  }
  return `${BASE_URL}${endpoint}`;
};

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  
  const response = await fetch(withBase(endpoint), {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    
    // If 401 Unauthorized, clear auth and redirect to login
    if (response.status === 401) {
      console.log('[API] Authentication required - clearing stored credentials');
      // 🔒 SECURE: Clear both secure and old storage
      secureLocalStorage.removeItem('authToken');
      secureLocalStorage.removeItem('authUser');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      
      // Dispatch events to notify AuthContext and show login modal
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
      window.dispatchEvent(new CustomEvent('auth:required'));
      
      // Throw a specific error that won't be logged as a generic error
      const authError: Error & { isAuthError?: boolean } = new Error('Authentication required');
      authError.isAuthError = true;
      throw authError;
    }
    
    throw new Error(`API алдаа (${response.status}): ${message || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// Updated interfaces to match backend schema
export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  avatar?: string | null;
  role: 'admin' | 'user';
  balance?: number;
  points?: number;
  membershipLevel?: 'bronze' | 'silver' | 'gold';
  status?: 'active' | 'suspended' | 'banned';
  joinedAt?: string | Date;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  sellerId: string;
  seller?: {
    name: string;
    avatar: string;
    rating: number;
    contact?: string;
  };
  location?: string;
  condition?: string;
  status: 'pending' | 'approved' | 'rejected';
  rating: number;
  reviewCount: number;
  views?: number;
  saves?: number;
  savedBy?: string[];
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface SurveyQuestion {
  id: string;
  prompt: string;
  answerPlaceholder?: string;
  type?: 'text' | 'radio' | 'checkbox' | 'rating';
  question?: string;
  options?: string[];
  required?: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  category: string;
  reward?: number;
  rewardType?: 'points' | 'cash';
  duration?: number;
  rating?: number;
  responses?: number;
  featured?: boolean;
  questions?: SurveyQuestion[];
  submitterId?: string;
  authorId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface Advertisement {
  id: string;
  title: string;
  summary: string;
  budget?: number;
  targetUrl?: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'approved';
  frontendStatus?: 'draft' | 'scheduled' | 'running' | 'completed';
  startDate?: string;
  endDate?: string;
  createdAt: string | Date;
  thumbnail?: string;
  impressions: number;
  clicks: number;
  attachments: Array<{
    id: string;
    type: 'link' | 'image' | 'video' | 'pdf';
    url: string;
    label?: string;
  }>;
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image?: string;
  imageUrl?: string;
  author?: string;
  publishedAt: string | Date;
  createdAt?: string | Date;
  readTime: number;
  trending?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  views?: number;
  likes?: number;
  description?: string;
}

export interface WebLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  logo?: string;
  isOfficial: boolean;
  featured?: boolean;
  votes: number;
  dateAdded?: string | Date;
  createdAt: string | Date;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy?: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

// API functions
export const api = {
  // Authentication
  auth: {
    register: (data: { phone: string; password: string; name: string; verified?: boolean }) =>
      request<{ message: string; userId: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    login: (data: { phone: string; password: string }) =>
      request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    verify: () => request<{ user: User }>('/auth/verify'),
  },

  // Users
  users: {
    getAll: () => request<User[]>('/users'),
    getProfile: () => request<User>('/users/profile'),
    updateProfile: (data: { name?: string; phone?: string; avatar?: string }) =>
      request<{ message: string }>('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateBalance: (data: { amount: number; type: 'add' | 'subtract' }) =>
      request<{ message: string; newBalance: number }>('/users/balance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Products
  products: {
    getAll: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      
      const query = searchParams.toString();
      return request<{ products: Product[]; total: number; page: number; totalPages: number }>(
        `/products${query ? `?${query}` : ''}`
      );
    },
    
    getById: (id: string) => request<Product>(`/products/${id}`),
    
    create: (data: Partial<Product>) =>
      request<{ message: string; productId: string }>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: Partial<Product>) =>
      request<{ message: string }>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      request<{ message: string }>(`/products/${id}`, { method: 'DELETE' }),
    
    getMyProducts: () => request<Product[]>('/products/user/my-products'),
    
    // Wishlist/Save product
    toggleWishlist: (id: string) =>
      request<{ saves: number; isSaved: boolean }>(`/products/${id}/wishlist`, {
        method: 'POST',
      }),
    
    // Increment view count
    view: (id: string) =>
      request<{ views: number }>(`/products/${id}/view`, {
        method: 'POST',
      }),
    
    // Get user's wishlist
    getWishlist: () => request<Product[]>('/products/user/wishlist'),
  },

  // Reviews
  reviews: {
    getAll: () => request<Review[]>('/reviews'),
    getByProduct: (productId: string) => request<Review[]>(`/reviews/product/${productId}`),
    create: (data: { productId: string; rating: number; comment: string }) =>
      request<{ message: string; reviewId: string }>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { rating?: number; comment?: string }) =>
      request<{ message: string }>(`/reviews/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/reviews/${id}`, { method: 'DELETE' }),
  },

  // Orders
  orders: {
    getMyOrders: () => request<Order[]>('/orders/my-orders'),
    create: (data: { productId: string; quantity: number; totalAmount: number }) =>
      request<{ message: string; orderId: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: string) =>
      request<{ message: string }>(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },

  // Surveys
  surveys: {
    getAll: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      
      const query = searchParams.toString();
      return request<{ surveys: Survey[]; total: number; page: number; totalPages: number; status: string }>(
        `/surveys${query ? `?${query}` : ''}`
      );
    },
    
    getById: (id: string) => request<Survey>(`/surveys/${id}`),
    
    submit: (data: Partial<Survey>) =>
      request<{ message: string; surveyId: string }>('/surveys', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      
    submitResponse: (id: string, answers: Record<string, string | number | string[]>) =>
      request<{ message: string; responseId: string; reward?: number; rewardType?: string }>(`/surveys/${id}/responses`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }),
  },

  // Admin
  admin: {
    getDashboardStats: () =>
      request<{
        totalUsers: number;
        totalProducts: number;
        totalOrders: number;
        totalReviews: number;
        pendingProducts: number;
        pendingSurveys: number;
      }>('/admin/dashboard/stats'),
    
    getPendingProducts: () => request<Product[]>('/admin/products/pending'),
    updateProductStatus: (id: string, status: 'approved' | 'rejected', reason?: string) =>
      request<{ message: string }>(`/admin/products/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason }),
      }),
    
    getPendingSurveys: () => request<Survey[]>('/admin/surveys/pending'),
    updateSurveyStatus: (id: string, status: 'approved' | 'rejected', reason?: string) =>
      request<{ message: string }>(`/admin/surveys/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason }),
      }),
  },

  // Advertisements
  advertisements: {
    getAll: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      
      const query = searchParams.toString();
      return request<{ advertisements: Advertisement[]; total: number; page: number; totalPages: number }>(
        `/advertisements${query ? `?${query}` : ''}`
      );
    },
    
    getById: (id: string) => request<Advertisement>(`/advertisements/${id}`),
    
    submit: (data: Partial<Advertisement>) =>
      request<{ message: string; advertisementId: string }>('/advertisements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    recordImpression: (id: string) =>
      request<{ message: string }>(`/advertisements/${id}/impression`, {
        method: 'POST',
      }),

    recordClick: (id: string) =>
      request<{ message: string }>(`/advertisements/${id}/click`, {
        method: 'POST',
      }),

    update: (id: string, data: Partial<Advertisement>) =>
      request<{ message: string; advertisement: Advertisement }>(`/advertisements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/advertisements/${id}`, {
        method: 'DELETE',
      }),
  },

  // News
  news: {
    getAll: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      
      const query = searchParams.toString();
      return request<{ news: NewsArticle[]; total: number; page: number; totalPages: number }>(
        `/news${query ? `?${query}` : ''}`
      );
    },
    
    getById: (id: string) => request<NewsArticle>(`/news/${id}`),
    
    submit: (data: Partial<NewsArticle>) =>
      request<{ message: string; articleId: string }>('/news', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      
    like: (id: string) =>
      request<{ likes: number; isLiked: boolean }>(`/news/${id}/like`, {
        method: 'POST',
      }),
    
    view: (id: string) =>
      request<{ views: number }>(`/news/${id}/view`, {
        method: 'POST',
      }),
  },

  // Web Links
  weblinks: {
    getAll: (params?: { category?: string; search?: string; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      
      const query = searchParams.toString();
      return request<{ weblinks: WebLink[]; total: number; page: number; totalPages: number }>(
        `/weblinks${query ? `?${query}` : ''}`
      );
    },
    
    getById: (id: string) => request<WebLink>(`/weblinks/${id}`),
    
    submit: (data: Partial<WebLink>) =>
      request<{ message: string; weblinkId: string }>('/weblinks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    vote: (id: string) =>
      request<{ message: string; votes: number }>(`/weblinks/${id}/vote`, {
        method: 'POST',
      }),
  },

  // Notifications
  notifications: {
    getAll: () => request<Notification[]>('/notifications'),
    
    markAsRead: (id: string) =>
      request<{ message: string }>(`/notifications/${id}/read`, {
        method: 'PUT',
      }),
    
    markAllAsRead: () =>
      request<{ message: string; count: number }>('/notifications/read-all', {
        method: 'PUT',
      }),
    
    delete: (id: string) =>
      request<{ message: string }>(`/notifications/${id}`, {
        method: 'DELETE',
      }),
    
    clearAll: () =>
      request<{ message: string; count: number }>('/notifications', {
        method: 'DELETE',
      }),
    
    create: (data: { userId?: string; type?: string; title: string; message: string; actionUrl?: string; actionLabel?: string }) =>
      request<{ message: string; notificationId: string }>('/notifications', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Wallet
  wallet: {
    getWalletData: () =>
      request<{ balance: number; transactions: { id: string; type: 'credit' | 'debit'; title: string; subtitle?: string; amount: number; date: string; }[] }>('/wallet'),
    
    topup: (data: { amount: number; method?: string }) =>
      request<{ message: string; newBalance: number }>('/wallet/topup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    withdraw: (data: { amount: number; bankAccount?: string }) =>
      request<{ message: string; newBalance: number }>('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Sessions
  sessions: {
    getAll: () =>
      request<{ id: string; type: string; lastLogin: string; location: string; deviceName?: string; userAgent?: string; ip?: string; }[]>('/sessions'),
    
    create: (data: { deviceType?: string; deviceName?: string; location?: string }) =>
      request<{ success: boolean; session: { id: string; userId: string; deviceType: string; deviceName: string; location: string; ip: string; userAgent: string; lastActivity: string; createdAt: string; } }>('/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    deleteSession: (id: string) =>
      request<{ success: boolean; message: string }>(`/sessions/${id}`, {
        method: 'DELETE',
      }),
    
    deleteAll: (currentSessionId?: string) =>
      request<{ success: boolean; message: string; deletedCount: number }>('/sessions', {
        method: 'DELETE',
        body: JSON.stringify({ currentSessionId }),
      }),
    
    updateActivity: (id: string) =>
      request<{ success: boolean }>(`/sessions/${id}/activity`, {
        method: 'PUT',
      }),
    
    cleanup: () =>
      request<{ success: boolean; message: string; deletedCount: number }>('/sessions/cleanup', {
        method: 'POST',
      }),
  },

  // Activities
  activities: {
    getAll: (limit?: number) =>
      request<{ 
        activities: Array<{
          id: string;
          action: string;
          item: string;
          type: 'survey' | 'product' | 'ui_update' | 'rank' | 'news' | 'advertisement' | 'weblink';
          timestamp: string;
          createdBy?: string;
        }>;
      }>(`/activities${limit ? `?limit=${limit}` : ''}`),
    
    create: (data: { action: string; item: string; type: string }) =>
      request<{ 
        message: string; 
        activity: {
          id: string;
          action: string;
          item: string;
          type: string;
          timestamp: string;
          createdBy: string;
        };
      }>('/activities', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getUpcoming: (limit?: number) =>
      request<{
        events: Array<{
          id: string;
          title: string;
          subtitle?: string;
          date: string;
          createdAt?: string;
          createdBy?: string;
        }>;
      }>(`/activities/upcoming${limit ? `?limit=${limit}` : ''}`),
    
    createUpcoming: (data: { title: string; subtitle?: string; date: string }) =>
      request<{
        message: string;
        event: {
          id: string;
          title: string;
          subtitle?: string;
          date: string;
          createdAt: string;
          createdBy: string;
        };
      }>('/activities/upcoming', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Spin Rewards
  spinRewards: {
    getAll: () =>
      request<{
        segments: Array<{
          id: number;
          label: string;
          icon: string;
          color: string;
          type: 'discount' | 'bonus' | 'retry' | 'none';
          value: number;
          weight: number;
        }>;
      }>('/spin/rewards'),
    
    update: (segments: Array<{
      id: number;
      label: string;
      icon: string;
      color: string;
      type: 'discount' | 'bonus' | 'retry' | 'none';
      value: number;
      weight: number;
    }>) =>
      request<{ message: string }>('/spin/rewards', {
        method: 'PUT',
        body: JSON.stringify({ segments }),
      }),
  },
};

// Export the API object as default and named export
export default api;

// Legacy export for backward compatibility
export const adminApi = api.admin;
