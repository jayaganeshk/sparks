/**
 * Persons service for interacting with the persons API endpoints
 */
import apiService from './api';

export const personsService = {
  /**
   * Get a list of all unique people detected across photos
   * @returns {Promise} - Response promise with persons
   */
  getAllPersons: () => {
    return apiService.get('/persons');
  },
  
  /**
   * Get a specific person by ID
   * @param {string} id - Person ID
   * @returns {Promise} - Response promise with person details
   */
  getPersonById: (id) => {
    return apiService.get(`/persons/${id}`);
  },
  
  /**
   * Get photos that contain a specific person
   * @param {string} id - Person ID
   * @param {string} lastEvaluatedKey - Optional pagination token
   * @param {number} limit - Optional limit of items to return
   * @returns {Promise} - Response promise with photos and pagination token
   */
  getPersonPhotos: (id, lastEvaluatedKey = null, limit = 100) => {
    const queryParams = new URLSearchParams();
    if (lastEvaluatedKey) {
      queryParams.append('lastEvaluatedKey', lastEvaluatedKey);
    }
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    
    const query = queryParams.toString();
    const endpoint = query ? `/persons/${id}/photos?${query}` : `/persons/${id}/photos`;
    
    return apiService.get(endpoint);
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
