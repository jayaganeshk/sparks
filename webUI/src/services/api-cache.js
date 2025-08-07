/**
 * API Cache Service Wrapper
 * 
 * This service wraps the base API service with caching functionality.
 * It uses the api-cache Pinia store to cache API responses.
 * Includes automatic cache invalidation for mutation operations (POST, PUT, DELETE).
 */
import { apiService } from './api';
import { useApiCacheStore } from '@/store/api-cache';

/**
 * Generate a cache key for a given endpoint and options
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {string} - Cache key
 */
const generateCacheKey = (endpoint, options = {}) => {
  // For GET requests, include the query parameters in the cache key
  let key = endpoint;
  
  // If options has query parameters, add them to the cache key
  if (options.params) {
    const queryParams = new URLSearchParams(options.params).toString();
    key = `${key}?${queryParams}`;
  }
  
  return key;
};

/**
 * Helper function to determine which cache entries should be invalidated based on the endpoint
 * @param {string} endpoint - The endpoint that was mutated
 * @returns {string[]} - Array of patterns to match for cache invalidation
 */
const getRelatedCachePatterns = (endpoint) => {
  // Extract the base resource type from the endpoint
  const parts = endpoint.split('/');
  const resourceType = parts[1]; // e.g. '/photos/123' -> 'photos'
  
  // Define patterns based on the resource type
  const patterns = [`/${resourceType}`];
  
  // Add specific invalidation patterns based on known endpoint structures
  switch (resourceType) {
    case 'photos':
      patterns.push('/persons'); // Photo changes can affect person results
      patterns.push('/users'); // Photo changes can affect user results
      break;
      
    case 'persons':
      patterns.push('/photos'); // Person changes can affect photo results
      break;
      
    case 'users':
      patterns.push('/photos'); // User changes can affect photo results
      break;
  }
  
  return patterns;
};

/**
 * Invalidate related caches based on patterns
 * @param {string} endpoint - The endpoint that was mutated
 */
const invalidateRelatedCaches = (endpoint) => {
  const cacheStore = useApiCacheStore();
  const patterns = getRelatedCachePatterns(endpoint);
  const cachedEndpoints = cacheStore.cachedEndpoints;
  
  // For each cached endpoint, check if it matches any invalidation pattern
  cachedEndpoints.forEach(cachedEndpoint => {
    const shouldInvalidate = patterns.some(pattern => 
      cachedEndpoint.includes(pattern)
    );
    
    if (shouldInvalidate) {
      cacheStore.clearCache(cachedEndpoint);
    }
  });
};

export const apiCacheService = {
  /**
   * Makes a GET request to the API with caching
   * @param {string} endpoint - The API endpoint
   * @param {Object} options - The request options
   * @param {boolean} forceRefresh - Force refresh the cache
   * @returns {Promise<any>} - The API response
   * 
   * This method implements a stale-while-revalidate pattern:
   * - If valid cache exists, returns cached data
   * - If stale cache exists, returns stale data immediately while refreshing in background
   * - If no cache exists, waits for fresh data
   */
  async get(endpoint, options = {}, forceRefresh = false) {
    const fullEndpoint = generateCacheKey(endpoint, options);
    
    // Initialize the API cache store
    const cacheStore = useApiCacheStore();
    
    // Using executeWithCache which now implements stale-while-revalidate pattern
    return cacheStore.executeWithCache(
      fullEndpoint,
      async () => {
        return await apiService.get(endpoint, options);
      },
      forceRefresh
    );
  },

  /**
   * Make a POST request (not cached by default)
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise} - Response promise
   */
  post: async (endpoint, data = {}, options = {}) => {
    // Make the API call
    const response = await apiService.post(endpoint, data, options);
    
    // After successful mutation, invalidate related caches
    invalidateRelatedCaches(endpoint);
    
    return response;
  },

  /**
   * Make a PUT request (not cached by default)
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise} - Response promise
   */
  put: async (endpoint, data = {}, options = {}) => {
    // Make the API call
    const response = await apiService.put(endpoint, data, options);
    
    // After successful mutation, invalidate related caches
    invalidateRelatedCaches(endpoint);
    
    return response;
  },

  /**
   * Make a DELETE request (not cached by default)
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} - Response promise
   */
  delete: async (endpoint, options = {}) => {
    // Make the API call
    const response = await apiService.delete(endpoint, options);
    
    // After successful mutation, invalidate related caches
    invalidateRelatedCaches(endpoint);
    
    return response;
  },

  /**
   * Clear cache for a specific endpoint
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options (for generating cache key)
   */
  clearCache: (endpoint, options = {}) => {
    const cacheStore = useApiCacheStore();
    const cacheKey = generateCacheKey(endpoint, options);
    cacheStore.clearCache(cacheKey);
  },

  /**
   * Clear all cache
   */
  clearAllCache: () => {
    const cacheStore = useApiCacheStore();
    cacheStore.clearAllCache();
  }
};

export default apiCacheService;
