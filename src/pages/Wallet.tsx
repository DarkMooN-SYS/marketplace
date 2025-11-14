import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Wallet, { WalletTransaction } from '../components/Wallet';
import Withdraw from '../components/Withdraw';
import { secureLocalStorage } from '../utils/secureStorage';

const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);

  // Fetch wallet data from backend with caching
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        // Check secure storage first
        let token = secureLocalStorage.getItem('authToken');
        
        // Fallback to old localStorage
        if (!token) {
          token = localStorage.getItem('authToken');
          if (token) {
            secureLocalStorage.setItem('authToken', token);
            localStorage.removeItem('authToken');
          }
        }
        
        if (!token) {
          // No auth token - using cached data silently
          setLoading(false);
          return;
        }
        
        // Validate token expiration before making API call
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expirationTime = payload.exp * 1000;
          if (Date.now() >= expirationTime) {
            // Token expired - clear both storages
            secureLocalStorage.removeItem('authToken');
            secureLocalStorage.removeItem('authUser');
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            window.dispatchEvent(new CustomEvent('auth:token-expired'));
            window.dispatchEvent(new CustomEvent('auth:required'));
            setLoading(false);
            return;
          }
        } catch {
          // Invalid token format - clear both storages
          secureLocalStorage.removeItem('authToken');
          secureLocalStorage.removeItem('authUser');
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          window.dispatchEvent(new CustomEvent('auth:required'));
          setLoading(false);
          return;
        }
        
        // Load cached data first for instant display
        const cachedBalance = localStorage.getItem('cachedWalletBalance');
        const cachedTransactions = localStorage.getItem('cachedWalletTransactions');
        
        if (cachedBalance) {
          setBalance(parseFloat(cachedBalance));
        }
        if (cachedTransactions) {
          try {
            setTransactions(JSON.parse(cachedTransactions));
          } catch (e) {
            console.error('Failed to parse cached transactions:', e);
          }
        }
        
        // Fetch fresh data from backend
        const { api } = await import('../api/adminApi');
        const data = await api.wallet.getWalletData();
        setBalance(data.balance);
        setTransactions(data.transactions);
        
        // Update cache
        localStorage.setItem('cachedWalletBalance', data.balance.toString());
        localStorage.setItem('cachedWalletTransactions', JSON.stringify(data.transactions));
      } catch (error) {
        // Check if it's an authentication error (silent fail)
        const isAuthError = error && typeof error === 'object' && 'isAuthError' in error;
        if (isAuthError ||
            (error instanceof Error && 
             (error.message.includes('401') || 
              error.message.includes('Authentication required') ||
              error.message.includes('Unauthorized')))) {
          // Silent fail - using cached data
        } else {
          console.error('Failed to fetch wallet data:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    setShowWithdraw(hash === 'withdraw');
    const onHash = () => {
      const h = window.location.hash.replace('#', '');
      setShowWithdraw(h === 'withdraw');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const handleTopUp = useCallback(() => {
    window.location.hash = 'topup';
  }, []);

  const handleWithdraw = useCallback(() => {
    window.location.hash = 'withdraw';
  }, []);

  const handleBack = useCallback(() => {
    window.location.hash = 'home';
  }, []);

  if (!user) {
    window.location.hash = '';
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-sm text-[var(--color-text-main)]/70 dark:text-white/70">Уншиж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--color-border-soft)] bg-white/70 px-6 py-5 shadow-sm dark:border-white/10 dark:bg-slate-900/60 sm:px-8">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-[var(--color-text-main)] dark:text-white sm:text-2xl">Хэтэвч</h1>
          <p className="text-sm text-[var(--color-text-main)]/70 dark:text-white/70">
            Үлдэгдэл, орлого зарлагын урсгал болон сүүлийн гүйлгээнүүдийг бодит цагт хянах удирдах самбар.
          </p>
        </div>
      </section>

      <Wallet balance={balance} transactions={transactions} onTopUp={handleTopUp} onWithdraw={handleWithdraw} onBack={handleBack} />
      {showWithdraw && (
        <Withdraw
          balance={balance}
          onClose={() => { window.location.hash = 'wallet'; }}
          onSubmit={async ({ amount, bank, account }) => {
            try {
              const { api } = await import('../api/adminApi');
              const result = await api.wallet.withdraw({
                amount,
                bankAccount: `${bank} - ${account}`
              });
              
              // Update local balance and refresh data
              setBalance(result.newBalance);
              
              // Refetch wallet data to get updated transactions
              const data = await api.wallet.getWalletData();
              setBalance(data.balance);
              setTransactions(data.transactions);
              
              // Update cache
              localStorage.setItem('cachedWalletBalance', data.balance.toString());
              localStorage.setItem('cachedWalletTransactions', JSON.stringify(data.transactions));
              
              // Close withdraw modal
              window.location.hash = 'wallet';
            } catch (error) {
              console.error('Withdraw failed:', error);
              throw error;
            }
          }}
        />
      )}
    </div>
  );
};

export default WalletPage;
