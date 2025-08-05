// Utilities
import { defineStore } from 'pinia';
import { authService } from '@/services';

export const useAppStore = defineStore('app', {
  state: () => ({
    showFullView: false,
    isLiveStreamEnabled: false,
    user: null,
    userName: null,
    userEmail: null,
    isAuthenticated: false,
    livestreamData: null,
    lastPhotoUploadedAt: null,
  }),

  actions: {
    /**
     * Notify that a photo has been uploaded
     */
    notifyPhotoUploaded() {
      this.lastPhotoUploadedAt = new Date().getTime();
    },

    /**
     * Set the showFullView state
     * @param {boolean} value - Whether to show the full view (no app bar or bottom navigation)
     */
    setShowFullView(value) {
      this.showFullView = value
    },

    /**
     * Check if a livestream is available
     * This would normally call the API to check for active livestreams
     */
    async checkIfLiveStreamAvailable() {
      try {
        // In a real implementation, this would call the API
        // For now, we'll just simulate a response
        // const response = await fetch('/api/livestream')
        // const data = await response.json()
        // this.isLiveStreamEnabled = data.active
        // this.livestreamData = data

        // Simulate a response for development
        this.isLiveStreamEnabled = false
        this.livestreamData = null

        return this.isLiveStreamEnabled
      } catch (error) {
        console.error('Error checking for livestream:', error)
        this.isLiveStreamEnabled = false
        this.livestreamData = null
        return false
      }
    },

    /**
     * Attempt to log in the user
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @returns {Promise<boolean>} - True if login is successful
     */
    async login(email, password) {
      try {
        await authService.signIn(email, password);
        const user = await authService.getCurrentUser();
        this.user = user;
        this.isAuthenticated = true;
        return true;
      } catch (error) {
        this.user = null;
        this.isAuthenticated = false;
        throw error;
      }
    },

    /**
     * Log out the current user
     */
    async logout() {
      try {
        await authService.signOut();
        this.user = null;
        this.isAuthenticated = false;
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },

    /**
     * Check the current user's session on startup
     */
    async checkSession() {
      try {
        // First check if the user is authenticated with a valid token
        // This will validate with Cognito if the user still exists
        const isAuthenticated = await authService.isAuthenticated();
        
        if (isAuthenticated) {
          // If authenticated, get the user details
          const user = await authService.getCurrentUser();
          this.user = user;
          this.isAuthenticated = true;

          console.log("User authenticated:", user);

          // Get user attributes with a forced token refresh
          // This ensures we're getting fresh data from Cognito
          try {
            const attributes = await authService.getUserAttributes();
            console.log("User attributes:", attributes);

            // Extract email and preferred username from Cognito user
            if (attributes) {
              this.userEmail = attributes.email;
              this.userName = attributes.name;
              console.log('User data loaded:', { email: this.userEmail, name: this.userName });
            }
          } catch (attrError) {
            console.error('Error fetching user attributes:', attrError);
            // If we can't get attributes, the user might have been deleted
            // Force a logout to be safe
            await this.logout();
            return;
          }
        } else {
          // User is not authenticated or has been deleted
          console.log('User not authenticated or no longer exists in Cognito');
          this.user = null;
          this.userEmail = null;
          this.userName = null;
          this.isAuthenticated = false;
          
          // Clear any remaining session data
          await authService.signOut();
        }
      } catch (error) {
        console.error('Error checking session:', error);
        this.user = null;
        this.userEmail = null;
        this.userName = null;
        this.isAuthenticated = false;
      }
    }
  },
})
