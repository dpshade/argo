const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const cacheModule = {
  set(key, value, prefix = "") {
    const cacheKey = `${prefix}_${key}`;
    const cacheData = {
      value,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  },

  get(key, prefix = "") {
    const cacheKey = `${prefix}_${key}`;
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
      const { value, timestamp } = JSON.parse(cachedItem);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return value;
      }
      // Remove expired item
      localStorage.removeItem(cacheKey);
    }
    return null;
  },

  invalidate(key, prefix = "") {
    const cacheKey = `${prefix}_${key}`;
    localStorage.removeItem(cacheKey);
  },

  clear(prefix = "") {
    if (prefix) {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
    } else {
      localStorage.clear();
    }
  },
};
