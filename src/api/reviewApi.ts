import { secureLocalStorage } from '../utils/secureStorage';

// Backend API base URL
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5001/api';

export type ReviewVisibility = 'visible' | 'hidden';

export interface MarketplaceReview {
	id: string;
	productId: string;
	productTitle: string;
	rating: number;
	comment: string;
	createdAt: string;
	userName: string;
	userAvatar?: string;
	status: ReviewVisibility;
	moderatedAt?: string;
	moderatedReason?: string;
}

export interface NewMarketplaceReview {
	productId: string;
	productTitle: string;
	rating: number;
	comment: string;
	userName: string;
	userAvatar?: string;
}

export interface MarketplaceReviewUpdate {
	rating?: number;
	comment?: string;
	userName?: string;
	userAvatar?: string;
}

export interface MarketplaceReviewFilter {
	productId?: string;
	rating?: number;
	status?: ReviewVisibility;
	userId?: string;
}

// Helper function for API requests with 401 handling
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  // 🔒 SECURE: Use secureLocalStorage
  let token = secureLocalStorage.getItem('authToken');
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
      console.warn('[ReviewAPI] 401 Unauthorized - Token expired or invalid');
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

// API-based review store
export const reviewStore = {
	async loadAll(): Promise<MarketplaceReview[]> {
		try {
			return await apiRequest<MarketplaceReview[]>(`${BASE_URL}/reviews`);
		} catch (error) {
			console.error('Error loading reviews:', error);
			return [];
		}
	},

	async getVisible(): Promise<MarketplaceReview[]> {
		try {
			return await apiRequest<MarketplaceReview[]>(`${BASE_URL}/reviews?status=visible`);
		} catch (error) {
			console.error('Error loading visible reviews:', error);
			return [];
		}
	},

	async getByProductId(productId: string): Promise<MarketplaceReview[]> {
		try {
			return await apiRequest<MarketplaceReview[]>(`${BASE_URL}/reviews?productId=${productId}`);
		} catch (error) {
			console.error('Error loading product reviews:', error);
			return [];
		}
	},

	async getById(id: string): Promise<MarketplaceReview | undefined> {
		try {
			return await apiRequest<MarketplaceReview>(`${BASE_URL}/reviews/${id}`);
		} catch (error) {
			console.error('Error loading review:', error);
			return undefined;
		}
	},

	async create(review: NewMarketplaceReview): Promise<MarketplaceReview> {
		try {
			return await apiRequest<MarketplaceReview>(`${BASE_URL}/reviews`, {
				method: 'POST',
				body: JSON.stringify({
					...review,
					status: 'visible',
					createdAt: new Date().toISOString()
				})
			});
		} catch (error) {
			console.error('Error creating review:', error);
			throw error;
		}
	},

	async update(id: string, updates: MarketplaceReviewUpdate): Promise<MarketplaceReview> {
		try {
			return await apiRequest<MarketplaceReview>(`${BASE_URL}/reviews/${id}`, {
				method: 'PUT',
				body: JSON.stringify(updates)
			});
		} catch (error) {
			console.error('Error updating review:', error);
			throw error;
		}
	},

	async moderate(id: string, status: ReviewVisibility, reason?: string): Promise<void> {
		try {
			await apiRequest<void>(`${BASE_URL}/reviews/${id}/moderate`, {
				method: 'POST',
				body: JSON.stringify({
					status,
					reason,
					moderatedAt: new Date().toISOString()
				})
			});
		} catch (error) {
			console.error('Error moderating review:', error);
			throw error;
		}
	},

	async delete(id: string): Promise<void> {
		try {
			await apiRequest<void>(`${BASE_URL}/reviews/${id}`, {
				method: 'DELETE'
			});
		} catch (error) {
			console.error('Error deleting review:', error);
			throw error;
		}
	}
};