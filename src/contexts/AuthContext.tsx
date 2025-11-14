import { createContext, useEffect, useState, type ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { api, type User } from '../api/adminApi';
import { secureLocalStorage } from '../utils/secureStorage';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  login: (phone: string, password: string) => Promise<void>;
  signup: (name: string, phone: string, password: string, verified?: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_USER_KEY = 'authUser';

type StoredAuth = {
  token: string | null;
  user: User | null;
};

// 🔒 SECURE: Use secureStorage instead of direct localStorage
const loadStoredAuth = (): StoredAuth => {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }

  try {
    // Try secure storage first
    let token = secureLocalStorage.getItem(AUTH_TOKEN_KEY);
    let rawUser = secureLocalStorage.getItem(AUTH_USER_KEY);
    
    // Fallback: migrate from old localStorage
    if (!token) {
      const oldToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (oldToken) {
        secureLocalStorage.setItem(AUTH_TOKEN_KEY, oldToken);
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        token = oldToken;
      }
    }
    
    if (!rawUser) {
      const oldUser = window.localStorage.getItem(AUTH_USER_KEY);
      if (oldUser) {
        secureLocalStorage.setItem(AUTH_USER_KEY, oldUser);
        window.localStorage.removeItem(AUTH_USER_KEY);
        rawUser = oldUser;
      }
    }
    
    if (!token || !rawUser) {
      return { token: null, user: null };
    }
    const parsed = JSON.parse(rawUser) as User;
    if (!parsed || typeof parsed !== 'object') {
      return { token: null, user: null };
    }
    return { token, user: parsed };
  } catch (error) {
    console.warn('Failed to load stored auth:', error);
    return { token: null, user: null };
  }
};

// 🔒 SECURE: Use secureStorage for persistence
const persistAuth = (token: string | null, user: User | null) => {
  if (typeof window === 'undefined') return;

  try {
    if (token && user) {
      secureLocalStorage.setItem(AUTH_TOKEN_KEY, token);
      secureLocalStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      
      // Also remove from old localStorage if exists
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(AUTH_USER_KEY);
    } else {
      secureLocalStorage.removeItem(AUTH_TOKEN_KEY);
      secureLocalStorage.removeItem(AUTH_USER_KEY);
      
      // Also remove from old localStorage
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist auth:', error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if JWT token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    } catch {
      return true; // Invalid token format
    }
  };

  // Load stored auth on mount
  useEffect(() => {
    const stored = loadStoredAuth();
    if (stored.token && stored.user) {
      // Check if token is expired
      if (isTokenExpired(stored.token)) {
        console.log('[Auth] Token expired, clearing auth');
        persistAuth(null, null);
        setToken(null);
        setUser(null);
      } else {
        setToken(stored.token);
        setUser(stored.user);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (phone: string, password: string) => {
    setIsLoading(true);
    try {
      // Login through backend API
      const response = await api.auth.login({ phone, password });
      
      setToken(response.token);
      setUser(response.user);
      persistAuth(response.token, response.user);
    } catch (error: unknown) {
      console.error('Login failed:', error);
      
      // Parse error message from backend
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('User not found') || errorMessage.includes('404')) {
        throw new Error('Энэ утасны дугаартай хэрэглэгч бүртгэлгүй байна. Эхлээд бүртгүүлнэ үү.');
      } else if (errorMessage.includes('Invalid password') || errorMessage.includes('401')) {
        throw new Error('Нууц үг буруу байна');
      } else {
        throw new Error('Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, phone: string, password: string, verified: boolean = true) => {
    setIsLoading(true);
    try {
      // Register with backend
      await api.auth.register({ phone, password, name, verified });
      
      // Registration successful - now sign in
      await login(phone, password);
      
      // Trigger profile completion modal for new users (required)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('profile:complete', {
          detail: { required: true }
        }));
      }, 500);
    } catch (error: unknown) {
      console.error('Signup failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for "already exists" or "registration_failed" errors (likely means phone already registered)
      if (errorMessage.includes('already exists') || 
          errorMessage.includes('User with this phone number already exists') ||
          errorMessage.includes('registration_failed')) {
        setIsLoading(false); // Stop loading before throwing
        throw new Error('Энэ утасны дугаар аль хэдийн бүртгэгдсэн байна. Нэвтрэх хэсэгт очно уу.');
      } else if (errorMessage.includes('validation_failed')) {
        setIsLoading(false); // Stop loading before throwing
        // Extract the specific validation error from the message
        throw new Error(errorMessage);
      } else if (errorMessage.includes('required')) {
        setIsLoading(false); // Stop loading before throwing
        throw new Error('Бүх талбарыг бөглөнө үү');
      } else {
        setIsLoading(false); // Stop loading before throwing
        throw new Error('Бүртгэл үүсгэхэд алдаа гарлаа');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        persistAuth(token, updatedUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      setToken(null);
      setUser(null);
      setFirebaseUser(null);
      persistAuth(null, null);
      
      // Redirect to home page
      window.location.hash = '';
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for token expiration event from API
  useEffect(() => {
    const handleTokenExpired = () => {
      console.log('[Auth] Token expired event received, clearing auth state');
      // Only clear the state, don't call full logout (which redirects)
      setToken(null);
      setUser(null);
      setFirebaseUser(null);
      // Auth is already cleared in localStorage by the API layer
      // Login modal will be shown by Layout component listening to 'auth:required'
    };

    window.addEventListener('auth:token-expired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('auth:token-expired', handleTokenExpired);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser, 
      token, 
      login, 
      signup, 
      logout, 
      refreshUser, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}