/**
 * Protected Route Component
 * Handles role-based route protection and redirection
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUserRole, isAuthenticated } from '../services/authService';

/**
 * ProtectedRoute component
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components
 * @param {string|string[]} props.allowedRoles Allowed roles for this route
 * @param {string} props.redirectTo Redirect path if not authorized
 * @returns {React.ReactNode} Route component or redirect
 */
const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login'
}) => {
  const location = useLocation();
  const userRole = getCurrentUserRole();
  const isAuth = isAuthenticated();
  
  // Convert single role to array for consistent handling
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  // Check if user is authenticated
  if (!isAuth) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  
  // Check if route requires specific roles
  if (rolesArray.length > 0 && !rolesArray.includes(userRole)) {
    // Redirect to home if authenticated but not authorized
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  // User is authorized
  return children;
};

/**
 * EducatorRoute - Only educators can access
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components
 * @returns {React.ReactNode} Route component or redirect
 */
export const EducatorRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['educator']} redirectTo="/login">
      {children}
    </ProtectedRoute>
  );
};

/**
 * AdminRoute - Only admins can access
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components
 * @returns {React.ReactNode} Route component or redirect
 */
export const AdminRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['admin']} redirectTo="/login">
      {children}
    </ProtectedRoute>
  );
};

/**
 * AuthRoute - Any authenticated user can access
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components
 * @returns {React.ReactNode} Route component or redirect
 */
export const AuthRoute = ({ children }) => {
  return (
    <ProtectedRoute redirectTo="/login">
      {children}
    </ProtectedRoute>
  );
};

/**
 * PublicRoute - Only unauthenticated users can access
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components
 * @returns {React.ReactNode} Route component or redirect
 */
export const PublicRoute = ({ children }) => {
  const location = useLocation();
  const isAuth = isAuthenticated();
  
  // If user is authenticated, redirect to home
  if (isAuth) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  // User is not authenticated, allow access
  return children;
};

export default ProtectedRoute;