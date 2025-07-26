/**
 * Livestream service for interacting with the livestream API endpoint
 */
import apiService from './api';

export const livestreamService = {
  /**
   * Check for and retrieve the current live stream configuration
   * @returns {Promise} - Response promise with livestream data
   */
  getLivestreamInfo: () => {
    return apiService.get('/livestream');
  }
};

export default livestreamService;
