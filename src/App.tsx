
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Surveys from './pages/Surveys';
import Marketplace from './pages/Marketplace';
import WebLinks from './pages/WebLinks';
import News from './pages/News';
import SpinWheel from './pages/SpinWheel';
import WalletPage from './pages/Wallet';
import TopUpPage from './pages/TopUp';
import BankSelectPage from './pages/BankSelect';
// import ProfileEditPopup from './components/ProfileEditPopup';
import BankSelect from './components/BankSelect';
import Wallet, { WalletTransaction } from './components/Wallet';
import { api } from './api/adminApi';
import { paymentApi, type PaymentInvoice } from './api/paymentApi';
import { profileApi } from './api/profileApi';
import Withdraw from './components/Withdraw';
import TopUp from './components/TopUp';
import PaymentQR from './components/PaymentQR';
import ChatbotPanel from './components/ChatbotPanel';
import ProfileCompletion, { type ProfileData } from './components/ProfileCompletion';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { ProductProvider } from './contexts/ProductContext';
import { secureLocalStorage } from './utils/secureStorage';
import SubmitProductPage from './pages/SubmitProduct';
import SubmitSurveyPage from './pages/SubmitSurvey';
import SubmitWebLinkPage from './pages/SubmitWebLink';
import SubmitAdvertisementPage from './pages/SubmitAdvertisement';
import ProductDetail from './pages/ProductDetail';
import EditProductPage from './pages/EditProduct';
import { AdminRouter } from './pages/Admin/AdminRouter';
import type { AdminSection } from './pages/Admin/AdminLayout';

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

type MainPage =
  | 'home'
  | 'wallet'
  | 'topup'
  | 'bank-select'
  | 'surveys'
  | 'marketplace'
  | 'links'
  | 'news'
  | 'spin'
  | 'profile'
  | 'submit-product'
  | 'submit-survey'
  | 'submit-link'
  | 'submit-ad';

type Route =
  | { page: 'product'; productId: string | null }
  | { page: 'edit-product'; productId: string | null }
  | { page: 'admin'; adminSection: AdminSection }
  | { page: MainPage };

const getHash = () => (typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '');

const parseRoute = (hash: string): Route => {
  const normalized = hash.trim();
  if (normalized.startsWith('product/')) {
    const parts = normalized.split('/');
    // support product/{id} and product/{id}/edit
    if (parts.length >= 3 && parts[2] === 'edit') {
      return { page: 'edit-product', productId: parts[1] || null };
    }
    const [, productId] = parts;
    return { page: 'product', productId: productId ?? null };
  }
  if (normalized.startsWith('admin')) {
    const [, maybeSection] = normalized.split('/');
    const validSections: AdminSection[] = ['users', 'products', 'reviews', 'news', 'surveys', 'links', 'ads', 'spinrewards'];
    const section = (validSections.includes(maybeSection as AdminSection) ? maybeSection : 'users') as AdminSection;
    return { page: 'admin', adminSection: section };
  }
  if (!normalized) {
    return { page: 'home' };
  }
  const mainPages: MainPage[] = [
    'home',
    'wallet',
    'topup',
    'bank-select',
    'surveys',
    'marketplace',
    'links',
    'news',
    'spin',
    'profile',
    'submit-product',
    'submit-survey',
    'submit-link',
    'submit-ad',
  ];
  if (normalized === 'withdraw') {
    return { page: 'wallet' };
  }
  if (mainPages.includes(normalized as MainPage)) {
    return { page: normalized as MainPage };
  }
  return { page: 'home' };
};

function App() {
  const [popupStep, setPopupStep] = useState<null | 'wallet' | 'topup' | 'bank' | 'paymentLoading' | 'paymentQR' | 'paymentResult' | 'withdraw'>(null);
  const [popupWalletBalance, setPopupWalletBalance] = useState(() => {
    // Load cached balance on init
    const cached = localStorage.getItem('cachedWalletBalance');
    return cached ? parseFloat(cached) : 0;
  });
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => {
    // Load cached transactions on init
    const cached = localStorage.getItem('cachedWalletTransactions');
    try {
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [paymentResult, setPaymentResult] = useState<null | 'success' | 'fail'>(null);
  const [topupAmount, setTopupAmount] = useState(0);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [profileCompletionRequired, setProfileCompletionRequired] = useState(false);
  const [profileCompletionData, setProfileCompletionData] = useState<Partial<ProfileData>>({});
  const [route, setRoute] = useState<Route>(() => parseRoute(getHash()));
  const [currentPayment, setCurrentPayment] = useState<PaymentInvoice | null>(null);

  // Listen for profile completion request
  useEffect(() => {
    const handleProfileComplete = async (event: Event) => {
      const customEvent = event as CustomEvent<{ required?: boolean }>;
      const required = customEvent.detail?.required ?? false;
      
      try {
        // Fetch current profile data
        const profile = await profileApi.getProfile();
        setProfileCompletionData({
          name: profile.name,
          phone: profile.phone,
          email: profile.email,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          city: profile.city,
          district: profile.district,
          address: profile.address,
          occupation: profile.occupation,
          company: profile.company,
          education: profile.education,
          monthlyIncome: profile.monthlyIncome,
          interests: profile.interests,
          maritalStatus: profile.maritalStatus,
          hasChildren: profile.hasChildren,
          childrenCount: profile.childrenCount,
          acceptMarketing: profile.acceptMarketing,
          preferredContactMethod: profile.preferredContactMethod
        });
        setProfileCompletionRequired(required);
        setShowProfileCompletion(true);
      } catch (error) {
        console.error('Failed to load profile data:', error);
        setProfileCompletionRequired(required);
        setShowProfileCompletion(true);
      }
    };

    window.addEventListener('profile:complete', handleProfileComplete);
    return () => window.removeEventListener('profile:complete', handleProfileComplete);
  }, []);

  // Fetch wallet data from backend with caching
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
        // No auth token available
        return;
      }
      
      // Validate token expiration before making API call
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        if (Date.now() >= expirationTime) {
          // Token expired, clear both storages
          secureLocalStorage.removeItem('authToken');
          secureLocalStorage.removeItem('authUser');
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          window.dispatchEvent(new CustomEvent('auth:token-expired'));
          window.dispatchEvent(new CustomEvent('auth:required'));
          // Throw auth error so handleWalletClick doesn't proceed
          const authError: Error & { isAuthError?: boolean } = new Error('Token expired');
          authError.isAuthError = true;
          throw authError;
        }
      } catch (parseError) {
        // Invalid token format
        if (parseError && typeof parseError === 'object' && 'isAuthError' in parseError) {
          throw parseError; // Re-throw auth error
        }
        // Clear both storages
        secureLocalStorage.removeItem('authToken');
        secureLocalStorage.removeItem('authUser');
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.dispatchEvent(new CustomEvent('auth:required'));
        const authError: Error & { isAuthError?: boolean } = new Error('Invalid token');
        authError.isAuthError = true;
        throw authError;
      }
      
      const data = await api.wallet.getWalletData();
      setPopupWalletBalance(data.balance);
      setWalletTransactions(data.transactions);
      
      // Cache wallet data in localStorage
      localStorage.setItem('cachedWalletBalance', data.balance.toString());
      localStorage.setItem('cachedWalletTransactions', JSON.stringify(data.transactions));
    } catch (error) {
      // Check if it's an authentication error (don't log these, they're handled by modal)
      const isAuthError = error && typeof error === 'object' && 'isAuthError' in error;
      if (isAuthError || 
          (error instanceof Error && 
           (error.message.includes('401') || 
            error.message.includes('Authentication required') ||
            error.message.includes('Unauthorized')))) {
        console.log('[App] Authentication required - login modal will be shown');
        // Re-throw to be caught by handleWalletClick
        throw error;
      }
      
      // For other errors, log and try to load from cache
      console.error('Failed to fetch wallet data:', error);
      
      // Try to load from cache if fetch fails
      const cachedBalance = localStorage.getItem('cachedWalletBalance');
      const cachedTransactions = localStorage.getItem('cachedWalletTransactions');
      
      if (cachedBalance) {
        setPopupWalletBalance(parseFloat(cachedBalance));
      }
      if (cachedTransactions) {
        try {
          setWalletTransactions(JSON.parse(cachedTransactions));
        } catch (e) {
          console.error('Failed to parse cached transactions:', e);
        }
      }
    }
  };

  // Wallet popup -> TopUp popup
  const handleWalletTopUp = () => {
    setPopupStep('topup');
  };

  // TopUp popup -> BankSelect popup
  const handleTopUpContinue = (amount: number) => {
    if (amount > 0) {
      setTopupAmount(amount);
      setPopupStep('bank');
    } else {
      setPopupStep(null);
    }
  };
  // Handler for opening wallet modal
  const handleWalletClick = async () => {
    // Check if user is logged in using secure storage
    let token = secureLocalStorage.getItem('authToken');
    
    // Fallback: check old localStorage
    if (!token) {
      token = localStorage.getItem('authToken');
      if (token) {
        // Migrate to secure storage
        secureLocalStorage.setItem('authToken', token);
        localStorage.removeItem('authToken');
      }
    }
    
    if (!token) {
      // User not logged in - open login modal
      window.dispatchEvent(new CustomEvent('auth:required'));
      return;
    }
    
    // Check if token is expired before making API call
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      if (Date.now() >= expirationTime) {
        // Token expired, clear both storages
        secureLocalStorage.removeItem('authToken');
        secureLocalStorage.removeItem('authUser');
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.dispatchEvent(new CustomEvent('auth:token-expired'));
        window.dispatchEvent(new CustomEvent('auth:required'));
        return;
      }
    } catch {
      // Invalid token format, clear both storages
      secureLocalStorage.removeItem('authToken');
      secureLocalStorage.removeItem('authUser');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.dispatchEvent(new CustomEvent('auth:required'));
      return;
    }
    
    if (!isMobile()) {
      try {
        await fetchWalletData();
        setPopupStep('wallet');
      } catch (error) {
        // Check if it's an authentication error (don't log, modal will handle)
        const isAuthError = error && typeof error === 'object' && 'isAuthError' in error;
        if (isAuthError ||
            (error instanceof Error && 
             (error.message.includes('401') || 
              error.message.includes('Authentication required')))) {
          console.log('[App] Authentication error - login modal will be shown');
          // Don't set popup step, login modal will handle it
          return;
        }
        // For other errors, log and still show the popup with cached data
        console.error('[App] Error fetching wallet data:', error);
        setPopupStep('wallet');
      }
    } else {
      window.location.hash = 'wallet';
    }
  };

  // Handler for BankSelect selection - create payment and show QR code
  const handleBankSelect = async (bank: string) => {
    // Check if user is logged in before proceeding
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
      // User needs to log in for payment
      setPopupStep(null); // Close all popups
      window.dispatchEvent(new CustomEvent('auth:required'));
      return;
    }
    
    setPopupStep('paymentLoading');
    
    try {
      // Map bank names to payment providers
      const providerMap: Record<string, string> = {
        'QPay': 'qpay',
        'SocialPay': 'socialpay',
        'Golomt Bank': 'golomt',
        'Голомт банк': 'golomt',
        'Хаан банк': 'khan',
        'Хас банк': 'xac',
        'TDB': 'tdb',
        'Төрийн банк': 'statebank',
        'Ариг банк': 'arig',
      };
      
      const provider = providerMap[bank] || 'golomt'; // Default to Golomt
      
      // Create payment invoice via backend
      const invoice = await paymentApi.createPayment(
        provider,
        topupAmount,
        `Хэтэвч цэнэглэлт: ${topupAmount}₮`
      );
      
      setCurrentPayment(invoice);
      
      // Show QR code
      setPopupStep('paymentQR');
      
      // Start polling payment status
      try {
        await paymentApi.pollPaymentStatus(
          invoice.invoiceId,
          provider,
          {
            interval: 3000, // Check every 3 seconds
            timeout: 300000, // 5 minute timeout
          }
        );
        
        // Payment successful - refresh wallet data
        await fetchWalletData();
        
        setPaymentResult('success');
        setPopupStep('paymentResult');
      } catch (pollError) {
        console.error('[App] Payment polling failed:', pollError);
        
        // Check if it's an auth error
        if (pollError instanceof Error && pollError.message.includes('нэвтэр')) {
          setPopupStep(null);
          return; // Auth modal will be shown by the API
        }
        
        // Still try to refresh wallet data in case payment went through
        await fetchWalletData();
        
        // Show fail result
        setPaymentResult('fail');
        setPopupStep('paymentResult');
      }
    } catch (error) {
      console.error('[App] Payment creation failed:', error);
      
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes('нэвтэр')) {
        setPopupStep(null);
        return; // Auth modal will be shown by the API
      }
      
      setPaymentResult('fail');
      setPopupStep('paymentResult');
    }
  };

  React.useEffect(() => {
    const onHashChange = () => {
      setRoute(parseRoute(getHash()));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderPage = () => {
    switch (route.page) {
      case 'wallet':
        return <WalletPage />;
      case 'topup':
        return <TopUpPage />;
      case 'bank-select':
        return <BankSelectPage />;
      case 'surveys':
        return <Surveys />;
      case 'marketplace':
        return <Marketplace />;
      case 'links':
        return <WebLinks />;
      case 'news':
        return <News />;
      case 'spin':
        return <SpinWheel />;
      case 'profile':
        return <Profile />;
      case 'submit-product':
        return <SubmitProductPage />;
      case 'product':
        return <ProductDetail productId={route.productId ?? ''} />;
      case 'edit-product':
        return <EditProductPage productId={route.productId ?? ''} />;
      case 'admin':
        return <AdminRouter section={route.adminSection} />;
      case 'submit-survey':
        return <SubmitSurveyPage />;
      case 'submit-link':
        return <SubmitWebLinkPage />;
      case 'submit-ad':
        return <SubmitAdvertisementPage />;
      default:
        return <Home />;
    }
  };

  // Check if current route is a submission page
  const isSubmissionPage = ['submit-survey', 'submit-link', 'submit-ad'].includes(
    route.page === 'product' || route.page === 'edit-product' || route.page === 'admin' 
      ? '' 
      : route.page
  );

  return (
    <ThemeProvider>
      <NavigationProvider>
        <ProductProvider>
          <AuthProvider>
            {!isSubmissionPage && <ChatbotPanel />}
            <Layout onWalletClick={handleWalletClick}>
              {renderPage()}
              {/* Unified popup/modal for desktop */}
              {!isMobile() && popupStep && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="relative w-full max-w-3xl px-4">
                  {popupStep === 'wallet' && (
                    <Wallet
                      balance={popupWalletBalance}
                      transactions={walletTransactions}
                      onTopUp={handleWalletTopUp}
                      onWithdraw={() => setPopupStep('withdraw')}
                      onBack={() => setPopupStep(null)}
                    />
                  )}
                  {popupStep === 'topup' && (
                    <TopUp onContinue={handleTopUpContinue} />
                  )}
                  {popupStep === 'withdraw' && (
                    <Withdraw
                      balance={popupWalletBalance}
                      onClose={() => setPopupStep('wallet')}
                      onSubmit={async ({ amount, bank, account }) => {
                        try {
                          const result = await api.wallet.withdraw({
                            amount,
                            bankAccount: `${bank} - ${account}`
                          });
                          
                          // Update local balance
                          setPopupWalletBalance(result.newBalance);
                          
                          // Refresh wallet data
                          await fetchWalletData();
                        } catch (error) {
                          console.error('Withdraw failed:', error);
                          throw error;
                        }
                      }}
                    />
                  )}
                  {popupStep === 'bank' && (
                    <BankSelect onSelect={handleBankSelect} />
                  )}
                  {popupStep === 'paymentLoading' && (
                    <div className="max-w-xs w-full p-6 rounded-2xl bg-white dark:bg-[#23283b]/90 shadow-2xl flex flex-col items-center border border-black dark:border-blue-900 relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-opacity-50 mb-4"></div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">Төлбөр үүсгэж байна...</div>
                      <div className="text-gray-500 dark:text-gray-300 text-sm mb-2">Түр хүлээнэ үү.</div>
                    </div>
                  )}
                  {popupStep === 'paymentQR' && currentPayment && (
                    <PaymentQR
                      payment={currentPayment}
                      onClose={() => {
                        setPopupStep(null);
                        setCurrentPayment(null);
                      }}
                    />
                  )}
                  {popupStep === 'paymentResult' && paymentResult && (
                    <div className="max-w-xs w-full p-6 rounded-2xl bg-white dark:bg-[#23283b]/90 shadow-2xl flex flex-col items-center border border-black dark:border-blue-900 relative">
                      <button className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-gray-700 dark:hover:text-white" onClick={() => { setPaymentResult(null); setPopupStep(null); }} aria-label="Close">×</button>
                      {paymentResult === 'success' ? (
                        <>
                          <div className="text-3xl mb-2">✅</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400 mb-2">Төлбөр амжилттай хийгдлээ</div>
                          <div className="text-gray-500 dark:text-gray-300 text-sm mb-2">Таны төлбөр амжилттай баталгаажлаа.</div>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl mb-2">❌</div>
                          <div className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Төлбөр хийгдсэнгүй</div>
                          <div className="text-gray-500 dark:text-gray-300 text-sm mb-2">Төлбөрийн явцад алдаа гарлаа. Дахин оролдоно уу.</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profile Completion Modal */}
            <ProfileCompletion
              isOpen={showProfileCompletion}
              onClose={() => setShowProfileCompletion(false)}
              required={profileCompletionRequired}
              initialData={profileCompletionData}
              onComplete={async (data) => {
                try {
                  await profileApi.completeProfile(data);
                  setShowProfileCompletion(false);
                  setProfileCompletionRequired(false);
                  // Refresh user profile
                  window.dispatchEvent(new CustomEvent('profile:updated'));
                } catch (error) {
                  console.error('Profile completion error:', error);
                }
              }}
            />
            </Layout>
          </AuthProvider>
        </ProductProvider>
      </NavigationProvider>
    </ThemeProvider>
  );
}

export default App;