/**
 * Events service for interacting with the events API endpoint
 */
import apiService from './api';

export const eventsService = {
  /**
   * Log a web event
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Additional event data
   * @returns {Promise} - Response promise with event ID and timestamp
   */
  logEvent: (eventType, eventData = {}) => {
    return apiService.post('/events', { eventType, eventData });
  }
};

export default eventsService;
