import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated } from '../utils/auth';

const PublicRoute = ({ children }) => {
  if (isAdminAuthenticated()) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
};

export default PublicRoute;
