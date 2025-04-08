/**
 * Authentication Service
 * Handles user authentication and session management
 */

const AuthService = {
  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      window.location.href = '/login';
      return false;
    }
    
    try {
      // Set user initials in the UI
      const userObj = JSON.parse(user);
      const userInitials = document.getElementById('user-initials');
      if (userInitials) {
        userInitials.textContent = userObj.username.substring(0, 2).toUpperCase();
      }
      return true;
    } catch (error) {
      console.error('Error parsing user data:', error);
      this.logout();
      return false;
    }
  },
  
  /**
   * Get current user data
   * @returns {Object|null} User data object or null if not authenticated
   */
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  /**
   * Get authentication token
   * @returns {string|null} Auth token or null if not authenticated
   */
  getToken() {
    return localStorage.getItem('token');
  },
  
  /**
   * Log out the current user
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};

export default AuthService;
