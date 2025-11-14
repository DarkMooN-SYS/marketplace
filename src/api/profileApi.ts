import { secureLocalStorage } from '../utils/secureStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Helper function for API requests with 401 handling
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  // 🔒 SECURE: Use secureLocalStorage instead of localStorage
  let token = secureLocalStorage.getItem('authToken');
  
  // Fallback: check old localStorage and migrate
  if (!token) {
    const oldToken = localStorage.getItem('authToken');
    if (oldToken) {
      secureLocalStorage.setItem('authToken', oldToken);
      localStorage.removeItem('authToken');
      token = oldToken;
    }
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    // If 401 Unauthorized, clear auth and notify
    if (response.status === 401) {
      console.warn('[ProfileAPI] 401 Unauthorized - Token expired or invalid');
      // Clear both secure and old storage
      secureLocalStorage.removeItem('authToken');
      secureLocalStorage.removeItem('authUser');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
    }
    
    throw new Error(`Failed to ${options?.method || 'GET'} ${url}`);
  }

  return response.json() as Promise<T>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: string;
  balance: number;
  points: number;
  memberSince: string;
  location?: string;
  title?: string;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Extended profile fields
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  city?: string;
  district?: string;
  address?: string;
  occupation?: string;
  company?: string;
  education?: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other';
  monthlyIncome?: 'under_500k' | '500k_1m' | '1m_2m' | '2m_5m' | 'over_5m' | 'prefer_not_to_say';
  interests?: string[];
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not_to_say';
  hasChildren?: boolean;
  childrenCount?: number;
  acceptMarketing?: boolean;
  preferredContactMethod?: 'phone' | 'email' | 'sms' | 'app_notification';
  profileCompleted?: boolean;
  profileCompletedAt?: string;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
  avatar?: string;
  location?: string;
  title?: string;
  
  // Extended profile fields
  email?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  city?: string;
  district?: string;
  address?: string;
  occupation?: string;
  company?: string;
  education?: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other';
  monthlyIncome?: 'under_500k' | '500k_1m' | '1m_2m' | '2m_5m' | 'over_5m' | 'prefer_not_to_say';
  interests?: string[];
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not_to_say';
  hasChildren?: boolean;
  childrenCount?: number;
  acceptMarketing?: boolean;
  preferredContactMethod?: 'phone' | 'email' | 'sms' | 'app_notification';
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'topup' | 'withdraw' | 'purchase' | 'sale';
  amount: number;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export const profileApi = {
  async getProfile(): Promise<UserProfile> {
    return apiRequest<UserProfile>(`${API_BASE_URL}/users/profile`, {
      method: 'GET',
    });
  },

  async updateProfile(data: ProfileUpdateData): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getMyOrders(): Promise<Order[]> {
    const result = await apiRequest<Order[] | { orders: Order[] }>(`${API_BASE_URL}/orders/my-orders`, {
      method: 'GET',
    });
    
    // Backend нь шууд orders array буцаана
    return Array.isArray(result) ? result : [];
  },

  async updateBalance(amount: number, type: 'add' | 'subtract'): Promise<{ message: string; newBalance: number }> {
    return apiRequest<{ message: string; newBalance: number }>(`${API_BASE_URL}/users/balance`, {
      method: 'POST',
      body: JSON.stringify({ amount, type }),
    });
  },

  async createOrder(orderData: {
    productId: string;
    quantity: number;
    totalAmount: number;
  }): Promise<Order> {
    return apiRequest<Order>(`${API_BASE_URL}/orders`, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    return apiRequest<Order>(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async getMyReviews(): Promise<Review[]> {
    const result = await apiRequest<Review[] | { reviews: Review[] }>(`${API_BASE_URL}/reviews/my-reviews`, {
      method: 'GET',
    });
    
    return Array.isArray(result) ? result : [];
  },

  async updateReview(reviewId: string, data: { rating?: number; comment?: string }): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteReview(reviewId: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  },

  async completeProfile(data: ProfileUpdateData): Promise<{ message: string; profileCompleted: boolean }> {
    return apiRequest<{ message: string; profileCompleted: boolean }>(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, profileCompleted: true }),
    });
  },

  isProfileComplete(profile: UserProfile): boolean {
    const hasBasicInfo = Boolean(profile.name && profile.phone);
    const hasContactInfo = Boolean(profile.email);
    const hasLocation = Boolean(profile.city);
    const hasInterests = Boolean(profile.interests && profile.interests.length > 0);
    
    return hasBasicInfo && (hasContactInfo || hasLocation || hasInterests);
  },

  getProfileCompletionPercentage(profile: UserProfile): number {
    const fields = [
      profile.name,
      profile.phone,
      profile.email,
      profile.dateOfBirth,
      profile.gender,
      profile.city,
      profile.district,
      profile.address,
      profile.occupation,
      profile.company,
      profile.education,
      profile.monthlyIncome,
      profile.interests && profile.interests.length > 0,
      profile.maritalStatus,
      profile.preferredContactMethod
    ];

    const filledFields = fields.filter(field => {
      if (typeof field === 'boolean') return field;
      return field !== undefined && field !== null && field !== '';
    }).length;

    return Math.round((filledFields / fields.length) * 100);
  },

  async getMyTransactions(): Promise<Transaction[]> {
    // TODO: Backend endpoint-г нэмэх хэрэгтэй
    // Одоогоор orders-оос transaction-ууд үүсгэе
    const orders = await this.getMyOrders();
    
    return orders.map((order) => ({
      id: `txn-${order.id}`,
      userId: order.buyerId,
      type: 'purchase' as const,
      amount: -order.totalAmount,
      description: `Худалдан авалт: ${order.productName}`,
      balanceBefore: 0,
      balanceAfter: 0,
      createdAt: order.createdAt,
    }));
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`${API_BASE_URL}/users/change-password`, {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  async updatePoints(amount: number, type: 'add' | 'subtract'): Promise<{ message: string; newPoints: number }> {
    return apiRequest<{ message: string; newPoints: number }>(`${API_BASE_URL}/users/points`, {
      method: 'POST',
      body: JSON.stringify({ amount, type }),
    });
  },

  async getSellerRating(): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
    recentReviews: Array<{
      id: string;
      rating: number;
      comment: string;
      userName: string;
      productId: string;
      createdAt: string;
    }>;
  }> {
    return apiRequest(`${API_BASE_URL}/users/seller-rating`, {
      method: 'GET',
    });
  },
};
