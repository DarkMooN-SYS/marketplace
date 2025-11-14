

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { NotificationProvider } from './contexts/NotificationContext';

// 🔒 Initialize security protection
import { initSecurityProtection } from './utils/secureStorage';
initSecurityProtection(true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <NavigationProvider>
        <AuthProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </AuthProvider>
      </NavigationProvider>
    </ThemeProvider>
  </StrictMode>
);
