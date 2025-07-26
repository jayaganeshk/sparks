/**
 * Base API service for interacting with the Express API
 */

// Import Auth from Amplify
import { fetchAuthSession } from '@aws-amplify/auth';

// Default API configuration
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

/**
 * Get the current authentication token from Amplify Auth
 * @returns {Promise<string|null>} - JWT token or null if not authenticated
 */
async function getAuthToken() {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  } catch (error) {
    console.log('Not authenticated', error);
    return null;
  }
}

/**
 * Create a fetch request with the given options
 * @param {string} endpoint - The API endpoint
 * @param {Object} options - Request options
 * @returns {Promise} - Fetch promise
 */
async function fetchRequest(endpoint, options = {}) {
  const { headers, body, method = 'GET', ...restOptions } = options;

  // Merge default headers with provided headers
  const mergedHeaders = {
    ...API_CONFIG.headers,
    ...headers
  };

  // Get auth token from Amplify Auth
  const token = await getAuthToken();
  if (token) {
    mergedHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Construct the full URL
  const url = `${API_CONFIG.baseURL}${endpoint}`;

  // Create request options
  const requestOptions = {
    method,
    headers: mergedHeaders,
    ...restOptions
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    // Set up timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    requestOptions.signal = controller.signal;

    // Make the request
    const response = await fetch(url, requestOptions);

    // Clear timeout
    clearTimeout(timeoutId);

    // Handle response
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        // Clear auth token and redirect to login
        localStorage.removeItem('authToken');
        window.location.href = '/auth/login';
        throw new Error('Authentication failed');
      }

      // Try to parse error response
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: response.statusText };
      }

      throw new Error(errorData.error || 'API request failed');
    }

    // Check if response is empty
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    // Handle timeout
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * API service with methods for common HTTP verbs
 */
export const apiService = {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} - Response promise
   */
  get: (endpoint, options = {}) => {
    return fetchRequest(endpoint, { ...options, method: 'GET' });
  },

  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise} - Response promise
   */
  post: (endpoint, data = {}, options = {}) => {
    return fetchRequest(endpoint, { ...options, body: data, method: 'POST' });
  },

  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise} - Response promise
   */
  put: (endpoint, data = {}, options = {}) => {
    return fetchRequest(endpoint, { ...options, body: data, method: 'PUT' });
  },

  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} - Response promise
   */
  delete: (endpoint, options = {}) => {
    return fetchRequest(endpoint, { ...options, method: 'DELETE' });
  }
};

export default apiService;
