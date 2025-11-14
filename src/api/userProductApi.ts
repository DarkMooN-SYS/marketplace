// User Product Store - API based (removed localStorage dependency)
// This file is deprecated - use ProductContext instead

import type { Product } from '../types/product';

/**
 * @deprecated Use ProductContext instead of userProductStore
 * This store has been replaced with API-based ProductContext
 */
export const userProductStore = {
  load(): Product[] {
    console.warn('userProductStore.load() is deprecated. Use ProductContext instead.');
    return [];
  },
  
  save(): void {
    console.warn('userProductStore.save() is deprecated. Use ProductContext instead.');
  },
  
  add(product: Omit<Product, 'id'>): Product {
    console.warn('userProductStore.add() is deprecated. Use ProductContext instead.');
    return { ...product, id: 'deprecated' };
  },
  
  update(): Product | null {
    console.warn('userProductStore.update() is deprecated. Use ProductContext instead.');
    return null;
  },
  
  remove(): boolean {
    console.warn('userProductStore.remove() is deprecated. Use ProductContext instead.');
    return false;
  }
};