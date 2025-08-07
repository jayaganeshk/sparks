/**
 * Feedback service for interacting with the feedback API
 */
import apiService from './api';

/**
 * Feedback service with methods for submitting and retrieving feedback
 */
export const feedbackService = {
  /**
   * Submit new feedback
   * @param {Object} feedbackData - Feedback data object
   * @param {string} feedbackData.type - Feedback type ('BUG', 'FEATURE', 'GENERAL')
   * @param {string} feedbackData.message - Feedback message
   * @param {number} [feedbackData.rating] - Optional rating (1-5)
   * @param {string} [feedbackData.email] - Optional email for follow-up
   * @param {Object} [feedbackData.metadata] - Optional metadata object
   * @returns {Promise<Object>} - Response object with feedbackId
   */
  submitFeedback: (feedbackData) => {
    return apiService.post('/feedback', feedbackData);
  },

  /**
   * Get all feedback items (admin only)
   * @param {string} [lastEvaluatedKey] - Optional pagination key
   * @returns {Promise<Object>} - Response with feedback items and pagination key
   */
  getAllFeedback: (lastEvaluatedKey = null) => {
    const endpoint = lastEvaluatedKey 
      ? `/feedback?lastEvaluatedKey=${lastEvaluatedKey}`
      : '/feedback';
    return apiService.get(endpoint);
  },

  /**
   * Get a specific feedback item by ID
   * @param {string} feedbackId - Feedback ID
   * @returns {Promise<Object>} - Feedback item
   */
  getFeedbackById: (feedbackId) => {
    return apiService.get(`/feedback/${feedbackId}`);
  }
};

export default feedbackService;
