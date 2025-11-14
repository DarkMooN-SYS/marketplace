// Simple in-memory cache with TTL (Time To Live)
class Cache {
  constructor() {
    this.cache = new Map();
  }

  // Set value with TTL in milliseconds
  set(key, value, ttl = 60000) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  // Get value if not expired
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  // Clear specific key
  delete(key) {
    this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Clear cache by prefix (e.g., 'ads:', 'products:')
  clearByPrefix(prefix) {
    const keys = Array.from(this.cache.keys());
    const clearedKeys = [];
    
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        clearedKeys.push(key);
      }
    }
    
    return clearedKeys;
  }

  // Get cache stats
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
const cache = new Cache();

export default cache;
