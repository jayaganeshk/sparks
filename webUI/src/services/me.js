/**
 * Me service for interacting with the current user's API endpoints
 */
import apiService from './api';

export const meService = {
  /**
   * Get the current user's profile
   * @returns {Promise} - Response promise with user profile
   */
  getProfile: () => {
    return apiService.get('/me/profile');
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
  getUploadLimit: () => {
    return apiService.get('/me/limit');
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
