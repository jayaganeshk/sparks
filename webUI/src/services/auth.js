/**
 * Authentication service for handling user authentication with AWS Amplify v6
 */
import {
  signIn,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  updateUserAttributes as amplifyUpdateUserAttributes,
  fetchUserAttributes
} from '@aws-amplify/auth';

export const authService = {
  /**
   * Sign in a user with email and password
   */
  signIn: async (email, password) => {
    try {
      const { isSignedIn } = await signIn({
        username: email,
        password,
        options: {
          authFlowType: 'USER_PASSWORD_AUTH'
        }
      });
      return isSignedIn;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  /**
   * Sign up a new user
   */
  signUp: async (email, password, attributes = {}) => {
    try {
      const { userId } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            ...attributes,
          },
        },
      });
      return userId;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  },

  /**
   * Confirm sign up with verification code
   */
  confirmSignUp: async (email, code) => {
    try {
      return await confirmSignUp({ username: email, confirmationCode: code });
    } catch (error) {
      console.error('Error confirming sign up:', error);
      throw error;
    }
  },

  /**
   * Resend verification code
   */
  resendSignUp: async (email) => {
    try {
      return await resendSignUpCode({ username: email });
    } catch (error) {
      console.error('Error resending code:', error);
      throw error;
    }
  },

  /**
   * Initiate forgot password flow
   */
  forgotPassword: async (email) => {
    try {
      return await resetPassword({ username: email });
    } catch (error) {
      console.error('Error initiating forgot password:', error);
      throw error;
    }
  },

  /**
   * Complete forgot password flow with new password
   */
  forgotPasswordSubmit: async (email, code, newPassword) => {
    try {
      return await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
    } catch (error) {
      console.error('Error submitting new password:', error);
      throw error;
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    try {
      return await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  /**
   * Get the current authenticated user
   */
  getCurrentUser: async () => {
    try {
      return await getCurrentUser();
    } catch (error) {
      return null;
    }
  },

  /**
   * Get the current session
   */
  getCurrentSession: async () => {
    try {
      return await fetchAuthSession();
    } catch (error) {
      return null;
    }
  },

  /**
   * Get the current user's JWT token
   */
  getJwtToken: async () => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if the user is authenticated
   */
  isAuthenticated: async () => {
    try {
      await getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get the current user's attributes
   */
  getUserAttributes: async () => {
    try {
      return await fetchUserAttributes();
    } catch (error) {
      return null;
    }
  },

  /**
   * Update user attributes
   */
  updateUserAttributes: async (attributes) => {
    try {
      return await amplifyUpdateUserAttributes({ userAttributes: attributes });
    } catch (error) {
      console.error('Error updating user attributes:', error);
      throw error;
    }
  },
};

export default authService;
