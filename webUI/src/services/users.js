/**
 * Users service for interacting with the users API endpoints
 */
import apiService from './api';
import apiCacheService from './api-cache';

export const usersService = {
  /**
   * Get a list of all users who have uploaded photos
   * @returns {Promise} - Response promise with users
   */
  getAllUsers: (forceRefresh = false) => {
    return apiCacheService.get('/users', {}, forceRefresh);
  },
  
  /**
   * Get a specific user by email
   * @param {string} email - User email
   * @returns {Promise} - Response promise with user details
   */
  getUserByEmail: (email, forceRefresh = false) => {
    return apiCacheService.get(`/users/${email}`, {}, forceRefresh);
  },
  
  /**
   * Get photos uploaded by a specific user
   * @param {string} email - User email
   * @param {string} lastEvaluatedKey - Optional pagination token
   * @param {number} limit - Optional limit of items to return
   * @returns {Promise} - Response promise with photos and pagination token
   */
  getUserPhotos: (email, lastEvaluatedKey = null, limit = 100, forceRefresh = false) => {
    const queryParams = new URLSearchParams();
    if (lastEvaluatedKey) {
      queryParams.append('lastEvaluatedKey', lastEvaluatedKey);
    }
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    
    const query = queryParams.toString();
    const endpoint = query ? `/users/${email}/photos?${query}` : `/users/${email}/photos`;
    
    return apiCacheService.get(endpoint, {}, forceRefresh);
  }
};

export default usersService;
