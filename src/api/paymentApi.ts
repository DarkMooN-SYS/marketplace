import { secureLocalStorage } from '../utils/secureStorage';

// Backend API base URL
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5001/api';

export interface PaymentInvoice {
  invoiceId: string;
  userId: string;
  provider: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'completed';
  qrImage?: string;
  qrText?: string;
  paymentUrl?: string;
  deeplink?: string;
  urls?: string[];
  createdAt: string;
  paidAt?: string;
}

export interface PaymentStatusResponse {
  invoiceId: string;
  status: string;
  paid: boolean;
  amount: number;
  paidAmount?: number;
  paidDate?: string;
  alreadyProcessed?: boolean;
}

export interface PaymentHistoryItem {
  invoiceId: string;
  provider: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
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
  
  if (!token) {
    console.error('[PaymentAPI] No auth token found');
    
    // Dispatch event to show login modal
    window.dispatchEvent(new CustomEvent('auth:required'));
    
    throw new Error('Та эхлээд нэвтэрнэ үү');
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    console.warn('[PaymentAPI] 401 Unauthorized - Token expired or invalid');
    // 🔒 SECURE: Clear both storages
    secureLocalStorage.removeItem('authToken');
    secureLocalStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.dispatchEvent(new CustomEvent('auth:token-expired'));
    
    // Also dispatch auth required event
    window.dispatchEvent(new CustomEvent('auth:required'));
    
    throw new Error('Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const paymentApi = {
  /**
   * Create a new payment invoice
   * @param provider Payment provider: 'qpay', 'socialpay', 'golomt', 'khan'
   * @param amount Amount in MNT (Mongolian Tugrik)
   * @param description Payment description
   */
  async createPayment(
    provider: string,
    amount: number,
    description?: string
  ): Promise<PaymentInvoice> {
    console.log('[PaymentAPI] Creating payment:', { provider, amount, description });
    
    return await apiRequest<PaymentInvoice>(`${BASE_URL}/payments/create`, {
      method: 'POST',
      body: JSON.stringify({
        provider,
        amount,
        description: description || `Хэтэвч цэнэглэлт: ${amount}₮`
      })
    });
  },

  /**
   * Check payment status and process if paid
   * @param invoiceId Invoice ID to check
   * @param provider Payment provider
   */
  async checkPaymentStatus(
    invoiceId: string,
    provider: string
  ): Promise<PaymentStatusResponse> {
    console.log('[PaymentAPI] Checking payment status:', { invoiceId, provider });
    
    return await apiRequest<PaymentStatusResponse>(
      `${BASE_URL}/payments/check/${invoiceId}?provider=${provider}`,
      {
        method: 'GET'
      }
    );
  },

  /**
   * Get payment history for current user
   * @param limit Number of records to fetch (default: 50)
   */
  async getPaymentHistory(limit?: number): Promise<PaymentHistoryItem[]> {
    console.log('[PaymentAPI] Fetching payment history');
    
    const url = limit 
      ? `${BASE_URL}/payments/history?limit=${limit}`
      : `${BASE_URL}/payments/history`;
    
    const response = await apiRequest<{ payments: PaymentHistoryItem[] }>(url, {
      method: 'GET'
    });
    
    return response.payments;
  },

  /**
   * Poll payment status until paid or timeout
   * @param invoiceId Invoice ID to poll
   * @param provider Payment provider
   * @param interval Polling interval in milliseconds (default: 3000)
   * @param timeout Timeout in milliseconds (default: 300000 = 5 minutes)
   * @param onStatusUpdate Callback for status updates
   */
  async pollPaymentStatus(
    invoiceId: string,
    provider: string,
    options?: {
      interval?: number;
      timeout?: number;
      onStatusUpdate?: (status: PaymentStatusResponse) => void;
    }
  ): Promise<PaymentStatusResponse> {
    const interval = options?.interval ?? 3000; // 3 seconds
    const timeout = options?.timeout ?? 300000; // 5 minutes
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // Check if timeout exceeded
          if (Date.now() - startTime > timeout) {
            reject(new Error('Төлбөрийн хугацаа дууссан. Төлбөрийн түүхээс шалгана уу.'));
            return;
          }

          const status = await this.checkPaymentStatus(invoiceId, provider);
          
          // Notify status update
          if (options?.onStatusUpdate) {
            options.onStatusUpdate(status);
          }

          // Check if payment completed
          if (status.paid || status.status === 'completed') {
            resolve(status);
            return;
          }

          // Check if payment failed or expired
          if (status.status === 'failed' || status.status === 'expired') {
            reject(new Error(`Төлбөр амжилтгүй: ${status.status}`));
            return;
          }

          // Continue polling
          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  }
};
