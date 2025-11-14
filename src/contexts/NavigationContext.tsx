import React, { createContext, useContext, useState, ReactNode } from 'react';

const derivePageFromHash = (hash: string) => {
  const normalized = hash.trim();
  if (normalized.startsWith('product/')) {
    return 'marketplace';
  }
  if (normalized.startsWith('admin')) {
    return 'admin';
  }
  return normalized || 'home';
};

interface NavigationContextType {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isPageActive: (page: string) => boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash.slice(1);
    return derivePageFromHash(hash);
  });

  const isPageActive = (page: string) => {
    return currentPage === page;
  };

  // Listen for hash changes
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      setCurrentPage(derivePageFromHash(hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <NavigationContext.Provider value={{ currentPage, setCurrentPage, isPageActive }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}