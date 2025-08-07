/**
 * Persons service for interacting with the persons API endpoints
 */
import apiService from './api';
import apiCacheService from './api-cache';

export const personsService = {
  /**
   * Get a list of all unique people detected across photos
   * @returns {Promise} - Response promise with persons
   */
  getAllPersons: (forceRefresh = false) => {
    return apiCacheService.get('/persons', {}, forceRefresh);
  },
  
  /**
   * Get a specific person by ID
   * @param {string} id - Person ID
   * @returns {Promise} - Response promise with person details
   */
  getPersonById: (id, forceRefresh = false) => {
    return apiCacheService.get(`/persons/${id}`, {}, forceRefresh);
  },
  
  /**
   * Get photos that contain a specific person
   * @param {string} id - Person ID
   * @param {string} lastEvaluatedKey - Optional pagination token
   * @param {number} limit - Optional limit of items to return
   * @returns {Promise} - Response promise with photos and pagination token
   */
  getPersonPhotos: (id, lastEvaluatedKey = null, limit = 100, forceRefresh = false) => {
    const queryParams = new URLSearchParams();
    if (lastEvaluatedKey) {
      queryParams.append('lastEvaluatedKey', lastEvaluatedKey);
    }
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    
    const query = queryParams.toString();
    const endpoint = query ? `/persons/${id}/photos?${query}` : `/persons/${id}/photos`;
    
    return apiCacheService.get(endpoint, {}, forceRefresh);
  },
  
  /**
   * Update a person's name
   * @param {string} id - Person ID
   * @param {string} name - New name for the person
   * @returns {Promise} - Response promise with updated person details
   */
  updatePersonName: (id, name) => {
    return apiService.put(`/persons/${id}`, { name });
  }
};

export default personsService;
