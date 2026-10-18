/**
 * Role-based authentication utilities
 * Provides functions to check user roles and permissions
 */

import { getUserInfo } from './auth';

/**
 * Get the current user's role from cookies
 * @returns {string|null} User role or null if not authenticated
 */
export const getUserRole = () => {
  const userInfo = getUserInfo();
  return userInfo?.role || null;
};

/**
 * Check if user is authenticated (any role)
 * @returns {boolean} True if authenticated
 */
export const isAuthenticated = () => {
  return !!getUserRole();
};

/**
 * Check if user has admin role
 * @returns {boolean} True if user is admin
 */
export const isAdmin = () => {
  return getUserRole() === 'admin';
};

/**
 * Check if user has educator role
 * @returns {boolean} True if user is educator
 */
export const isEducator = () => {
  return getUserRole() === 'educator';
};

/**
 * Check if user has student role
 * @returns {boolean} True if user is student
 */
export const isStudent = () => {
  return getUserRole() === 'student';
};

/**
 * Check if user has doctor role
 * @returns {boolean} True if user is doctor
 */
export const isDoctor = () => {
  return getUserRole() === 'doctor';
};

/**
 * Check if user can access educator panel
 * Only educators can access educator panel
 * @returns {boolean} True if user can access educator panel
 */
export const canAccessEducatorPanel = () => {
  return isEducator();
};

/**
 * Check if user can access admin panel
 * Only admins can access admin panel
 * @returns {boolean} True if user can access admin panel
 */
export const canAccessAdminPanel = () => {
  return isAdmin();
};

/**
 * Check if user can access normal user site
 * All authenticated users can access normal site
 * @returns {boolean} True if user can access normal site
 */
export const canAccessNormalSite = () => {
  return isAuthenticated();
};

/**
 * Get redirect path based on user role
 * Used for post-login navigation
 * @param {string} role User role
 * @returns {string} Redirect path
 */
export const getRoleRedirectPath = (role) => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'educator':
      return '/educator';
    case 'doctor':
    case 'student':
    default:
      return '/';
  }
};

/**
 * Check if user has permission to perform educator actions
 * @returns {boolean} True if user can perform educator actions
 */
export const canPerformEducatorActions = () => {
  return isEducator();
};

/**
 * Check if user has permission to perform admin actions
 * @returns {boolean} True if user can perform admin actions
 */
export const canPerformAdminActions = () => {
  return isAdmin();
};

/**
 * Check if user can switch to educator panel
 * Only educators can switch to educator panel
 * @returns {boolean} True if user can switch to educator panel
 */
export const canSwitchToEducatorPanel = () => {
  return isEducator();
};

/**
 * Check if user can switch to admin panel
 * Only admins can switch to admin panel
 * @returns {boolean} True if user can switch to admin panel
 */
export const canSwitchToAdminPanel = () => {
  return isAdmin();
};

/**
 * Get panel switch options for navbar
 * Returns array of available panel switch options
 * @returns {Array} Array of panel switch options
 */
export const getPanelSwitchOptions = () => {
  const role = getUserRole();
  const options = [];
  
  // Get current path to avoid showing current panel as option
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isInEducatorPanel = currentPath.startsWith('/educator');
  const isInAdminPanel = currentPath.startsWith('/admin');
  
  // Educator panel - only for educators and not when already in educator panel
  if (role === 'educator' && !isInEducatorPanel) {
    options.push({
      label: 'Educator Panel',
      path: '/educator',
      role: 'educator'
    });
  }
  
  // Admin panel - only for admins and not when already in admin panel
  if (role === 'admin' && !isInAdminPanel) {
    options.push({
      label: 'Admin Panel',
      path: '/admin',
      role: 'admin'
    });
  }
  
  // Normal site - only show if user has access to other panels and not already on normal site
  const isOnNormalSite = !currentPath.startsWith('/educator') && !currentPath.startsWith('/admin');
  if (options.length > 0 && !isOnNormalSite) {
    options.unshift({
      label: 'Normal Site',
      path: '/',
      role: 'user'
    });
  }
  
  return options;
};

/**
 * Check if current route matches user role
 * Used to prevent unauthorized access
 * @param {string} path Current path
 * @returns {boolean} True if path is allowed for current role
 */
export const isRouteAllowedForRole = (path) => {
  const role = getUserRole();
  
  // Public routes - always allowed
  if (path === '/login' || path === '/register' || path === '/') {
    return true;
  }
  
  // Admin routes - only for admins
  if (path.startsWith('/admin/')) {
    return role === 'admin';
  }
  
  // Educator routes - only for educators
  if (path.startsWith('/educator/')) {
    return role === 'educator';
  }
  
  // All other routes - require authentication
  return isAuthenticated();
};

/**
 * Role-based authorization hook for React components
 * @returns {Object} Authorization methods and user role info
 */
export const useRoleAuth = () => {
  const role = getUserRole();
  
  return {
    role,
    isAuthenticated: isAuthenticated(),
    isAdmin: isAdmin(),
    isEducator: isEducator(),
    isStudent: isStudent(),
    isDoctor: isDoctor(),
    canAccessEducatorPanel: canAccessEducatorPanel(),
    canAccessAdminPanel: canAccessAdminPanel(),
    canSwitchToEducatorPanel: canSwitchToEducatorPanel(),
    canSwitchToAdminPanel: canSwitchToAdminPanel(),
    panelOptions: getPanelSwitchOptions(),
    isRouteAllowed: (path) => isRouteAllowedForRole(path)
  };
};