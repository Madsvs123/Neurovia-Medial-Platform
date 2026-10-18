/**
 * Authentication Service
 * Handles all authentication and authorization logic
 */

import api from './api';
import {
  setUserToken, setUserInfo, removeUserToken, removeUserInfo,
  getUserToken, getUserInfo
} from '../utils/auth';

/**
 * Login user with email and password
 * @param {string} email User email
 * @param {string} password User password
 * @returns {Promise<Object>} Login result
 */
export const login = async (email, password) => {
  try {
    const response = await api.post('/users/login', { email, password });
    
    if (response.data.token) {
      setUserToken(response.data.token);
      setUserInfo(response.data.user);
    }
    
    return {
      success: true,
      user: response.data.user,
      token: response.data.token
    };
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed';
    throw new Error(message);
  }
};

/**
 * Register new user
 * @param {Object} userData User registration data
 * @returns {Promise<Object>} Registration result
 */
export const register = async (userData) => {
  try {
    const response = await api.post('/users/register', userData);
    
    if (response.data.token) {
      setUserToken(response.data.token);
      setUserInfo(response.data.user);
    }
    
    return {
      success: true,
      user: response.data.user,
      token: response.data.token
    };
  } catch (error) {
    const message = error.response?.data?.message || 'Registration failed';
    throw new Error(message);
  }
};

/**
 * Google authentication
 * @param {string} credential Google auth credential
 * @returns {Promise<Object>} Google auth result
 */
export const googleAuth = async (credential) => {
  try {
    const response = await api.post('/users/google-auth', { credential });
    
    if (response.data.token) {
      setUserToken(response.data.token);
      setUserInfo(response.data.user);
    }
    
    return {
      success: true,
      user: response.data.user,
      token: response.data.token
    };
  } catch (error) {
    const message = error.response?.data?.message || 'Google authentication failed';
    throw new Error(message);
  }
};

/**
 * Logout user
 */
export const logout = () => {
  removeUserToken();
  removeUserInfo();
};

/**
 * Get current user information
 * @returns {Object|null} User info or null if not authenticated
 */
export const getCurrentUser = () => {
  return getUserInfo();
};

/**
 * Get current user role
 * @returns {string|null} User role or null if not authenticated
 */
export const getCurrentUserRole = () => {
  const user = getUserInfo();
  return user?.role || null;
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export const isAuthenticated = () => {
  return !!getUserToken() && !!getUserInfo();
};

/**
 * Check if user has specific role
 * @param {string} role Role to check
 * @returns {boolean} True if user has the role
 */
export const hasRole = (role) => {
  return getCurrentUserRole() === role;
};

/**
 * Check if user can access educator panel
 * @returns {boolean} True if user can access educator panel
 */
export const canAccessEducatorPanel = () => {
  return hasRole('educator');
};

/**
 * Check if user can access admin panel
 * @returns {boolean} True if user can access admin panel
 */
export const canAccessAdminPanel = () => {
  return hasRole('admin');
};

/**
 * Get auth header for API requests
 * @returns {Object} Authorization header
 */
export const getAuthHeader = () => {
  const token = getUserToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Check if user has permission for route
 * @param {string} path Route path
 * @returns {boolean} True if user has permission
 */
export const hasRoutePermission = (path) => {
  const role = getCurrentUserRole();
  
  // Public routes
  if (path === '/' || path === '/login' || path === '/register') {
    return true;
  }
  
  // Admin routes
  if (path.startsWith('/admin/')) {
    return role === 'admin';
  }
  
  // Educator routes
  if (path.startsWith('/educator/')) {
    return role === 'educator';
  }
  
  // Protected routes - require authentication
  return isAuthenticated();
};

/**
 * Get redirect path after login based on user role
 * @returns {string} Redirect path
 */
export const getPostLoginRedirect = () => {
  const role = getCurrentUserRole();
  
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
 * Authentication service object
 */
export default {
  login,
  register,
  googleAuth,
  logout,
  getCurrentUser,
  getCurrentUserRole,
  isAuthenticated,
  hasRole,
  canAccessEducatorPanel,
  canAccessAdminPanel,
  getAuthHeader,
  hasRoutePermission,
  getPostLoginRedirect
};