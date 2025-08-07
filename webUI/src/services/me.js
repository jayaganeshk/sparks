/**
 * Me service for interacting with the current user's API endpoints
 */
import apiService from './api';
import apiCacheService from './api-cache';

export const meService = {
  /**
   * Get the current user's profile
   * @returns {Promise} - Response promise with user profile
   */
  getProfile: (forceRefresh = false) => {
    return apiCacheService.get('/me/profile', {}, forceRefresh);
  },
  
  /**
   * Get photos uploaded by the current user
   * @param {string|null} lastEvaluatedKey - Last evaluated key for pagination
   * @param {boolean} forceRefresh - Force refresh from API instead of using cache
   * @returns {Promise} - Response promise with photos uploaded by the user
   */
  getMyPhotos: (lastEvaluatedKey = null, forceRefresh = false) => {
    const endpoint = lastEvaluatedKey 
      ? `/me/photos?lastEvaluatedKey=${lastEvaluatedKey}` 
      : '/me/photos';
    return apiCacheService.get(endpoint, {}, forceRefresh);
  },
  
  /**
   * Get photos where the current user appears (tagged)
   * @param {string|null} lastEvaluatedKey - Last evaluated key for pagination
   * @param {boolean} forceRefresh - Force refresh from API instead of using cache
   * @returns {Promise} - Response promise with photos containing the user
   */
  getPhotosWithMe: (lastEvaluatedKey = null, forceRefresh = false) => {
    const endpoint = lastEvaluatedKey 
      ? `/me/photos-with-me?lastEvaluatedKey=${lastEvaluatedKey}` 
      : '/me/photos-with-me';
    return apiCacheService.get(endpoint, {}, forceRefresh);
  },
  
  /**
   * Update the current user's profile
   * @param {Object} profileData - Profile data to update
   * @param {string} profileData.displayName - Display name
   * @returns {Promise} - Response promise with updated profile
   */
  updateProfile: (profileData) => {
    return apiService.put('/me/profile', profileData);
  },
  
  /**
   * Get the current user's upload limit
   * @returns {Promise} - Response promise with upload limit
   */
  getUploadLimit: (forceRefresh = false) => {
    return apiCacheService.get('/me/limit', {}, forceRefresh);
  },
  
  /**
   * Update the current user's upload limit (admin only)
   * @param {number} limit - New upload limit
   * @returns {Promise} - Response promise with updated limit
   */
  updateUploadLimit: (limit) => {
    return apiService.put('/me/limit', { limit });
  }
};

export default meService;
