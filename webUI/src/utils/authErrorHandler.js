/**
 * Authentication error handler utility
 * Provides consistent error handling for authentication-related errors
 */

/**
 * Handle authentication errors
 * @param {Error} error - The error object
 * @returns {Object} - Formatted error with message and code
 */
export const handleAuthError = (error) => {
  const errorMessage = error?.message || 'Unknown authentication error';
  let formattedError = {
    message: 'An error occurred during authentication',
    code: 'unknown_error',
    originalError: error
  };

  // Handle specific error cases
  if (errorMessage.includes('User does not exist')) {
    formattedError = {
      message: 'Your account no longer exists. Please contact support if you believe this is an error.',
      code: 'user_deleted',
      originalError: error
    };
  } else if (errorMessage.includes('User is disabled')) {
    formattedError = {
      message: 'Your account has been disabled. Please contact support.',
      code: 'user_disabled',
      originalError: error
    };
  } else if (errorMessage.includes('Invalid session')) {
    formattedError = {
      message: 'Your session is no longer valid. Please sign in again.',
      code: 'invalid_session',
      originalError: error
    };
  } else if (errorMessage.includes('password')) {
    formattedError = {
      message: 'Incorrect username or password',
      code: 'invalid_credentials',
      originalError: error
    };
  } else if (errorMessage.includes('expired')) {
    formattedError = {
      message: 'Your session has expired. Please sign in again.',
      code: 'session_expired',
      originalError: error
    };
  }

  console.error('Authentication error:', formattedError);
  return formattedError;
};

/**
 * Display an authentication error notification
 * @param {Object} error - The formatted error object
 * @param {Function} notify - Notification function (if available)
 */
export const showAuthErrorNotification = (error, notify = null) => {
  const message = error?.message || 'Authentication error occurred';
  
  if (notify && typeof notify === 'function') {
    notify({
      title: 'Authentication Error',
      text: message,
      type: 'error',
      duration: 5000
    });
  } else {
    // Fallback to alert if no notification function is provided
    alert(`Authentication Error: ${message}`);
  }
};

export default {
  handleAuthError,
  showAuthErrorNotification
};
