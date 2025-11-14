import { secureLocalStorage } from '../utils/secureStorage';

// Backend API base URL
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5001/api';

export interface Bank {
  id: string;
  name: string;
  short: string;
  description: string;
  gradient: string;
  logo?: string;
  isActive: boolean;
  order: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface NewBank {
  name: string;
  short?: string;
  description?: string;
  gradient?: string;
  logo?: string;
  isActive?: boolean;
  order?: number;
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
      console.warn('[BankAPI] 401 Unauthorized - Token expired or invalid');
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

// API methods
export const bankApi = {
  // Get all active banks from database
  async getAll(): Promise<Bank[]> {
    console.log('[BankAPI] Fetching banks from:', `${BASE_URL}/banks`);
    return await apiRequest<Bank[]>(`${BASE_URL}/banks`);
  },

  // Get bank by ID from database
  async getById(id: string): Promise<Bank | null> {
    console.log('[BankAPI] Fetching bank:', id);
    try {
      return await apiRequest<Bank>(`${BASE_URL}/banks/${id}`);
    } catch (error) {
      console.error('[BankAPI] Failed to load bank:', error);
      throw error;
    }
  },

  // Admin: Create new bank
  async create(bank: NewBank): Promise<Bank> {
    return await apiRequest<Bank>(`${BASE_URL}/banks`, {
      method: 'POST',
      body: JSON.stringify(bank)
    });
  },

  // Admin: Update bank
  async update(id: string, updates: Partial<NewBank>): Promise<Bank> {
    return await apiRequest<Bank>(`${BASE_URL}/banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // Admin: Delete bank (soft delete)
  async delete(id: string): Promise<void> {
    await apiRequest<void>(`${BASE_URL}/banks/${id}`, {
      method: 'DELETE'
    });
  }
};
