// Wishlist Store - Backend API Based
// Uses backend API instead of localStorage for wishlist management

import { api } from '../api/adminApi';

export interface WishlistItem {
  productId: string;
  addedAt: string;
}

export interface ProductViews {
  [productId: string]: number;
}

// Wishlist functions (now using backend API)
export const wishlistStore = {
  // Get all wishlist items from backend
  async getAll(): Promise<WishlistItem[]> {
    try {
      const products = await api.products.getWishlist();
      return products.map(p => ({
        productId: p.id,
        addedAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString()
      }));
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      return [];
    }
  },

  // Check if product is in wishlist (fetch from backend)
  async has(productId: string): Promise<boolean> {
    try {
      const items = await this.getAll();
      return items.some(item => item.productId === productId);
    } catch (error) {
      console.error('Failed to check wishlist:', error);
      return false;
    }
  },

  // Add product to wishlist (toggle on backend)
  async add(productId: string): Promise<void> {
    try {
      const result = await api.products.toggleWishlist(productId);
      
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('wishlist:change', {
        detail: { productId, added: result.isSaved }
      }));
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      throw error;
    }
  },

  // Remove product from wishlist (toggle on backend)
  async remove(productId: string): Promise<void> {
    try {
      const result = await api.products.toggleWishlist(productId);
      
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('wishlist:change', {
        detail: { productId, added: result.isSaved }
      }));
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      throw error;
    }
  },

  // Toggle product in wishlist
  async toggle(productId: string): Promise<boolean> {
    try {
      const result = await api.products.toggleWishlist(productId);
      
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('wishlist:change', {
        detail: { productId, added: result.isSaved }
      }));
      
      return result.isSaved;
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      throw error;
    }
  },

  // Get wishlist count
  async getCount(): Promise<number> {
    try {
      const items = await this.getAll();
      return items.length;
    } catch (error) {
      console.error('Failed to get wishlist count:', error);
      return 0;
    }
  },

  // Clear all wishlist items (would need backend support)
  async clearAll(): Promise<void> {
    console.warn('clearAll() not implemented - requires individual removal');
  }
};

// Product views tracking (now using backend API)
export const productViewsStore = {
  // Track a product view (send to backend)
  async trackView(productId: string): Promise<number> {
    try {
      const result = await api.products.view(productId);
      
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('product:view', {
        detail: { productId, views: result.views }
      }));
      
      return result.views;
    } catch (error) {
      console.error('Failed to track product view:', error);
      return 0;
    }
  },

  // Get view count (from product data)
  async getViewCount(productId: string): Promise<number> {
    try {
      const product = await api.products.getById(productId);
      return product.views || 0;
    } catch (error) {
      console.error('Failed to get view count:', error);
      return 0;
    }
  },

  // Clear views (not applicable for backend storage)
  clearAll(): void {
    console.warn('clearAll() not applicable for backend storage');
  }
};
