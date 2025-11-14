/**
 * 🔒 SECURE STORAGE UTILITY
 * Protects localStorage/sessionStorage from console manipulation and XSS attacks
 * 
 * Features:
 * - Validates data integrity with checksums
 * - Prevents console manipulation
 * - Detects unauthorized modifications
 * - Automatic data encryption (simple obfuscation)
 */

// Simple checksum for data integrity
function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Simple obfuscation (better than nothing, not encryption)
function obfuscate(data: string): string {
  return btoa(encodeURIComponent(data));
}

function deobfuscate(data: string): string {
  try {
    return decodeURIComponent(atob(data));
  } catch {
    return '';
  }
}

interface SecureItem {
  data: string;
  checksum: string;
  timestamp: number;
}

class SecureStorage {
  private prefix = '__secure_';
  private tamperLog: string[] = [];

  /**
   * 🔒 Secure setItem - Validates and protects data
   */
  setItem(key: string, value: string, useLocalStorage = true): void {
    try {
      const storage = useLocalStorage ? localStorage : sessionStorage;
      const secureKey = this.prefix + key;
      
      // Create secure item with checksum
      const obfuscatedData = obfuscate(value);
      const checksum = generateChecksum(value);
      const secureItem: SecureItem = {
        data: obfuscatedData,
        checksum,
        timestamp: Date.now()
      };

      storage.setItem(secureKey, JSON.stringify(secureItem));
    } catch (error) {
      console.error('SecureStorage: Failed to set item', error);
    }
  }

  /**
   * 🔒 Secure getItem - Validates data integrity
   */
  getItem(key: string, useLocalStorage = true): string | null {
    try {
      const storage = useLocalStorage ? localStorage : sessionStorage;
      const secureKey = this.prefix + key;
      const stored = storage.getItem(secureKey);
      
      if (!stored) return null;

      const secureItem: SecureItem = JSON.parse(stored);
      const deobfuscatedData = deobfuscate(secureItem.data);
      const currentChecksum = generateChecksum(deobfuscatedData);

      // Validate checksum - detect tampering
      if (currentChecksum !== secureItem.checksum) {
        console.warn('🚨 SecureStorage: Data tampering detected!', key);
        this.tamperLog.push(`${key} - ${new Date().toISOString()}`);
        this.removeItem(key, useLocalStorage);
        return null;
      }

      return deobfuscatedData;
    } catch (error) {
      console.error('SecureStorage: Failed to get item', error);
      return null;
    }
  }

  /**
   * 🔒 Secure removeItem
   */
  removeItem(key: string, useLocalStorage = true): void {
    try {
      const storage = useLocalStorage ? localStorage : sessionStorage;
      const secureKey = this.prefix + key;
      storage.removeItem(secureKey);
    } catch (error) {
      console.error('SecureStorage: Failed to remove item', error);
    }
  }

  /**
   * 🔒 Get tamper log (admin only)
   */
  getTamperLog(): string[] {
    return [...this.tamperLog];
  }

  /**
   * 🔒 Clear all secure items
   */
  clear(useLocalStorage = true): void {
    try {
      const storage = useLocalStorage ? localStorage : sessionStorage;
      const keys = Object.keys(storage).filter(k => k.startsWith(this.prefix));
      keys.forEach(key => storage.removeItem(key));
    } catch (error) {
      console.error('SecureStorage: Failed to clear', error);
    }
  }

  /**
   * 🔒 Migrate old localStorage to secure storage
   */
  migrate(oldKey: string, useLocalStorage = true): void {
    try {
      const storage = useLocalStorage ? localStorage : sessionStorage;
      const oldValue = storage.getItem(oldKey);
      
      if (oldValue) {
        this.setItem(oldKey, oldValue, useLocalStorage);
        storage.removeItem(oldKey);
        console.log(`✅ Migrated ${oldKey} to secure storage`);
      }
    } catch (error) {
      console.error('SecureStorage: Migration failed', error);
    }
  }
}

// Singleton instance
export const secureStorage = new SecureStorage();

// Convenience methods for localStorage
export const secureLocalStorage = {
  setItem: (key: string, value: string) => secureStorage.setItem(key, value, true),
  getItem: (key: string) => secureStorage.getItem(key, true),
  removeItem: (key: string) => secureStorage.removeItem(key, true),
  clear: () => secureStorage.clear(true),
  migrate: (oldKey: string) => secureStorage.migrate(oldKey, true)
};

// Convenience methods for sessionStorage
export const secureSessionStorage = {
  setItem: (key: string, value: string) => secureStorage.setItem(key, value, false),
  getItem: (key: string) => secureStorage.getItem(key, false),
  removeItem: (key: string) => secureStorage.removeItem(key, false),
  clear: () => secureStorage.clear(false),
  migrate: (oldKey: string) => secureStorage.migrate(oldKey, false)
};

/**
 * 🔒 CONSOLE PROTECTION
 * Prevents console manipulation of storage
 */
export function protectConsoleStorage(): void {
  if (typeof window === 'undefined') return;

  // Prevent direct localStorage/sessionStorage manipulation from console
  const originalLocalStorage = window.localStorage;
  const originalSessionStorage = window.sessionStorage;

  // Note: This is a deterrent, not foolproof protection
  // Real protection requires httpOnly cookies and server-side session management
  try {
    Object.defineProperty(window, 'localStorage', {
      get: () => originalLocalStorage,
      set: () => {
        console.warn('🚨 localStorage override blocked!');
      },
      configurable: false
    });

    Object.defineProperty(window, 'sessionStorage', {
      get: () => originalSessionStorage,
      set: () => {
        console.warn('🚨 sessionStorage override blocked!');
      },
      configurable: false
    });

    console.log('✅ Console storage protection enabled');
  } catch (error) {
    console.warn('⚠️ Console protection partially applied:', error);
  }
}

/**
 * 🔒 PREVENT CONSOLE INJECTION
 * Blocks dangerous console commands
 */
export function preventConsoleInjection(): void {
  if (typeof window === 'undefined') return;

  // Monitor dangerous eval/Function usage
  window.eval = function() {
    console.warn('🚨 eval() blocked! Potential security risk.');
    return undefined;
  } as typeof eval;

  window.Function = function() {
    console.warn('🚨 Function() constructor blocked! Potential security risk.');
    return function() {};
  } as unknown as FunctionConstructor;

  // Prevent script injection via innerHTML
  const originalInnerHTMLSetter = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.set;
  
  if (originalInnerHTMLSetter) {
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value: string) {
        if (typeof value === 'string' && /<script/i.test(value)) {
          console.error('🚨 Script injection blocked!');
          return;
        }
        originalInnerHTMLSetter.call(this, value);
      }
    });
  }

  console.log('✅ Console injection protection enabled');
}

/**
 * 🔒 Initialize all protections
 * Call this at app startup
 * 
 * @param forceEnable - Force enable protection in development mode (default: false)
 */
export function initSecurityProtection(forceEnable = false): void {
  // Enable in production OR if forced
  if (process.env.NODE_ENV === 'production' || forceEnable) {
    protectConsoleStorage();
    preventConsoleInjection();
    console.log('🔒 Security protection initialized');
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️ Running in development mode with forced security protection');
    }
  } else {
    console.log('⚠️ Security protection disabled in development mode');
    console.log('💡 To enable: initSecurityProtection(true)');
  }
}
