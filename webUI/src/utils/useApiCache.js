/**
 * API Cache Composition Function
 * 
 * This composition function provides a consistent way to implement the
 * "load from cache then refresh" pattern throughout the application.
 * It shows cached data immediately while fetching fresh data in the background.
 */

import { ref, watch } from 'vue';

/**
 * Creates a cached API data loader with loading states
 * @param {Function} apiFetchFunction - API function that returns a Promise
 * @param {Array<any>} dependencies - Reactive dependencies that should trigger a reload
 * @param {Object} options - Additional options
 * @param {boolean} options.autoLoad - Whether to load data immediately
 * @param {boolean} options.forceRefresh - Whether to always force refresh from API
 * @returns {Object} Object containing data, loading states, and load functions
 */
export function useApiCache(apiFetchFunction, dependencies = [], options = {}) {
  const { autoLoad = true, forceRefresh = false } = options;
  
  // Reactive state
  const data = ref(null);
  const isLoading = ref(false);
  const isRefreshing = ref(false);
  const error = ref(null);
  const lastLoaded = ref(null);
  
  /**
   * Load data with caching
   * @param {boolean} force - Whether to force refresh from API
   */
  const loadData = async (force = forceRefresh) => {
    if (!apiFetchFunction) return;
    
    try {
      error.value = null;
      
      // If we don't have cached data yet or force refresh is true, 
      // show loading indicator
      if (!data.value || force) {
        isLoading.value = true;
      }
      
      // If we're refreshing data we already have, show refresh indicator
      if (data.value && force) {
        isRefreshing.value = true;
      }
      
      // Call API function (which will use cache if available)
      const result = await apiFetchFunction(force);
      data.value = result;
      lastLoaded.value = new Date();
      
      return result;
    } catch (err) {
      error.value = err;
      console.error('Error loading data:', err);
    } finally {
      isLoading.value = false;
      isRefreshing.value = false;
    }
  };
  
  /**
   * Force refresh the data
   */
  const refresh = () => loadData(true);
  
  // Watch dependencies for changes and reload data
  if (dependencies.length > 0) {
    watch(dependencies, () => {
      loadData();
    });
  }
  
  // Initial load if autoLoad is true
  if (autoLoad) {
    loadData();
  }
  
  return {
    data,
    isLoading,
    isRefreshing,
    error,
    lastLoaded,
    loadData,
    refresh
  };
}

export default useApiCache;
