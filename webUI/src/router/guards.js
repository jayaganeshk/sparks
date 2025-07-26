/**
 * Router guards for authentication
 */
import { authService } from '@/services';

/**
 * Authentication guard to protect routes
 * @param {Object} to - Route to navigate to
 * @param {Object} from - Route navigating from
 * @param {Function} next - Function to resolve the navigation
 */
export async function authGuard(to, from, next) {
  // Check if the route requires authentication
  if (to.meta.requiresAuth) {
    try {
      // Check if the user is authenticated
      const isAuthenticated = await authService.isAuthenticated();

      if (isAuthenticated) {
        // User is authenticated, proceed to the route
        next();
      } else {
        // User is not authenticated, redirect to login
        next({
          path: '/auth/login',
          query: { redirect: to.fullPath }
        });
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      // On error, redirect to login
      next({
        path: '/auth/login',
        query: { redirect: to.fullPath }
      });
    }
  } else {
    // Route doesn't require authentication, proceed
    next();
  }
}

/**
 * Guest guard to prevent authenticated users from accessing guest-only routes
 * @param {Object} to - Route to navigate to
 * @param {Object} from - Route navigating from
 * @param {Function} next - Function to resolve the navigation
 */
export async function guestGuard(to, from, next) {
  // Check if the route is guest-only
  if (to.meta.guestOnly) {
    try {
      // Check if the user is authenticated
      const isAuthenticated = await authService.isAuthenticated();

      if (isAuthenticated) {
        // User is authenticated, redirect to home
        next({ path: '/' });
      } else {
        // User is not authenticated, proceed to the route
        next();
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      // On error, proceed to the route
      next();
    }
  } else {
    // Route isn't guest-only, proceed
    next();
  }
}
