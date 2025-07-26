/**
 * Photos service for interacting with the photos API endpoints
 */
import apiService from './api';

export const photosService = {
  /**
   * Get a paginated list of all photos
   * @param {string} lastEvaluatedKey - Optional pagination token
   * @param {number} limit - Optional limit of items to return
   * @returns {Promise} - Response promise with photos and pagination token
   */
  getAllPhotos: (lastEvaluatedKey = null, limit = 100) => {
    const queryParams = new URLSearchParams();
    if (lastEvaluatedKey) {
      queryParams.append('lastEvaluatedKey', lastEvaluatedKey);
    }
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    
    const query = queryParams.toString();
    const endpoint = query ? `/photos?${query}` : '/photos';
    
    return apiService.get(endpoint);
  },
  
  /**
   * Get a specific photo by ID
   * @param {string} id - Photo ID
   * @returns {Promise} - Response promise with photo details
   */
  getPhotoById: (id) => {
    return apiService.get(`/photos/${id}`);
  },
  
  /**
   * Get related photos for a specific photo
   * @param {string} id - Photo ID
   * @param {number} limit - Optional limit of items to return
   * @returns {Promise} - Response promise with related photos
   */
  getRelatedPhotos: (id, limit = 10) => {
    return apiService.get(`/photos/${id}/related?limit=${limit}`);
  }
};

export default photosService;
