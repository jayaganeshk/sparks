/**
 * API Cache Store
 * 
 * This store is responsible for caching API responses and managing the cache lifecycle.
 * It allows showing cached data immediately while fetching fresh data in the background.
 */
import { defineStore } from 'pinia';

export const useApiCacheStore = defineStore('api-cache', {
  state: () => ({
    cache: {}, // Cache object to store API responses
    // Structure: { [endpoint]: { data: any, timestamp: number, loading: boolean } }
    cacheTTL: 1 * 30 * 1000, // Default cache TTL: 1 minutes (in milliseconds)
  }),

  actions: {
    /**
     * Set cache TTL (time to live)
     * @param {number} ttl - TTL in milliseconds
     */
    setCacheTTL(ttl) {
      this.cacheTTL = ttl;
    },

    /**
     * Check if cache entry exists and is still valid
     * @param {string} endpoint - API endpoint
     * @returns {Object} - Cache validity status
     */
    checkCacheStatus(endpoint) {
      if (!this.cache[endpoint]) {
        return { exists: false, isValid: false };
      }
      
      const cacheEntry = this.cache[endpoint];
      const now = Date.now();
      const isExpired = now - cacheEntry.timestamp > this.cacheTTL;
      
      return {
        exists: true,
        isValid: !isExpired,
        isStale: isExpired && cacheEntry.data !== null
      };
    },
    
    /**
     * Check if cache entry exists and is still valid
     * @param {string} endpoint - API endpoint
     * @returns {boolean} - Whether cache is valid
     */
    isCacheValid(endpoint) {
      const status = this.checkCacheStatus(endpoint);
      return status.isValid;
    },

    /**
     * Get cached data for an endpoint
     * @param {string} endpoint - API endpoint
     * @returns {any} - Cached data or null if no cache exists
     */
    getCachedData(endpoint) {
      return this.cache[endpoint]?.data || null;
    },

    /**
     * Check if an endpoint is currently loading
     * @param {string} endpoint - API endpoint
     * @returns {boolean} - Whether the endpoint is loading
     */
    isLoading(endpoint) {
      return this.cache[endpoint]?.loading || false;
    },

    /**
     * Set loading state for an endpoint
     * @param {string} endpoint - API endpoint
     * @param {boolean} loading - Loading state
     */
    setLoading(endpoint, loading) {
      if (!this.cache[endpoint]) {
        this.cache[endpoint] = { data: null, timestamp: 0, loading };
      } else {
        this.cache[endpoint].loading = loading;
      }
    },

    /**
     * Cache API response data
     * @param {string} endpoint - API endpoint
     * @param {any} data - Response data
     */
    cacheData(endpoint, data) {
      this.cache[endpoint] = {
        data,
        timestamp: new Date().getTime(),
        loading: false
      };
    },

    /**
     * Clear cache for a specific endpoint
     * @param {string} endpoint - API endpoint
     */
    clearCache(endpoint) {
      if (endpoint in this.cache) {
        delete this.cache[endpoint];
      }
    },

    /**
     * Clear all cache
     */
    clearAllCache() {
      this.cache = {};
    },

    /**
     * Execute a function with cache
     * First returns cached data (even if stale), then executes function and updates cache
     * Stale data is retained until new data is successfully fetched to avoid loading screens
     * @param {string} endpoint - API endpoint
     * @param {Function} fn - Function to execute that returns a Promise
     * @param {boolean} forceRefresh - Force refresh regardless of cache validity
     * @returns {Promise<any>} - Cached data (potentially stale) or fresh data
     */
    async executeWithCache(endpoint, fn, forceRefresh = false) {
      // Check cache status
      const cacheStatus = this.checkCacheStatus(endpoint);
      const needsRefresh = forceRefresh || !cacheStatus.isValid;
      
      // Get cached data (even if stale)
      const cachedData = this.getCachedData(endpoint);
      
      // If we need to refresh data (cache invalid or force refresh)
      if (needsRefresh) {
        // We have cached data (even if stale), use it immediately while fetching in background
        if (cachedData !== null) {
          // Mark as refreshing in background but not loading (to prevent loading indicators)
          this.setLoading(endpoint, true);
          
          // Start background refresh without waiting
          fn().then(freshData => {
            // Only update cache if we successfully got new data
            if (freshData !== undefined && freshData !== null) {
              this.cacheData(endpoint, freshData);
            }
          }).catch(error => {
            // On error, we keep the stale data and just log the error
            console.error(`Background refresh failed for ${endpoint}:`, error);
            // We don't clear the cache or throw an error to the user
            // This ensures stale data remains available even if refresh fails
          }).finally(() => {
            this.setLoading(endpoint, false);
          });
          
          // Return cached data immediately (never show loading screen if data exists)
          return cachedData;
        } 
        // No cached data at all, must wait for fresh data (first load only)
        else {
          this.setLoading(endpoint, true);
          try {
            // Execute function and update cache
            const freshData = await fn();
            if (freshData !== undefined && freshData !== null) {
              this.cacheData(endpoint, freshData);
            }
            return freshData;
          } catch (error) {
            console.error(`Failed to fetch data for ${endpoint}:`, error);
            throw error;
          } finally {
            this.setLoading(endpoint, false);
          }
        }
      }
      
      // Cache is still valid, return cached data
      return cachedData;
    }
  },

  getters: {
    /**
     * Get all cached endpoints
     * @returns {string[]} - List of cached endpoints
     */
    cachedEndpoints: (state) => Object.keys(state.cache),

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    cacheStats: (state) => {
      return {
        endpointCount: Object.keys(state.cache).length,
        cacheTTL: state.cacheTTL,
      };
    }
  }
});

export default useApiCacheStore;
