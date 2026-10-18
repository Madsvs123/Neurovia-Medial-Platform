/**
 * Auth Context
 * Provides authentication state and role information throughout the app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentUser, 
  getCurrentUserRole, 
  isAuthenticated as checkIsAuthenticated,
  logout as performLogout,
  getPostLoginRedirect
} from '../services/authService';

// Create Auth Context
const AuthContext = createContext();

/**
 * Auth Provider Component
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components
 * @returns {React.ReactNode} Auth provider
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Check auth state on initial load
  useEffect(() => {
    const checkAuthState = () => {
      try {
        const currentUser = getCurrentUser();
        const currentRole = getCurrentUserRole();
        
        if (currentUser && currentRole) {
          setUser(currentUser);
          setRole(currentRole);
        }
      } catch (err) {
        console.error('Auth state check error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthState();
  }, []);
  
  // Login handler
  const login = (userData, token) => {
    setUser(userData);
    setRole(userData.role);
    setError(null);
    
    // Redirect based on role
    const redirectPath = getPostLoginRedirect();
    navigate(redirectPath);
  };
  
  // Logout handler
  const logout = () => {
    performLogout();
    setUser(null);
    setRole(null);
    setError(null);
    navigate('/login');
  };
  
  // Check if user has specific role
  const hasRole = (requiredRole) => {
    return role === requiredRole;
  };
  
  // Check permissions for educator panel
  const canAccessEducatorPanel = () => {
    return role === 'educator';
  };
  
  // Check permissions for admin panel
  const canAccessAdminPanel = () => {
    return role === 'admin';
  };
  
  // Get panel switch options
  const getPanelOptions = () => {
    const options = [];
    
    // Get current path to avoid showing current panel as option
    const currentPath = window.location.pathname;
    const isInEducatorPanel = currentPath.startsWith('/educator');
    const isInAdminPanel = currentPath.startsWith('/admin');
    
    // Educator panel - only for educators and not when already in educator panel
    if (role === 'educator' && !isInEducatorPanel) {
      options.push({ label: 'Educator Panel', path: '/educator', role: 'educator' });
    }
    
    // Admin panel - only for admins and not when already in admin panel
    if (role === 'admin' && !isInAdminPanel) {
      options.push({ label: 'Admin Panel', path: '/admin', role: 'admin' });
    }
    
    // Normal site - only show if user has access to other panels and not already on normal site
    const isOnNormalSite = !currentPath.startsWith('/educator') && !currentPath.startsWith('/admin');
    if (options.length > 0 && !isOnNormalSite) {
      options.unshift({ label: 'Normal Site', path: '/', role: 'user' });
    }
    
    return options;
  };
  
  // Context value
  const contextValue = {
    user,
    role,
    isAuthenticated: checkIsAuthenticated(),
    loading,
    error,
    login,
    logout,
    hasRole,
    canAccessEducatorPanel,
    canAccessAdminPanel,
    getPanelOptions,
    setError
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use Auth Context
 * @returns {Object} Auth context values
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook to check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export const useIsAuthenticated = () => {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated;
};

/**
 * Hook to get current user role
 * @returns {string|null} Current user role
 */
export const useUserRole = () => {
  const { role } = useAuthContext();
  return role;
};

/**
 * Hook to check if user can access educator panel
 * @returns {boolean} True if can access educator panel
 */
export const useCanAccessEducatorPanel = () => {
  const { canAccessEducatorPanel } = useAuthContext();
  return canAccessEducatorPanel();
};

/**
 * Hook to check if user can access admin panel
 * @returns {boolean} True if can access admin panel
 */
export const useCanAccessAdminPanel = () => {
  const { canAccessAdminPanel } = useAuthContext();
  return canAccessAdminPanel();
};

/**
 * Hook to get panel switch options
 * @returns {Array} Panel switch options
 */
export const usePanelOptions = () => {
  const { getPanelOptions } = useAuthContext();
  return getPanelOptions();
};

export default AuthContext;